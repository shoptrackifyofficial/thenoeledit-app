"use client";

import { useEffect } from "react";

import { useLocalization } from "@/components/localization/LocalizationProvider";
import type { CardView } from "@/lib/commerce/product-view";
import { formatMoney } from "@/lib/money";

/**
 * Local-currency helpers for places that compare or label prices across many
 * products (shop filters, the gift finder, the category header). Prices are
 * still Shopify's own — this only reads the overlay the provider fetched and
 * falls back to the shop currency (USD unless the shop says otherwise) until it
 * lands or if it can't.
 */

const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];

/** A budget band (e.g. "under 25") in the visitor's currency, rounded to a number a shopper would expect to see. */
export function niceBand(base: number, ratio: number): number {
  if (Math.abs(ratio - 1) < 0.005) return base;
  const raw = base * ratio;
  if (!(raw > 0)) return base;
  const exp = Math.floor(Math.log10(raw));
  const mag = 10 ** exp;
  const f = raw / mag;
  const step = STEPS.reduce((best, s) => (Math.abs(Math.log(s / f)) < Math.abs(Math.log(best / f)) ? s : best), STEPS[0]!);
  return Math.round(step * mag * 100) / 100;
}

export function useLocalCards(cards: CardView[], shopCurrency: string) {
  const { localizedPriceFor, requestPrices, registerBasePrice, currencyInfo } = useLocalization();
  for (const c of cards) if (c.leadVariantId) registerBasePrice(c.leadVariantId, c.price);

  useEffect(() => {
    const ids = cards.map((c) => c.leadVariantId).filter((id): id is string => Boolean(id));
    if (ids.length) requestPrices(ids);
  }, [cards, requestPrices]);

  const { currencyCode, ratio } = currencyInfo();
  const currency = currencyCode ?? shopCurrency ?? "USD";

  const priceOf = (c: CardView): number => {
    const live = c.leadVariantId ? localizedPriceFor(c.leadVariantId) : null;
    const amount = live ? Number.parseFloat(live.amount) : NaN;
    return Number.isFinite(amount) ? amount : c.price * ratio;
  };
  const band = (base: number) => niceBand(base, ratio);
  return { currency, ratio, priceOf, band, money: (amount: number) => formatMoney(amount, currency) };
}

/** A fixed shop-currency budget (e.g. "50"), shown as a band in the visitor's currency once the ratio is known. */
export function useLocalBand(base: number, shopCurrency = "USD"): string {
  const { currencyInfo } = useLocalization();
  const { currencyCode, ratio } = currencyInfo();
  return formatMoney(niceBand(base, ratio), currencyCode ?? shopCurrency);
}
