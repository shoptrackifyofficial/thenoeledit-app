/**
 * Shape of data/catalog.json — the Shopify read model written by
 * `lib/shopify/sync.ts` and read by `lib/catalog/index.ts`.
 * Plain data only, safe to import from client components.
 */

export type VariantRecord = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  /** Only kept when greater than price. */
  compareAtPrice: number | null;
  availableForSale: boolean;
  /** Option name → value, e.g. { Color: "Pine", Pack: "2 Pack" }. */
  options: Record<string, string>;
  image: string | null;
};

export type ImageRecord = {
  type: "image";
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  variantId: string | null;
};

export type VideoRecord = {
  type: "video";
  alt: string | null;
  poster: string;
  width: number | null;
  height: number | null;
  /** mp4 renditions, smallest first. */
  sources: { src: string; type: string; width: number | null }[];
};

export type MediaRecord = ImageRecord | VideoRecord;

export type ProductRecord = {
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
  seo: { title: string | null; description: string | null };
  options: { name: string; values: string[] }[];
  availableForSale: boolean;
  variants: VariantRecord[];
  media: MediaRecord[];
  /** `custom.perks` metafield (list of short benefit lines), in Shopify's order. */
  perks: string[];
  /** `custom.sale_ends_at` metafield — ISO timestamp, only kept while in the future. */
  saleEndsAt: string | null;
  /** `custom.gift_for` metafield — "Who it's for" line, e.g. "Coffee lovers, new homeowners". */
  giftFor: string | null;
};

export type CatalogDocument = {
  version: number;
  syncedAt: string;
  /** True for the bundled placeholder catalog — checkout is disabled until a real sync runs. */
  demo?: boolean;
  shop: { domain: string; name: string; currencyCode: string };
  products: Record<string, ProductRecord>;
};
