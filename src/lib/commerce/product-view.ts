import type { ProductRecord, ProductStory } from "@/lib/catalog/types";
import { plainText, sanitizeHtml } from "@/lib/utils";

/**
 * Client-safe product views: the small, serialisable shapes the PDP islands,
 * product cards and the bag need. Built on the server from the Shopify record.
 *
 * Pricing: the sale price is Shopify's `price`; the struck-through price is
 * Shopify's own `compareAtPrice` (only when genuinely higher). Pack savings
 * are plain arithmetic against buying single units of the same variant.
 */

export type ViewImage = { url: string; width: number; height: number; alt: string };
export type ViewVideo = {
  type: "video";
  poster: string;
  width: number;
  height: number;
  alt: string;
  sources: { src: string; type: string; width: number | null }[];
};
export type ViewMedia = ({ type: "image" } & ViewImage & { variantId: string | null }) | ViewVideo;

export type ViewVariant = {
  id: string;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  compareAtPercent: number | null;
  availableForSale: boolean;
  /** Units in stock, or null when untracked. */
  stock: number | null;
  sku: string | null;
  image: string | null;
  /** Units in the pack (1 when the product has no pack option). */
  units: number;
  /** Saving vs buying `units` singles, when > 0. */
  savings: number | null;
  perUnit: number;
  /** "Pine · 2 Pack" */
  label: string;
};

export type ViewOption = { name: string; label: string; values: string[] };

export type ProductView = {
  /** Shopify product GID — used for catalog-matched ad events. */
  productId: string;
  handle: string;
  href: string;
  name: string;
  vendor: string | null;
  category: { slug: string; title: string };
  currency: string;
  options: ViewOption[];
  variants: ViewVariant[];
  defaultVariantId: string;
  fromPrice: number;
  availableForSale: boolean;
  gallery: ViewMedia[];
  cardImage: ViewImage | null;
  packOptionName: string | null;
  perks: string[];
  saleEndsAt: string;
  descriptionHtml: string;
  summary: string;
  giftFor: string | null;
  story: ProductStory | null;
};

/** The light shape product cards, the menu and search need. */
export type CardView = {
  productId: string;
  handle: string;
  href: string;
  name: string;
  category: { slug: string; title: string };
  currency: string;
  price: number;
  compareAtPrice: number | null;
  percentOff: number | null;
  image: ViewImage | null;
  hoverImage: ViewImage | null;
  available: boolean;
  /** Set when the product has exactly one buyable variant — the card can add it straight to the bag. */
  quickAddVariantId: string | null;
  /** The variant whose price the card shows — used as the item id in analytics. */
  leadVariantId: string | null;
  createdAt: string;
  tags: string[];
};

const PACK_OPTION = /^(pack|packs|bundle|quantity|qty|set size|multipack)$/i;
const fallbackSize = 1200;

function unitsOf(value: string | undefined): number {
  const match = value?.match(/\d+/);
  const n = match ? Number.parseInt(match[0], 10) : 1;
  return Number.isFinite(n) && n > 0 && n < 100 ? n : 1;
}

function percentOff(price: number, compareAt: number | null): number | null {
  return compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
}

function gallery(record: ProductRecord): ViewMedia[] {
  return record.media.map((m) =>
    m.type === "image"
      ? {
          type: "image",
          url: m.url,
          width: m.width ?? fallbackSize,
          height: m.height ?? fallbackSize,
          alt: m.alt ?? record.title,
          variantId: m.variantId,
        }
      : {
          type: "video",
          poster: m.poster,
          width: m.width ?? 720,
          height: m.height ?? 1280,
          alt: m.alt ?? record.title,
          sources: m.sources,
        },
  );
}

export function buildProductView(
  record: ProductRecord,
  currency: string,
  category: { slug: string; title: string },
  defaultSaleEndsAt: string,
): ProductView {
  const packName =
    record.options.find((o) => PACK_OPTION.test(o.name.trim()) && o.values.length > 1)?.name ?? null;
  const unitsFor = (options: Record<string, string>) => (packName ? unitsOf(options[packName]) : 1);

  const variants: ViewVariant[] = record.variants.map((v) => {
    const units = unitsFor(v.options);
    const single =
      packName && units > 1
        ? record.variants.find(
            (o) =>
              unitsFor(o.options) === 1 &&
              Object.entries(v.options).every(([k, val]) => k === packName || o.options[k] === val),
          )
        : undefined;
    const raw = single ? single.price * units - v.price : 0;
    return {
      id: v.id,
      options: v.options,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      compareAtPercent: percentOff(v.price, v.compareAtPrice),
      availableForSale: v.availableForSale,
      stock: v.stock ?? null,
      sku: v.sku,
      image: v.image,
      units,
      savings: raw > 0.009 ? Math.round(raw * 100) / 100 : null,
      perUnit: Math.round((v.price / units) * 100) / 100,
      label: record.options
        .filter((o) => o.values.length > 1)
        .map((o) => {
          const value = v.options[o.name] ?? "";
          return record.story?.valueLabels[value] ?? value;
        })
        .filter(Boolean)
        .join(" · "),
    };
  });

  const available = variants.filter((v) => v.availableForSale);
  const defaultVariant = available.find((v) => v.units === 1) ?? available[0] ?? variants[0];
  const singles = variants.filter((v) => v.units === 1);
  const media = gallery(record);
  const firstImage = media.find((m): m is Extract<ViewMedia, { type: "image" }> => m.type === "image");

  return {
    productId: record.id,
    handle: record.handle,
    href: `/products/${record.handle}`,
    name: record.title,
    vendor: record.vendor,
    category,
    currency,
    options: record.options
      .filter((o) => o.values.length > 1)
      .map((o) => ({ name: o.name, label: record.story?.optionLabels[o.name] ?? o.name, values: o.values })),
    variants,
    defaultVariantId: defaultVariant?.id ?? "",
    fromPrice: Math.min(...(singles.length ? singles : variants).map((v) => v.price)),
    availableForSale: record.availableForSale,
    gallery: media,
    cardImage: firstImage ?? null,
    packOptionName: packName,
    perks: record.perks,
    saleEndsAt: record.saleEndsAt ?? defaultSaleEndsAt,
    descriptionHtml: sanitizeHtml(record.descriptionHtml),
    summary: record.seo.description || plainText(record.descriptionHtml, 220),
    giftFor: record.giftFor,
    story: record.story ?? null,
  };
}

export function buildCardView(
  record: ProductRecord,
  currency: string,
  category: { slug: string; title: string },
): CardView {
  const images = record.media.filter((m) => m.type === "image");
  const toImage = (i: number): ViewImage | null => {
    const m = images[i];
    return m
      ? { url: m.url, width: m.width ?? fallbackSize, height: m.height ?? fallbackSize, alt: m.alt ?? record.title }
      : null;
  };
  const buyable = record.variants.filter((v) => v.availableForSale);
  // The card shows the cheapest variant, with its own compare-at price.
  const lead =
    [...(buyable.length ? buyable : record.variants)].sort((a, b) => a.price - b.price)[0] ?? null;
  const price = lead?.price ?? 0;
  const compareAt = lead?.compareAtPrice ?? null;
  return {
    productId: record.id,
    handle: record.handle,
    href: `/products/${record.handle}`,
    name: record.title,
    category,
    currency,
    price,
    compareAtPrice: compareAt,
    percentOff: percentOff(price, compareAt),
    image: toImage(0),
    hoverImage: toImage(1),
    available: record.availableForSale,
    quickAddVariantId: record.variants.length === 1 && buyable.length === 1 ? buyable[0]!.id : null,
    leadVariantId: lead?.id ?? null,
    createdAt: record.createdAt,
    tags: record.tags,
  };
}
