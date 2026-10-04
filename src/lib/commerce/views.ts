import "server-only";

import {
  categorySlugOf,
  getCategories,
  getProductByHandle,
  getProducts,
  storeCurrency,
  type CategoryInfo,
} from "@/lib/catalog";
import type { ProductRecord } from "@/lib/catalog/types";
import { buildCardView, buildProductView, type CardView, type ProductView } from "@/lib/commerce/product-view";
import { site } from "@/content/site";
import { getPaymentMethods, type PaymentMethod } from "@/lib/shopify/payments";

/** Server helpers that turn catalog records into the client-safe views. */

async function categoryLookup(): Promise<(r: ProductRecord) => { slug: string; title: string }> {
  const cats = await getCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  return (r) => {
    const slug = categorySlugOf(r);
    return { slug, title: bySlug.get(slug)?.title ?? slug };
  };
}

export async function getCardViews(filter?: (r: ProductRecord) => boolean): Promise<CardView[]> {
  const [products, currency, catOf] = await Promise.all([getProducts(), storeCurrency(), categoryLookup()]);
  return products.filter((p) => !filter || filter(p)).map((p) => buildCardView(p, currency, catOf(p)));
}

export async function getCategoryCards(slug: string): Promise<CardView[]> {
  return getCardViews((r) => categorySlugOf(r) === slug);
}

export async function getProductView(handle: string): Promise<{ view: ProductView; record: ProductRecord } | null> {
  const record = await getProductByHandle(handle);
  if (!record) return null;
  const [currency, catOf] = await Promise.all([storeCurrency(), categoryLookup()]);
  return { record, view: buildProductView(record, currency, catOf(record), site.sale.endsAt) };
}

/** Biggest discounts first — used for "12 Days of Deals" and best-sellers fallbacks. */
export function byDiscount(cards: CardView[]): CardView[] {
  return [...cards].sort((a, b) => (b.percentOff ?? 0) - (a.percentOff ?? 0));
}

/* ── Navigation (Shop → Category → Products) ─────────────────────────────── */

export type MenuProduct = { name: string; href: string; image: string | null; price: number; compareAtPrice: number | null };
export type MenuCategory = Pick<CategoryInfo, "slug" | "title" | "kicker" | "image" | "count"> & {
  href: string;
  products: MenuProduct[];
};
export type MenuData = { currency: string; categories: MenuCategory[] };

const MENU_PRODUCTS = 6;

export async function getMenuData(): Promise<MenuData> {
  const [categories, cards, currency] = await Promise.all([getCategories(), getCardViews(), storeCurrency()]);
  return {
    currency,
    categories: categories.map((c) => ({
      slug: c.slug,
      title: c.title,
      kicker: c.kicker,
      image: c.image,
      count: c.count,
      href: `/shop/${c.slug}`,
      products: cards
        .filter((p) => p.category.slug === c.slug)
        .slice(0, MENU_PRODUCTS)
        .map((p) => ({
          name: p.name,
          href: p.href,
          image: p.image?.url ?? null,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
        })),
    })),
  };
}

/* ── Bag catalog (fetched lazily by the cart, never inlined in every page) ── */

export type BagVariant = {
  productName: string;
  variantLabel: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  href: string;
  available: boolean;
  /** Shopify product GID and category title — carried for analytics events. */
  productId?: string;
  category?: string;
  /** Quantity-tier discount for this product (see lib/commerce/tiers.ts). */
  tiers?: { discounts: number[]; codePrefix: string };
};
export type BagCatalog = { currency: string; demo: boolean; payments?: PaymentMethod[]; variants: Record<string, BagVariant> };

export async function getBagCatalog(demo: boolean): Promise<BagCatalog> {
  const [products, currency, catOf, payments] = await Promise.all([getProducts(), storeCurrency(), categoryLookup(), getPaymentMethods()]);
  const variants: BagCatalog["variants"] = {};
  for (const p of products) {
    const fallback = p.media.find((m) => m.type === "image")?.url ?? null;
    for (const v of p.variants) {
      const label = p.options
        .filter((o) => o.values.length > 1)
        .map((o) => {
          const value = v.options[o.name];
          return value ? (p.story?.valueLabels[value] ?? value) : value;
        })
        .filter(Boolean)
        .join(" · ");
      variants[v.id] = {
        productName: p.title,
        variantLabel: label,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        image: v.image ?? fallback,
        href: `/products/${p.handle}?variant=${v.id.split("/").pop()}`,
        available: v.availableForSale,
        productId: p.id,
        category: catOf(p).title,
        ...(p.story?.bundle?.discounts.length && p.story.bundle.codePrefix
          ? { tiers: { discounts: p.story.bundle.discounts, codePrefix: p.story.bundle.codePrefix } }
          : {}),
      };
    }
  }
  return { currency, demo, payments, variants };
}
