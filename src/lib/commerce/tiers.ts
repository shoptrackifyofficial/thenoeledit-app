/**
 * Bundle offers ("Buy 1 / 2 / 3 → 50% / 56% / 65% off").
 *
 * The percentages are off an *original* price that is worked back from Shopify's
 * own price: `original = price ÷ (1 − first%)`. So with a $59.99 price and 50%
 * for one camera, the original is $119.98 and
 *
 *   Buy 1 → pay $59.99            (the price you set — no discount code)
 *   Buy 2 → 56% off 2 × $119.98   = $105.58  ($52.79 each)
 *   Buy 3 → 65% off 3 × $119.98   = $125.98  ($41.99 each)
 *
 * Shopify charges its own price per unit, so Buy 2 and Buy 3 need a discount code
 * for the difference — 12% and 30% off the actual price here (`tierOff`). Create
 * those as XMAS56 / XMAS65 (see README); the checkout route applies the right one
 * and refuses to continue if it isn't live, rather than charge more than shown.
 * The code *names* (`codePrefix` + the configured percent) are what shoppers see.
 *
 * If the variants carry a Shopify compare-at price, the percentages shown follow it instead of the
 * configured 50: the original is the compare-at, Buy 1 is price ÷ compare-at, and Buy 2 / Buy 3 keep the
 * same extra 12% / 30% off the shop price (`basePct`, set in lib/catalog/index.ts).
 *
 * Shared by the product page, the catalog and the bag (no server-only imports).
 */

/**
 * `discounts` is the offer's shape (the first step and how much each later step takes off the shop price).
 * `basePct` is the first step's real percent worked out from Shopify's compare-at price; when it is set the
 * shown percentages follow it, while the price paid and the checkout codes stay exactly as `discounts` say.
 */
export type TierConfig = { discounts: number[]; codePrefix: string; basePct?: number };

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The configured step for `qty` units (1, 2, 3… units, the last step for more) - names the checkout code. */
function configuredPercent(cfg: TierConfig, qty: number): number {
  if (qty < 1 || cfg.discounts.length === 0) return 0;
  return cfg.discounts[Math.min(qty, cfg.discounts.length) - 1] ?? 0;
}

/** First step's percent: from the compare-at price when there is one, else the configured 50-ish. */
export const tierBase = (cfg: TierConfig) => cfg.basePct ?? cfg.discounts[0] ?? 0;

/** Percent shown for `qty` units, measured against the compare-at price (so it follows Shopify). */
export function tierPercent(cfg: TierConfig, qty: number): number {
  const pct = configuredPercent(cfg, qty);
  if (pct <= 0 || cfg.basePct == null) return pct;
  return Math.round((1 - tierFactor(cfg, qty) * (1 - cfg.basePct / 100)) * 100);
}

/** The "original" price that makes `price` exactly `pct`% off. */
export const originalPrice = (price: number, pct: number) => (pct > 0 && pct < 100 ? round2(price / (1 - pct / 100)) : price);

/** Share of Shopify's own price a shopper pays for `qty` units (1 for the first tier). */
export function tierFactor(cfg: TierConfig, qty: number): number {
  const first = cfg.discounts[0] ?? 0;
  const pct = configuredPercent(cfg, qty);
  if (first <= 0 || first >= 100 || pct <= 0) return 1;
  return Math.min(1, (1 - pct / 100) / (1 - first / 100));
}

/** Percent the Shopify discount code takes off Shopify's own price for `qty` units (0 = no code needed). */
export const tierOff = (cfg: TierConfig, qty: number) => Math.round((1 - tierFactor(cfg, qty)) * 1000) / 10;

/** What a shopper pays for `list` (Shopify price × quantity) at `qty` units in the bag. */
export const tierPrice = (list: number, cfg: TierConfig, qty: number) => round2(list * tierFactor(cfg, qty));

/** The coupon label for `qty` units, e.g. XMAS56 — what the shopper sees. */
export function tierCode(cfg: TierConfig, qty: number): string | null {
  const pct = configuredPercent(cfg, qty);
  return pct > 0 && cfg.codePrefix ? `${cfg.codePrefix}${pct}` : null;
}

/** The Shopify discount code checkout must apply for `qty` units, or null when the shop price already is the offer. */
export const checkoutCode = (cfg: TierConfig, qty: number) => (tierOff(cfg, qty) > 0 ? tierCode(cfg, qty) : null);
