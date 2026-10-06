import { parseStory } from "@/lib/catalog/story";
import { adminRequest } from "@/lib/shopify/admin";
import { shopifyConfig } from "@/lib/shopify/config";
import { readLiveCatalog } from "@/lib/catalog/live";
import { CATALOG_PATH, acquireLock, writeJsonFileAtomic } from "@/lib/catalog/storage";
import type { CatalogDocument, MediaRecord, ProductRecord, VariantRecord } from "@/lib/catalog/types";

/**
 * Shopify Admin API → data/catalog.json sync engine.
 *
 * Reads every product matching `SHOPIFY_PRODUCT_QUERY` (default: vendor
 * `TheNoelEdit`, active) page by page, normalises it into a small read model and
 * writes it through `lib/catalog/storage.ts` (filesystem in dev, private
 * Vercel Blob in production). The site never queries Shopify per request —
 * pages are static/ISR off this document, which is why they are fast.
 *
 * The record is a read model only: Shopify re-prices every line when the
 * checkout cart is created, so nothing here is trusted for money.
 *
 * Run it with `npm run shopify:sync`, or POST /api/admin/sync (full resync).
 * The products/* webhook calls `syncProduct()` instead: it re-reads just the
 * product that changed and merges it into the live document under the same lock
 * (like the reference store), so one edit never rewrites — or races — the rest.
 */

/** Shop currency when Shopify does not report one. */
const FALLBACK_CURRENCY = "USD";

type AdminVariantNode = {
  id: string;
  title: string;
  sku: string | null;
  price: string | null;
  compareAtPrice: string | null;
  availableForSale: boolean;
  inventoryQuantity: number | null;
  inventoryPolicy: string | null;
  inventoryItem: { tracked: boolean } | null;
  selectedOptions: { name: string; value: string }[];
  image: { url: string } | null;
};

type MediaNode =
  | { __typename: "MediaImage"; alt: string | null; image: { url: string; width: number | null; height: number | null } | null }
  | {
      __typename: "Video";
      alt: string | null;
      sources: { url: string; mimeType: string; width: number | null; height: number | null }[];
      preview: { image: { url: string; width: number; height: number } | null } | null;
    }
  | { __typename: string; alt?: string | null };

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  descriptionHtml: string;
  seo: { title: string | null; description: string | null } | null;
  options: { name: string; values: string[] }[];
  variants: { pageInfo: { hasNextPage: boolean }; nodes: AdminVariantNode[] };
  media: { pageInfo: { hasNextPage: boolean }; nodes: MediaNode[] };
  perks: { value: string } | null;
  offerEndsAt: { value: string } | null;
  giftFor: { value: string } | null;
  noelStory: { value: string } | null;
};

const SHOP_QUERY = `query { shop { name currencyCode } }`;

/**
 * Products per request. Each product pulls up to 100 variants + 30 media, so
 * pages stay small to remain under Shopify's per-query cost limit; any number of
 * products is read by following the cursor page after page.
 */
const PAGE_SIZE = 25;
/** Safety net against a cursor that never ends (PAGE_SIZE × this = 5,000 products). */
const MAX_PAGES = 200;
const VARIANT_LIMIT = 100;
const MEDIA_LIMIT = 30;

const PRODUCTS_QUERY = `
query Products($query: String!, $after: String, $first: Int!) {
  products(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle title vendor productType tags status createdAt updatedAt descriptionHtml
      seo { title description }
      options { name values }
      variants(first: ${VARIANT_LIMIT}) {
        pageInfo { hasNextPage }
        nodes {
          id title sku price compareAtPrice availableForSale
          inventoryQuantity inventoryPolicy inventoryItem { tracked }
          selectedOptions { name value }
          image { url }
        }
      }
      media(first: ${MEDIA_LIMIT}) {
        pageInfo { hasNextPage }
        nodes {
          __typename
          alt
          ... on MediaImage { image { url width height } }
          ... on Video {
            sources { url mimeType width height }
            preview { image { url width height } }
          }
        }
      }
      perks: metafield(namespace: "custom", key: "perks") { value }
      offerEndsAt: metafield(namespace: "custom", key: "sale_ends_at") { value }
      giftFor: metafield(namespace: "custom", key: "gift_for") { value }
      noelStory: metafield(namespace: "custom", key: "noel_story") { value }
    }
  }
}`;

const bareUrl = (url: string) => url.split("?")[0] ?? url;

function normalizeVariants(nodes: AdminVariantNode[]): VariantRecord[] {
  return nodes
    .filter((v) => v.price != null)
    .map((v) => {
      const price = Number(v.price);
      const compare = v.compareAtPrice != null ? Number(v.compareAtPrice) : null;
      return {
        id: v.id,
        title: v.title,
        sku: v.sku || null,
        price,
        compareAtPrice: compare != null && compare > price ? compare : null,
        availableForSale: v.availableForSale,
        // Only real, enforced stock counts: tracked, and not allowed to oversell.
        stock: v.inventoryItem?.tracked && v.inventoryPolicy === "DENY" && v.inventoryQuantity != null ? Math.max(0, v.inventoryQuantity) : null,
        options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
        image: v.image?.url ?? null,
      };
    });
}

function normalizeMedia(nodes: MediaNode[], variants: VariantRecord[]): MediaRecord[] {
  const variantByImage = new Map(
    variants.filter((v) => v.image).map((v) => [bareUrl(v.image!), v.id] as const),
  );
  const items: MediaRecord[] = [];
  for (const node of nodes) {
    if (node.__typename === "MediaImage" && "image" in node && node.image?.url) {
      items.push({
        type: "image",
        url: node.image.url,
        width: node.image.width ?? null,
        height: node.image.height ?? null,
        alt: node.alt?.trim() || null,
        variantId: variantByImage.get(bareUrl(node.image.url)) ?? null,
      });
    } else if (node.__typename === "Video" && "sources" in node) {
      // A plain <video> plays the mp4 renditions; HLS would need a player.
      const mp4 = node.sources
        .filter((s) => s.mimeType === "video/mp4")
        .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      if (mp4.length === 0) continue;
      items.push({
        type: "video",
        alt: node.alt?.trim() || null,
        poster: node.preview?.image?.url ?? "",
        width: node.preview?.image?.width ?? null,
        height: node.preview?.image?.height ?? null,
        sources: mp4.map((s) => ({ src: s.url, type: s.mimeType, width: s.width ?? null })),
      });
    }
  }
  return items;
}

/** `list.single_line_text_field` (JSON array) or a plain multi-line text field. */
function normalizePerks(field: { value: string } | null): string[] {
  const raw = field?.value?.trim();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (Array.isArray(list)) return list.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  } catch {
    /* plain text — one perk per line */
  }
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function futureIso(field: { value: string } | null): string | null {
  const time = Date.parse(field?.value?.trim() ?? "");
  return Number.isNaN(time) || time <= Date.now() ? null : new Date(time).toISOString();
}

function toRecord(p: ProductNode): ProductRecord {
  if (p.variants.pageInfo.hasNextPage) console.warn(`[sync] ${p.handle}: more than ${VARIANT_LIMIT} variants, the rest are not synced`);
  if (p.media.pageInfo.hasNextPage) console.warn(`[sync] ${p.handle}: more than ${MEDIA_LIMIT} media, the rest are not synced`);
  const variants = normalizeVariants(p.variants.nodes);
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    productType: p.productType || null,
    tags: p.tags,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    descriptionHtml: p.descriptionHtml ?? "",
    seo: { title: p.seo?.title ?? null, description: p.seo?.description ?? null },
    options: p.options.map((o) => ({ name: o.name, values: o.values })),
    availableForSale: variants.some((v) => v.availableForSale),
    variants,
    media: normalizeMedia(p.media.nodes, variants),
    perks: normalizePerks(p.perks),
    offerEndsAt: futureIso(p.offerEndsAt),
    giftFor: p.giftFor?.value?.trim() || null,
    story: parseStory(p.noelStory?.value),
  };
}

/** Same shop and products. `syncedAt` alone never counts as a change. */
function sameCatalog(a: CatalogDocument, b: CatalogDocument): boolean {
  return (
    a.shop?.domain === b.shop.domain &&
    a.shop?.name === b.shop.name &&
    a.shop?.currencyCode === b.shop.currencyCode &&
    JSON.stringify(a.products) === JSON.stringify(b.products)
  );
}

/** `changed: false` means Shopify already matches the live catalog, so nothing was written. */
export type SyncResult = { products: number; syncedAt: string; query: string; changed: boolean };

export async function syncCatalog(): Promise<SyncResult> {
  const cfg = shopifyConfig();
  if (!cfg.storeDomain) throw new Error("SHOPIFY_STORE_DOMAIN is not set");

  const shop = await adminRequest<{ shop: { name: string; currencyCode: string } }>(SHOP_QUERY);

  const products: Record<string, ProductRecord> = {};
  let after: string | null = null;
  let done = false;
  for (let page = 0; page < MAX_PAGES && !done; page++) {
    // Extra retries: a big shop drains Shopify's query-cost bucket between pages (THROTTLED).
    const data: {
      products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ProductNode[] };
    } = await adminRequest(PRODUCTS_QUERY, { query: cfg.productQuery, after, first: PAGE_SIZE }, { retries: 6 });
    for (const node of data.products.nodes) products[node.handle] = toRecord(node);
    done = !data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor;
  }
  // A truncated list would replace the live catalog and silently delist products — fail instead.
  if (!done) throw new Error(`Catalog sync stopped after ${MAX_PAGES} pages; raise MAX_PAGES`);

  const count = Object.keys(products).length;
  // No matching vendor products yet: keep whatever is live (or the demo seed) rather than
  // publishing an empty shop.
  if (count === 0) return { products: 0, syncedAt: new Date().toISOString(), query: cfg.productQuery, changed: false };

  const doc: CatalogDocument = {
    version: 1,
    syncedAt: new Date().toISOString(),
    shop: { domain: cfg.storeDomain, name: shop.shop.name, currencyCode: shop.shop.currencyCode || FALLBACK_CURRENCY },
    products,
  };

  const lock = await acquireLock();
  try {
    // Write only when Shopify differs from what is live: no Blob churn, no needless diff in the committed file.
    const live = await readLiveCatalog();
    if (sameCatalog(live, doc)) {
      return { products: count, syncedAt: live.syncedAt, query: cfg.productQuery, changed: false };
    }
    await writeJsonFileAtomic(CATALOG_PATH, doc);
  } finally {
    await lock.release();
  }
  return { products: count, syncedAt: doc.syncedAt, query: cfg.productQuery, changed: true };
}

export type ProductSyncResult = {
  /** "synced": re-read from Shopify; "removed": no longer ours (deleted, other vendor, archived); "full": no live document yet, so everything was synced. */
  action: "synced" | "removed" | "full";
  handle: string | null;
  products: number;
  syncedAt: string;
  /** false when the product already matched the live catalog, so nothing was written. */
  changed: boolean;
};

/**
 * Webhook entry point: re-syncs one product into the live catalog document.
 *
 * The base is the newer of the Blob copy and the catalog bundled with the build
 * (readLiveCatalog), so a webhook never merges onto a stale copy. Blob is written
 * only when the product really changed, and the caller purges the page cache then.
 *
 * `id` (the numeric Shopify id from the webhook payload) identifies the product,
 * so a renamed handle or a delete (which carries only an id) still finds its old
 * entry. Read, fetch and write all happen inside the storage lock, so two
 * webhooks can't overwrite each other with stale data.
 */
export async function syncProduct(ref: { id: number | string; handle?: string | null; deleted?: boolean }): Promise<ProductSyncResult> {
  const cfg = shopifyConfig();
  if (!cfg.storeDomain) throw new Error("SHOPIFY_STORE_DOMAIN is not set");
  const idSuffix = `/${ref.id}`;

  const lock = await acquireLock();
  let result: ProductSyncResult | null = null;
  try {
    const existing = await readLiveCatalog();
    if (Object.keys(existing.products).length > 0) {
      let products = { ...existing.products };
      // Drop the old entry first: covers a renamed handle, an untag/archive and a delete.
      for (const [key, p] of Object.entries(products)) if (p.id.endsWith(idSuffix)) delete products[key];

      let fresh: ProductRecord | null = null;
      if (!ref.deleted && ref.handle) {
        // The full sync's filter, narrowed to this handle: a product that stopped matching returns nothing.
        const data: { products: { nodes: ProductNode[] } } = await adminRequest(PRODUCTS_QUERY, {
          query: `(${cfg.productQuery}) AND handle:${ref.handle.replace(/[^A-Za-z0-9_-]/g, "")}`,
          after: null,
          first: 1,
        });
        const node = data.products.nodes.find((n) => n.id.endsWith(idSuffix));
        if (node) fresh = toRecord(node);
      }
      if (fresh) products[fresh.handle] = fresh;
      // Same order as the full sync (newest first), so an edit never reshuffles the shop.
      products = Object.fromEntries(Object.entries(products).sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt)));

      const shop = await adminRequest<{ shop: { name: string; currencyCode: string } }>(SHOP_QUERY);
      const doc: CatalogDocument = {
        ...existing,
        version: 1,
        syncedAt: new Date().toISOString(),
        shop: {
          domain: cfg.storeDomain,
          name: shop.shop.name,
          currencyCode: shop.shop.currencyCode || existing.shop?.currencyCode || FALLBACK_CURRENCY,
        },
        products,
      };
      delete doc.demo;
      // Webhooks fire for every edit (stock, tags, unrelated fields): write only if the catalog differs.
      const changed = !sameCatalog(existing, doc);
      if (changed) await writeJsonFileAtomic(CATALOG_PATH, doc);
      result = {
        action: fresh ? "synced" : "removed",
        handle: fresh?.handle ?? ref.handle ?? null,
        products: Object.keys(products).length,
        syncedAt: changed ? doc.syncedAt : existing.syncedAt,
        changed,
      };
    }
  } finally {
    await lock.release();
  }
  if (result) return result;

  // Nothing live to merge into yet: do the full sync (it takes the lock itself, so ours is released first).
  const full = await syncCatalog();
  return { action: "full", handle: ref.handle ?? null, products: full.products, syncedAt: full.syncedAt, changed: full.changed };
}
