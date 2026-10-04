"use client";

import { useRef, useState } from "react";

import { ClampedReview } from "@/components/product/ReviewReadMore";
import { ReviewByline } from "@/components/product/ReviewByline";
import { ReviewAvatar } from "@/components/product/ReviewAvatar";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import type { Review } from "@/lib/judgeme/types";
import { cn } from "@/lib/utils";

/** Enough to show variety without making the buy box bottom-heavy. */
const MAX_SLIDES = 5;

/**
 * "What customers say": up to five 5-star reviews in a swipeable strip under
 * the delivery card. The label sits above the card and the page dots below it;
 * the card itself holds only the avatar, name, stars and the words. A native
 * scroll-snap strip, so touch, trackpad and keyboard all work.
 */
export function PurchaseFeedback({ reviews, className }: { reviews: Review[]; className?: string }) {
  const slides = reviews.slice(0, MAX_SLIDES);
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  if (slides.length === 0) return null;

  // Touch and trackpads swipe the strip natively (scroll-snap). A mouse can't scroll-drag a native
  // scroller, so a mouse press that travels a few pixels drags it by hand and settles on a review.
  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    const d = drag.current;
    if (!el || !d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    el.scrollLeft = d.left - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = trackRef.current;
    const d = drag.current;
    if (!el || !d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setDragging(false);
    const dx = e.clientX - d.x;
    const from = Math.round(d.left / Math.max(1, el.clientWidth));
    goTo(Math.max(0, Math.min(slides.length - 1, dx <= -40 ? from + 1 : dx >= 40 ? from - 1 : from)));
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-label="What customers say" className={className}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.66rem] font-bold tracking-[0.14em] text-ink-soft uppercase">What customers say</h3>
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            {(["Previous", "Next"] as const).map((dir) => {
              const next = dir === "Next";
              const target = next ? Math.min(active + 1, slides.length - 1) : Math.max(active - 1, 0);
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => goTo(target)}
                  disabled={target === active}
                  aria-label={`${dir} review`}
                  className="grid size-8 place-items-center rounded-full bg-surface text-ink shadow-soft ring-1 ring-line transition-colors hover:bg-cream disabled:opacity-35"
                >
                  <Icon name="arrow-right" className={cn("size-4", !next && "rotate-180")} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-2 rounded-2xl bg-surface px-3.5 py-3 shadow-soft ring-1 ring-line">
        <ul
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
          className={cn(
            "scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden",
            dragging ? "cursor-grabbing snap-none" : "cursor-grab",
          )}
          aria-roledescription="carousel"
        >
          {slides.map((r, i) => (
            <li key={r.id} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className="w-full shrink-0 snap-center snap-always pr-1">
              <div className="flex items-center gap-2.5">
                <ReviewAvatar name={r.author} className="size-8 text-[0.9rem]" />
                <div className="min-w-0">
                  <ReviewByline review={r} />
                  <p className="mt-0.5 leading-none">
                    <Stars value={r.rating} starClassName="size-3" />
                    <span className="sr-only">{r.rating} out of 5 stars</span>
                  </p>
                </div>
              </div>
              <ClampedReview review={r} />
            </li>
          ))}
        </ul>
      </div>
      {slides.length > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5" role="group" aria-label="Choose a review">
          {slides.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show review ${i + 1}`}
              aria-current={i === active}
              className="grid size-5 place-items-center"
            >
              <span className={cn("block rounded-full transition-all", i === active ? "h-1.5 w-4 bg-berry-600" : "size-1.5 bg-line")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
