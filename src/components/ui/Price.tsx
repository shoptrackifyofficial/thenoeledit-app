import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Sale price + Shopify compare-at price, struck through, with a screen-reader sentence. */
export function Price({
  price,
  compareAtPrice,
  currency,
  className,
  size = "md",
  from = false,
}: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  from?: boolean;
}) {
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
            size === "lg" ? "text-[1.05rem]" : "text-[0.8rem]",
          )}
        >
          {formatMoney(compareAtPrice!, currency)}
        </s>
      )}
    </p>
  );
}
