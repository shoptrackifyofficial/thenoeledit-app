import { Stars } from "@/components/ui/Stars";
import type { ReviewSummary } from "@/lib/judgeme/types";

/** Stars, the average and the review count in one line (above the product title); links to the full reviews. */
export function ReviewRating({ summary }: { summary: ReviewSummary }) {
  return (
    <a
      href="#reviews"
      className="mt-2 flex w-fit items-center gap-2 text-[0.84rem] text-ink-soft transition-colors hover:text-ink"
      aria-label={`Rated ${summary.average} out of 5 from ${summary.count} review${summary.count === 1 ? "" : "s"}. See reviews`}
    >
      <Stars value={summary.average} starClassName="size-4" />
      <span className="font-semibold text-ink tabular-nums">{summary.average.toFixed(1)}</span>
      <span className="underline decoration-line decoration-1 underline-offset-2 tabular-nums">
        {summary.count} review{summary.count === 1 ? "" : "s"}
      </span>
    </a>
  );
}
