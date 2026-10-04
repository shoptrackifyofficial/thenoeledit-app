/**
 * Quantity-tier discounts ("Buy 1 / 2 / 3 → 50% / 56% / 65% off").
 *
 * The percentages and code prefix live in the product's `custom.noel_story`
 * metafield (`bundle.discounts`, `bundle.codePrefix`). The discount itself is a
 * Shopify discount code per tier (XMAS50, XMAS56, XMAS65) that the checkout
 * route applies; the page only *shows* what that code will do, so the code must
 * exist in Shopify (see README / the check-discounts script).
 *
 * Shared by the product page, the bag and the checkout route (no server-only
 * imports).
 */

export type TierConfig = { discounts: number[]; codePrefix: string };

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percent off for `qty` units: the tier for 1, 2, 3… units, the last tier for more. */
export function tierPercent(cfg: TierConfig, qty: number): number {
  if (qty < 1 || cfg.discounts.length === 0) return 0;
  return cfg.discounts[Math.min(qty, cfg.discounts.length) - 1] ?? 0;
}

/** The Shopify discount code for `qty` units, e.g. XMAS56. */
export function tierCode(cfg: TierConfig, qty: number): string | null {
  const pct = tierPercent(cfg, qty);
  return pct > 0 ? `${cfg.codePrefix}${pct}` : null;
}

/** Amount after a percentage discount, rounded to the cent. */
export const applyPercent = (amount: number, pct: number) => round2(amount * (1 - pct / 100));
