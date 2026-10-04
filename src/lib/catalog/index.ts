import "server-only";

import { unstable_cache } from "next/cache";

import seed from "../../../data/demo-catalog.json";
import { CATALOG_PATH, readJsonFile } from "@/lib/catalog/storage";
import type { CatalogDocument, ProductRecord } from "@/lib/catalog/types";
import { categories, FALLBACK_CATEGORY, type CategoryContent } from "@/content/categories";
import { originalPrice } from "@/lib/commerce/tiers";
import { slugify } from "@/lib/utils";

/**
 * Server-side catalog reads.
 *
 * Source order: the live synced document (private Vercel Blob in production,
 * data/catalog.json on disk in dev — written by `npm run shopify:sync` or
 * POST /api/admin/sync) → the bundled demo seed (data/demo-catalog.json). Wrapped in `unstable_cache`
 * under the `catalog` tag so every page stays static/ISR, and one
 * `revalidateTag("catalog")` refreshes home, shop, PDPs and the sitemap.
 */

export const CATALOG_TAG = "catalog";
const seedDoc = seed as unknown as CatalogDocument;

const readCatalog = unstable_cache(
  async (): Promise<CatalogDocument> => {
    try {
      const live = await readJsonFile<CatalogDocument>(CATALOG_PATH);
      if (live?.products && Object.keys(live.products).length > 0) return live;
    } catch (error) {
      console.error(
        "[catalog] live read failed, serving the seed:",
        error instanceof Error ? error.message : error,
      );
    }
    return seedDoc;
  },
  ["noel-catalog-v1"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/**
 * Products with a bundle offer (story.bundle.discounts) show their strike-through
 * "original" worked back from the real price (price ÷ (1 − pct)), using the
 * percentage for one unit. A compare-at price set in Shopify is kept as is.
 */
const priced = new WeakMap<CatalogDocument, CatalogDocument>();
function withOfferPrices(doc: CatalogDocument): CatalogDocument {
  const cached = priced.get(doc);
  if (cached) return cached;
  const products: CatalogDocument["products"] = {};
  for (const [handle, p] of Object.entries(doc.products)) {
    const pct = p.story?.bundle?.discounts[0] ?? 0;
    products[handle] =
      pct > 0
        ? {
            ...p,
            variants: p.variants.map((v) =>
              v.compareAtPrice != null && v.compareAtPrice > v.price ? v : { ...v, compareAtPrice: originalPrice(v.price, pct) },
            ),
          }
        : p;
  }
  const out = { ...doc, products };
  priced.set(doc, out);
  return out;
}

export async function getCatalog(): Promise<CatalogDocument> {
  return withOfferPrices(await readCatalog());
}

export async function isDemoCatalog(): Promise<boolean> {
  return Boolean((await getCatalog()).demo);
}

export async function storeCurrency(): Promise<string> {
  return (await getCatalog()).shop.currencyCode || "USD";
}

/** Every active product, in the order Shopify returned them. */
export async function getProducts(): Promise<ProductRecord[]> {
  const catalog = await getCatalog();
  return Object.values(catalog.products).filter((p) => p.status === "ACTIVE");
}

export async function getProductByHandle(handle: string): Promise<ProductRecord | null> {
  const record = (await getCatalog()).products[handle];
  return record && record.status === "ACTIVE" ? record : null;
}

/* ── Categories ─────────────────────────────────────────────────────────── */

export type CategoryInfo = Omit<CategoryContent, "productTypes"> & { count: number };

/** Which category a product belongs to — see content/categories.ts for the rules. */
export function categorySlugOf(record: ProductRecord): string {
  const tagged = record.tags
    .map((t) => t.trim().toLowerCase())
    .find((t) => t.startsWith("category:"));
  if (tagged) {
    const slug = slugify(tagged.slice("category:".length));
    if (slug) return slug;
  }
  const type = record.productType?.trim().toLowerCase();
  if (type) {
    const mapped = categories.find((c) => c.productTypes.includes(type) || c.slug === slugify(type));
    return mapped?.slug ?? slugify(type);
  }
  return FALLBACK_CATEGORY;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Categories with at least one live product, editorial ones first in their set order. */
export async function getCategories(): Promise<CategoryInfo[]> {
  const products = await getProducts();
  const counts = new Map<string, { count: number; image: string | null }>();
  for (const p of products) {
    const slug = categorySlugOf(p);
    const entry = counts.get(slug) ?? { count: 0, image: null };
    entry.count += 1;
    entry.image ??= p.media.find((m) => m.type === "image")?.url ?? null;
    counts.set(slug, entry);
  }

  const known: CategoryInfo[] = categories
    .filter((c) => counts.has(c.slug))
    .map(({ productTypes: _types, ...c }) => ({ ...c, count: counts.get(c.slug)!.count }));

  const auto: CategoryInfo[] = [...counts.entries()]
    .filter(([slug]) => !categories.some((c) => c.slug === slug))
    .map(([slug, { count, image }], i) => ({
      slug,
      title: titleCase(slug),
      kicker: `${count} gift${count === 1 ? "" : "s"}`,
      blurb: `Christmas gifts in ${titleCase(slug)} — on sale now, with free shipping on every order.`,
      image: image ?? categories[0]!.image,
      order: 100 + i,
      count,
    }));

  return [...known, ...auto].sort((a, b) => a.order - b.order);
}

export async function getCategory(slug: string): Promise<CategoryInfo | null> {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function getProductsInCategory(slug: string): Promise<ProductRecord[]> {
  return (await getProducts()).filter((p) => categorySlugOf(p) === slug);
}

/** Variant id → product handle, for validating checkout lines. */
export async function variantIndex(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  for (const p of await getProducts()) for (const v of p.variants) index.set(v.id, p.handle);
  return index;
}
