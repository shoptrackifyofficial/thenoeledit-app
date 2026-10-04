import { Icon } from "@/components/ui/Icon";
import { maskName, type Review } from "@/lib/judgeme/types";

/** Country code ("US") to its English name, for the tooltip; unknown codes just show the code. */
function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The reviewer's name with, only where the data really says so, a green "verified buyer" tick
 * and the country they wrote from. Imported reviews never get the tick.
 */
export function ReviewByline({ review, className }: { review: Review; className?: string }) {
  return (
    <p className={className ?? "flex min-w-0 items-center gap-1.5 text-[0.88rem] leading-none font-semibold"}>
      <span className="truncate">{maskName(review.author)}</span>
      {review.verified && (
        <span
          title="Verified buyer"
          className="inline-grid size-4 shrink-0 place-items-center rounded-full bg-pine-600 text-snow"
        >
          <Icon name="check" className="size-2.5" strokeWidth={3.5} />
          <span className="sr-only">Verified buyer</span>
        </span>
      )}
      {review.country && (
        <span title={countryName(review.country)} className="shrink-0 rounded bg-cream px-1 py-0.5 text-[0.62rem] leading-none font-bold tracking-wide text-ink-soft">
          {review.country}
        </span>
      )}
    </p>
  );
}
