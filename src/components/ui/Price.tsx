"use client";

import { useEffect } from "react";

import { useLocalization } from "@/components/localization/LocalizationProvider";
import { originalPrice } from "@/lib/commerce/tiers";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Sale price + compare-at price, struck through, with a screen-reader sentence.
 * Given a `variantId`, it swaps in Shopify's own price for the visitor's country
 * (Markets) once that has loaded; until then it shows the shop-currency price.
 */
export function Price({
  price: basePrice,
  compareAtPrice: baseCompare,
  currency: baseCurrency,
  variantId,
  percentOff,
  className,
  size = "md",
  from = false,
  showSave = false,
}: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  /** The variant this price belongs to — enables the local-currency price. */
  variantId?: string | null;
  /** The offer percentage behind a worked-back compare-at price, so it can be re-worked in the local currency. */
  percentOff?: number | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  from?: boolean;
  /** Adds a "Save 33%" chip after the prices (worked out from the price and compare-at, so it follows the visitor's currency). */
  showSave?: boolean;
}) {
  const { localizedPriceFor, requestPrices, registerBasePrice } = useLocalization();
  if (variantId) registerBasePrice(variantId, basePrice);
  useEffect(() => {
    if (variantId) requestPrices([variantId]);
  }, [variantId, requestPrices]);

  let price = basePrice;
  let compareAtPrice = baseCompare;
  let currency = baseCurrency;
  const live = variantId ? localizedPriceFor(variantId) : null;
  const liveAmount = live ? Number.parseFloat(live.amount) : NaN;
  if (live && Number.isFinite(liveAmount)) {
    price = liveAmount;
    currency = live.currencyCode;
    const liveCompare = live.compareAtAmount != null ? Number.parseFloat(live.compareAtAmount) : NaN;
    compareAtPrice = Number.isFinite(liveCompare) && liveCompare > liveAmount
      ? liveCompare
      : baseCompare != null && percentOff
        ? originalPrice(liveAmount, percentOff)
        : null;
  }
  const onSale = compareAtPrice != null && compareAtPrice > price;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className="sr-only">
        {onSale
          ? `Sale price ${formatMoney(price, currency)}, was ${formatMoney(compareAtPrice!, currency)}`
          : `Price ${formatMoney(price, currency)}`}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "font-bold tabular-nums",
          onSale ? "text-berry-600" : "text-ink",
          size === "xs" && "text-[0.82rem] font-semibold",
          size === "sm" && "text-[0.92rem]",
          size === "md" && "text-[1.1rem]",
          size === "lg" && "numeral text-[1.9rem] leading-none font-medium",
        )}
      >
        {from && <span className="mr-1 font-sans text-[0.7em] font-medium text-ink-soft">from</span>}
        {formatMoney(price, currency)}
      </span>
      {onSale && (
        <s
          aria-hidden="true"
          className={cn(
            "text-ink-faint tabular-nums decoration-1",
            size === "lg" ? "text-[1.05rem]" : size === "xs" ? "text-[0.74rem]" : "text-[0.8rem]",
          )}
        >
          {formatMoney(compareAtPrice!, currency)}
        </s>
      )}
      {showSave && onSale && (
        <span className="rounded-md bg-berry-50 px-1.5 py-0.5 text-[0.7rem] leading-none font-bold whitespace-nowrap text-berry-700 ring-1 ring-berry-100 tabular-nums">
          Save {Math.round((1 - price / compareAtPrice!) * 100)}%
        </span>
      )}
    </p>
  );
}
