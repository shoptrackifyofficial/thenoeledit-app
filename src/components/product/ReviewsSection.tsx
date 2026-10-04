"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { ReviewByline } from "@/components/product/ReviewByline";
import { ReviewAvatar } from "@/components/product/ReviewAvatar";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import {
  FEED_PAGE_SIZE,
  formatReviewDate,
  maskName,
  type FeedFilter,
  type FeedPage,
  type Review,
  type ReviewSummary,
} from "@/lib/judgeme/types";
import { cn } from "@/lib/utils";

const STAR_ORDER = [5, 4, 3, 2, 1] as const;

/**
 * The full review system, laid out like the reference: the rating summary and
 * clickable star breakdown on the left (sticky on wide screens), the filters,
 * the reviews and the page buttons on the right. Page one is rendered on the
 * server; other pages and filters come from `/api/reviews`, 8 at a time, and are
 * kept so going back is instant.
 */
export function ReviewsSection({
  summary,
  photoCount,
  initial,
  handle,
}: {
  summary: ReviewSummary;
  photoCount: number;
  initial: FeedPage;
  handle: string;
}) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [current, setCurrent] = useState<FeedPage>(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, FeedPage>([["all:1", initial]]));
  const latest = useRef(0);

  const load = useCallback(
    async (nextFilter: FeedFilter, nextPage: number) => {
      const key = `${nextFilter}:${nextPage}`;
      const ticket = ++latest.current;
      const cached = cache.current.get(key);
      if (cached) {
        setCurrent(cached);
        setLoading(false);
        setFailed(false);
        return;
      }
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(
          `/api/reviews?${new URLSearchParams({ handle, filter: String(nextFilter), page: String(nextPage) })}`,
        );
        if (!res.ok) throw new Error(`reviews ${res.status}`);
        const data = (await res.json()) as FeedPage;
        cache.current.set(key, data);
        if (ticket === latest.current) setCurrent(data);
      } catch {
        if (ticket === latest.current) setFailed(true);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    },
    [handle],
  );

  const chooseFilter = (next: FeedFilter) => {
    setFilter(next);
    void load(next, 1);
  };
  const goTo = (next: number) => {
    void load(filter, Math.min(Math.max(1, next), current.pages));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const from =
    current.total === 0 ? 0 : (current.page - 1) * FEED_PAGE_SIZE + 1;
  const to = Math.min(current.page * FEED_PAGE_SIZE, current.total);
  const liked = summary.count
    ? Math.round(
        ((summary.distribution[5] + summary.distribution[4]) / summary.count) *
          100,
      )
    : 0;

  const chips: { id: FeedFilter; label: string; count: number }[] = [
    { id: "all", label: "All reviews", count: summary.count },
    ...(photoCount > 0
      ? [{ id: "photo" as const, label: "With photos", count: photoCount }]
      : []),
    // Every star level is listed, even at 0, so shoppers see the full spread (a 0 chip is disabled).
    ...STAR_ORDER.map((s) => ({
      id: s as FeedFilter,
      label: `${s} star${s === 1 ? "" : "s"}`,
      count: summary.distribution[s],
    })),
  ];

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="section-y scroll-mt-24"
    >
      <div className="container-page">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="kicker mb-3">Reviews</p>
          <h2 id="reviews-title" className="display-lg">
            What people{" "}
            <span className="accent text-berry-600">are saying</span>
          </h2>
        </div>

        <div className="mt-9 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-12">
          {/* ── Summary (left) ─────────────────────────────────────────── */}
          <aside
            aria-label="Rating summary"
            className="h-fit rounded-[1.75rem] bg-surface p-6 shadow-soft ring-1 ring-line lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
          >
            <div className="flex items-baseline gap-2">
              <p className="numeral text-[3.2rem] leading-none font-semibold tabular-nums">
                {summary.average.toFixed(1)}
              </p>
              <p className="text-[0.9rem] text-ink-faint">/ 5</p>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <Stars value={summary.average} starClassName="size-5" />
              <span className="text-[0.82rem] text-ink-soft tabular-nums">
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </span>
            </p>
            {liked > 0 && (
              <p className="mt-2 text-[0.84rem] text-ink-soft">
                <strong className="font-semibold text-ink tabular-nums">
                  {liked}%
                </strong>{" "}
                rated it 4 or 5 stars.
              </p>
            )}
            <ul
              className="mt-5 flex flex-col gap-0.5"
              aria-label="Rating breakdown"
            >
              {STAR_ORDER.map((s) => {
                const n = summary.distribution[s];
                const pct = summary.count ? (n / summary.count) * 100 : 0;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={n === 0}
                      onClick={() => chooseFilter(filter === s ? "all" : s)}
                      aria-pressed={filter === s}
                      aria-label={`Show ${s} star reviews, ${n} of ${summary.count}`}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8rem] transition-colors disabled:opacity-40",
                        filter === s
                          ? "bg-berry-50 font-semibold"
                          : "hover:bg-cream",
                      )}
                    >
                      <span className="flex w-9 shrink-0 items-center gap-1 tabular-nums">
                        {s}
                        <Icon
                          name="star"
                          className="size-3.5 fill-current text-gold-500"
                          strokeWidth={1}
                        />
                      </span>
                      <span
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full bg-gold-500"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-7 shrink-0 text-right text-ink-soft tabular-nums">
                        {n}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ── Reviews (right) ────────────────────────────────────────── */}
          <div
            ref={listRef}
            className="min-w-0 scroll-mt-28"
            aria-live="polite"
            aria-busy={loading}
          >
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Filter reviews"
            >
              {chips.map((c) => (
                <button
                  key={String(c.id)}
                  type="button"
                  onClick={() => chooseFilter(c.id)}
                  disabled={c.count === 0}
                  aria-pressed={filter === c.id}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                    filter === c.id
                      ? "bg-berry-600 text-snow shadow-ribbon"
                      : "bg-surface ring-1 ring-line hover:bg-cream",
                  )}
                >
                  {c.label}{" "}
                  <span className="opacity-70 tabular-nums">{c.count}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[0.8rem] text-ink-faint tabular-nums">
              {current.total === 0
                ? "No reviews match this filter."
                : `Showing ${from}–${to} of ${current.total} review${current.total === 1 ? "" : "s"}`}
            </p>

            {failed && (
              <p className="mt-3 rounded-xl bg-berry-50 p-4 text-center text-[0.86rem] text-berry-700">
                We couldn&apos;t load more reviews. Please try again.
              </p>
            )}
            <ul
              className={cn(
                "mt-3 grid gap-3 transition-opacity",
                loading && "opacity-50",
              )}
            >
              {current.items.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </ul>

            {current.pages > 1 && (
              <nav
                className="mt-6 flex items-center justify-between gap-3"
                aria-label="Review pages"
              >
                <button
                  type="button"
                  onClick={() => goTo(current.page - 1)}
                  disabled={current.page <= 1 || loading}
                  className="btn btn-outline min-h-11 px-4 disabled:opacity-40"
                >
                  <Icon name="arrow-right" className="size-4 rotate-180" />{" "}
                  Previous
                </button>
                <p className="text-[0.8rem] text-ink-soft tabular-nums">
                  Page {current.page} of {current.pages}
                </p>
                <button
                  type="button"
                  onClick={() => goTo(current.page + 1)}
                  disabled={current.page >= current.pages || loading}
                  className="btn btn-outline min-h-11 px-4 disabled:opacity-40"
                >
                  Next <Icon name="arrow-right" className="size-4" />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  const [more, setMore] = useState(false);
  const long = r.body.length > 280;
  return (
    <li className="rounded-[1.4rem] bg-surface p-4 shadow-soft ring-1 ring-line sm:p-5">
      <header className="flex items-center gap-3">
        <ReviewAvatar name={r.author} />
        <div className="min-w-0 flex-1">
          <ReviewByline review={r} className="flex min-w-0 items-center gap-1.5 text-[0.9rem] leading-none font-semibold" />
          <p className="mt-0.5 leading-none">
            <Stars value={r.rating} starClassName="size-3.5" />
            <span className="sr-only">{r.rating} out of 5 stars</span>
          </p>
        </div>
        <time
          dateTime={r.createdAt.slice(0, 10)}
          className="shrink-0 text-[0.76rem] text-ink-faint tabular-nums"
        >
          {formatReviewDate(r.createdAt)}
        </time>
      </header>
      {r.title && (
        <p className="mt-3 font-display text-[1.1rem] leading-snug">
          {r.title}
        </p>
      )}
      {r.body && (
        <p
          className={cn(
            "mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft",
            !more && long && "line-clamp-4",
          )}
        >
          {r.body}
        </p>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="mt-1 text-[0.8rem] font-semibold text-berry-600 hover:underline"
        >
          {more ? "Show less" : "Read more"}
        </button>
      )}
      {r.images.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {r.images.slice(0, 4).map((src) => (
            <li
              key={src}
              className="img-skeleton relative size-16 overflow-hidden rounded-lg ring-1 ring-line/60"
            >
              <Image
                src={src}
                alt={`Photo from ${maskName(r.author)}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </li>
          ))}
        </ul>
      )}
      {/* {(r.verified || r.source) && (
        <footer className="mt-3 flex flex-wrap items-center gap-2 text-[0.8rem]">
          <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2 py-0.5 text-[0.7rem] font-semibold text-pine-700 ring-1 ring-pine-100">
            <Icon name="check" className="size-3" strokeWidth={3} /> Verified
            buyer
          </span>
        </footer>
      )} */}
    </li>
  );
}
