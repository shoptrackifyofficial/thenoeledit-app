/**
 * Packs for products sold as ONE variant at a higher cart quantity: a "3 Pack" is quantity 3 of the same
 * variant, so the supplier simply ships N units and no pack variants exist in Shopify.
 *
 * The savings here only mirror the AUTOMATIC discounts configured in Shopify Admin (Discounts), which are
 * what actually charge the shopper:
 *   - "<Product> - Pack 2 Save $X": X off, once, when 2 or more are in the cart (amount discount, minimum quantity 2)
 *   - "<Product> - Buy 2 Get 1 Free": buy 2, get 1 of the same product at 100% off
 * Shopify gives the shopper whichever is better. Change them in Shopify and in the product's `custom.noel_story`
 * (`packs`) together, or the price on the page and the price at checkout drift apart.
 *
 * Plain data and arithmetic only, so server and client components share it.
 */

export type PackTier = {
  /** Units in this pack (the cart quantity it sets). */
  size: number;
  /** Units in the pack that cost nothing: 1 for a "buy 2, get 1 free" 3 Pack. */
  freeUnits: number;
  /** Amount off the whole pack, in the shop currency (what the Shopify discount takes off). */
  saving: number;
  /** Name on the pack's card and bag line; without one it reads "N Pack". */
  label: string;
  /** Merchandising badge on the pack's card, e.g. "Buy 2 Get 1 Free". */
  tag: string;
  /** Photo for this pack's card per colour (option value -> https URL); without one the variant's own image shows. */
  images: Record<string, string>;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * What `quantity` units cost at `unitPrice`. Two kinds of saving can apply and Shopify gives the shopper
 * the better of the two, so this does too: the free-unit deal (repeats for every complete set, like
 * Shopify's "buy X get Y", so 4 pays for 3) against the biggest fixed saving whose pack size the quantity
 * has reached. `catalogUnit` is the unit price the savings are written against (the synced shop-currency
 * price); a live price in another currency scales the fixed saving by the same ratio.
 */
export function packTotal(tiers: readonly PackTier[] | null | undefined, unitPrice: number, quantity: number, catalogUnit: number = unitPrice): number {
  const gross = unitPrice * quantity;
  if (!tiers) return round2(gross);
  const deal = tiers.find((t) => t.freeUnits > 0);
  const free = deal ? Math.floor(quantity / deal.size) * deal.freeUnits : 0;
  let saving = 0;
  for (const t of tiers) if (quantity >= t.size && t.saving > saving) saving = t.saving;
  const scale = catalogUnit > 0 ? unitPrice / catalogUnit : 1;
  return round2(gross - Math.max(free * unitPrice, saving * scale));
}
