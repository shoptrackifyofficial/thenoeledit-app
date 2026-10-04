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
  /** Units in stock; null when Shopify does not track this variant or lets it oversell. Drives the low-stock alert. */
  stock?: number | null;
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

/** Structured long-form content from the `custom.noel_story` metafield (see lib/catalog/story.ts). */
export type ProductStory = {
  /** Display names for Shopify option names, e.g. { Color: "Template pack" } — fixes supplier-mislabelled options. */
  optionLabels: Record<string, string>;
  /** Display names for option values, e.g. { "4 Templates": "4 Stencils" } (Shopify keeps its own values). */
  valueLabels: Record<string, string>;
  /** Portrait demo clips for the "See it in action" row (Shopify-hosted mp4). */
  videos: { src: string; poster: string | null; alt: string }[];
  /** Turns one option (e.g. camera colour) into a "how many, and which colours" picker. */
  bundle: { option: string; secondary: string | null; max: number; noun: string; popular: number | null; tags: string[] } | null;
  how: {
    eyebrow: string;
    title: string;
    accent: string;
    intro: string;
    image: string | null;
    imageAlt: string;
    steps: { title: string; text: string }[];
  } | null;
  designs: {
    eyebrow: string;
    title: string;
    accent: string;
    intro: string;
    images: { url: string; alt: string; caption: string }[];
    chips: string[];
  } | null;
  /** One image-and-text band per supplier photo; the storefront alternates image left / right. */
  features: { eyebrow: string; title: string; text: string; image: string; imageAlt: string }[];
  /** The full "Product information" list, shown in the product page's Details accordion. */
  info: { label: string; value: string }[];
  details: {
    eyebrow: string;
    title: string;
    accent: string;
    occasions: string[];
    recipients: string[];
    holidays: string[];
  } | null;
};

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
  /** `custom.noel_story` metafield — rich "how it works" content; absent on older synced records. */
  story?: ProductStory | null;
};

export type CatalogDocument = {
  version: number;
  syncedAt: string;
  /** True for the bundled placeholder catalog — checkout is disabled until a real sync runs. */
  demo?: boolean;
  shop: { domain: string; name: string; currencyCode: string };
  products: Record<string, ProductRecord>;
};
