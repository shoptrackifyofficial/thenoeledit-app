import { parseStory } from "@/lib/catalog/story";
import { adminRequest } from "@/lib/shopify/admin";
import { shopifyConfig } from "@/lib/shopify/config";
import { CATALOG_PATH, acquireLock, writeJsonFileAtomic } from "@/lib/catalog/storage";
import type { CatalogDocument, MediaRecord, ProductRecord, VariantRecord } from "@/lib/catalog/types";

/**
 * Shopify Admin API → data/catalog.json sync engine.
 *
 * Reads every product matching `SHOPIFY_PRODUCT_QUERY` (default: tagged
 * `noel-edit`, active) page by page, normalises it into a small read model and
 * writes it through `lib/catalog/storage.ts` (filesystem in dev, private
 * Vercel Blob in production). The site never queries Shopify per request —
 * pages are static/ISR off this document, which is why they are fast.
 *
 * The record is a read model only: Shopify re-prices every line when the
 * checkout cart is created, so nothing here is trusted for money.
 *
 * Run it with `npm run shopify:sync`, or POST /api/admin/sync. Webhooks can
 * call `syncCatalog()` later — they are intentionally not wired yet.
 */

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
  variants: { nodes: AdminVariantNode[] };
  media: { nodes: MediaNode[] };
  perks: { value: string } | null;
  offerEndsAt: { value: string } | null;
  giftFor: { value: string } | null;
  noelStory: { value: string } | null;
};

const SHOP_QUERY = `query { shop { name currencyCode } }`;

const PRODUCTS_QUERY = `
query Products($query: String!, $after: String) {
  products(first: 25, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle title vendor productType tags status createdAt updatedAt descriptionHtml
      seo { title description }
      options { name values }
      variants(first: 100) {
        nodes {
          id title sku price compareAtPrice availableForSale
          inventoryQuantity inventoryPolicy inventoryItem { tracked }
          selectedOptions { name value }
          image { url }
        }
      }
      media(first: 30) {
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

export type SyncResult = { products: number; syncedAt: string; query: string };

export async function syncCatalog(): Promise<SyncResult> {
  const cfg = shopifyConfig();
  if (!cfg.storeDomain) throw new Error("SHOPIFY_STORE_DOMAIN is not set");

  const shop = await adminRequest<{ shop: { name: string; currencyCode: string } }>(SHOP_QUERY);

  const products: Record<string, ProductRecord> = {};
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const data: {
      products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ProductNode[] };
    } = await adminRequest(PRODUCTS_QUERY, { query: cfg.productQuery, after });
    for (const node of data.products.nodes) products[node.handle] = toRecord(node);
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }

  const count = Object.keys(products).length;
  // Nothing tagged yet: keep whatever is live (or the demo seed) rather than
  // publishing an empty shop.
  if (count === 0) return { products: 0, syncedAt: new Date().toISOString(), query: cfg.productQuery };

  const doc: CatalogDocument = {
    version: 1,
    syncedAt: new Date().toISOString(),
    shop: { domain: cfg.storeDomain, name: shop.shop.name, currencyCode: shop.shop.currencyCode || "USD" },
    products,
  };

  const lock = await acquireLock();
  try {
    await writeJsonFileAtomic(CATALOG_PATH, doc);
  } finally {
    await lock.release();
  }
  return { products: count, syncedAt: doc.syncedAt, query: cfg.productQuery };
}
