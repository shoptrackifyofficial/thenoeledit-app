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
          "numeral font-semibold",
          onSale ? "text-berry-600" : "text-ink",
          size === "sm" && "text-[1.05rem]",
          size === "md" && "text-[1.2rem]",
          size === "lg" && "text-[1.9rem] leading-none",
        )}
      >
        {from && <span className="mr-1 font-sans text-[0.7em] font-medium text-ink-soft">from</span>}
        {formatMoney(price, currency)}
      </span>
      {onSale && (
        <s
          aria-hidden="true"
          className={cn(
            "numeral text-ink-faint decoration-1",
            size === "lg" ? "text-[1.1rem]" : "text-[0.85rem]",
          )}
        >
          {formatMoney(compareAtPrice!, currency)}
        </s>
      )}
    </p>
  );
}
