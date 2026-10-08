import type { ProductView } from "@/lib/commerce/product-view";
import { originalPrice, round2, tierBase } from "@/lib/commerce/tiers";

/** A variant price as Shopify reports it for the visitor's country (see /api/localization/prices). */
export type LivePrice = { amount: string; currencyCode: string; compareAtAmount: string | null };

/**
 * The product view with every price swapped for Shopify's own price in the
 * visitor's currency. Nothing is converted here: it only substitutes amounts
 * Shopify already returned. If any variant has no live price yet (or the
 * currencies differ) the view is returned untouched, so one product never mixes
 * currencies.
 *
 * The offer's strike-through "original" is worked back from the local price,
 * exactly as it is in the catalog currency (see lib/commerce/tiers.ts).
 */
export function localizeProductView(view: ProductView, live: (variantId: string) => LivePrice | null): ProductView {
  const prices = view.variants.map((v) => live(v.id));
  const extra = (a: typeof view.addon) => (a?.variants ?? []).map((v) => live(v.id));
  const addonPrices = extra(view.addon);
  const multiPrices = extra(view.multi);
  const first = prices[0];
  // One product never mixes currencies: wait until every variant (and every add-on variant) has its local price.
  if (!first || [...prices, ...addonPrices, ...multiPrices].some((p) => !p || p.currencyCode !== first.currencyCode)) return view;

  const offer = view.story?.bundle ?? view.story?.multi;
  const pct = offer ? tierBase(offer) : 0;
  const variants = view.variants.map((v, i) => {
    const amount = Number.parseFloat(prices[i]!.amount);
    if (!Number.isFinite(amount)) return v;
    const liveCompare = prices[i]!.compareAtAmount != null ? Number.parseFloat(prices[i]!.compareAtAmount!) : NaN;
    const compare =
      Number.isFinite(liveCompare) && liveCompare > amount ? liveCompare : pct > 0 ? originalPrice(amount, pct) : null;
    return {
      ...v,
      price: amount,
      compareAtPrice: compare,
      compareAtPercent: compare ? Math.round((1 - amount / compare) * 100) : null,
      perUnit: round2(amount / Math.max(1, v.units)),
      savings: null,
    };
  });
  const pool = variants.filter((v) => v.availableForSale);
  const fromPrice = Math.min(...(pool.length ? pool : variants).map((v) => v.price));
  const reprice = (a: typeof view.addon, ps: typeof prices) =>
    a
      ? {
          ...a,
          variants: a.variants.map((v, i) => {
            const amount = Number.parseFloat(ps[i]!.amount);
            if (!Number.isFinite(amount)) return v;
            const c = ps[i]!.compareAtAmount != null ? Number.parseFloat(ps[i]!.compareAtAmount!) : NaN;
            return { ...v, price: amount, compareAt: Number.isFinite(c) && c > amount ? c : null };
          }),
        }
      : null;
  const addon = reprice(view.addon, addonPrices);
  const multi = reprice(view.multi, multiPrices);
  return { ...view, currency: first.currencyCode, variants, addon, multi, fromPrice: Number.isFinite(fromPrice) ? fromPrice : view.fromPrice };
}
