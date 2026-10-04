"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ReviewByline } from "@/components/product/ReviewByline";
import { ReviewAvatar } from "@/components/product/ReviewAvatar";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { formatReviewDate, maskName, type Review } from "@/lib/judgeme/types";

/**
 * A review body cut to two lines with an ellipsis, plus a "Read more" button
 * (shown only when the text really was cut) that opens the whole review in a
 * bottom sheet on phones and a centred dialog from `md` up, as the reference does.
 */
export function ClampedReview({
  review,
  lines = 2,
}: {
  review: Review;
  lines?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);
  const [open, setOpen] = useState(false);
  const text = review.body || review.title || "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <>
      <p
        ref={ref}
        className="mt-2 overflow-hidden text-[0.84rem] leading-snug text-ink-soft"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
        }}
      >
        {text}
      </p>
      <div>
        {cut && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="text-[0.78rem] leading-5 font-semibold text-berry-600 hover:underline"
          >
            Read more
          </button>
        )}
      </div>
      {open && <ReviewSheet review={review} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReviewSheet({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [onClose]);

  if (!mounted) return null;
  const paragraphs = review.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center md:items-center md:p-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Full review from ${maskName(review.author)}`}
        className="relative flex max-h-[88svh] w-full animate-[sheet-up_0.32s_var(--ease-out-soft)] flex-col overflow-hidden rounded-t-[1.75rem] bg-paper pb-[env(safe-area-inset-bottom)] shadow-lift md:max-h-[80vh] md:max-w-xl md:rounded-[1.75rem] md:pb-0"
      >
        {/* Phones: the grab handle closes the sheet. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid shrink-0 touch-manipulation place-items-center py-3 md:hidden"
        >
          <span aria-hidden="true" className="h-1 w-11 rounded-full bg-line" />
        </button>
        {/* Wider screens: a corner X. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 hidden size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink md:grid"
        >
          <Icon name="close" className="size-4" strokeWidth={2.2} />
        </button>

        <div className="overflow-y-auto overscroll-contain px-6 pt-1 pb-8 md:px-8 md:pt-8">
          <header className="flex items-center gap-3 md:pr-10">
            <ReviewAvatar name={review.author} className="size-11" />
            <div className="min-w-0 flex-1">
              <ReviewByline review={review} className="flex min-w-0 items-center gap-1.5 text-[0.95rem] leading-none font-semibold" />
              <p className="mt-0.5 flex items-center gap-2 leading-none">
                <Stars value={review.rating} starClassName="size-4" />
                <span className="sr-only">{review.rating} out of 5 stars</span>
                <time
                  dateTime={review.createdAt.slice(0, 10)}
                  className="text-[0.76rem] text-ink-faint tabular-nums"
                >
                  {formatReviewDate(review.createdAt)}
                </time>
              </p>
            </div>
          </header>
          {review.title && (
            <p className="mt-4 font-display text-[1.3rem] leading-snug">
              {review.title}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {paragraphs.map((part, i) => (
              <p key={i}>{part}</p>
            ))}
          </div>
          {/* {(review.verified || review.source) && (
            <p className="mt-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2 py-0.5 text-[0.7rem] font-semibold text-pine-700 ring-1 ring-pine-100">
                <Icon name="check" className="size-3" strokeWidth={3} />{" "}
                Verified buyer
              </span>
            </p>
          )} */}
        </div>
      </div>
    </div>,
    document.body,
  );
}
