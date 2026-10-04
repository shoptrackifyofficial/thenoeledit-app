"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { playMuted } from "@/lib/media/autoplay";
import { cn } from "@/lib/utils";

/**
 * "See it in action" — ported from the reference store: a full-bleed, auto-drifting rail
 * of portrait tiles. A native `overflow-x-auto` list (not a CSS transform
 * marquee), so it can also be dragged or flicked by hand; a rAF loop nudges
 * `scrollLeft` while idle and turns around at either end rather than
 * wrapping, so nothing here needs a duplicated list of cards.
 *
 * Every tile autoplays muted + looped, but only while it is actually on
 * screen (each card's own IntersectionObserver) — the row renders every card
 * up front, so an unconditional autoplay would start all 8 clips' network
 * load and decode at once.
 */

export type ShowcaseVideo = {
  src: string;
  poster?: string | null;
  alt: string;
  /** Leads the row below the `sm` breakpoint only (CSS order, DOM order unchanged). */
  mobileFirst?: boolean;
};

/** With only a few clips the row would not overflow a wide screen, so it could
    neither drift nor be dragged. The clips repeat until the row has at least
    this many tiles; repeats reuse the same cached file and still only play
    while on screen. */
const MIN_TILES = 8;

/** Drift speed, px/second. Slow enough to read a card as it goes past. */
const SPEED_PX_PER_S = 26;

/** px of travel before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD = 5;

export function ProductVideoShowcase({
  videos,
  className,
}: {
  videos: ShowcaseVideo[];
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [dragging, setDragging] = useState(false);

  /** Held in refs, not state: pausing is per-frame input to the drift loop and
      must not re-render the row every time a cursor crosses it. */
  const pausedRef = useRef(false);
  const dirRef = useRef<1 | -1>(1);
  const resumeTimer = useRef<number | null>(null);
  /**
   * Mouse drag only — touch and trackpad already pan an `overflow-x-auto`
   * list natively. Pointer capture is taken on movement, never on
   * `pointerdown`: capturing on the way down would retarget the click that
   * follows to this <ul>, silently swallowing a tap on the play area. A few
   * pixels of travel decide it — under the threshold the tap goes through,
   * over it the row takes the drag.
   */
  const dragRef = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);

  const pause = useCallback(() => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
    pausedRef.current = true;
  }, []);

  /** Pause, then pick the drift back up on its own — used after a drag, a
      wheel or the pointer leaving, where holding the pause forever would
      leave the row parked. */
  const pauseThenResume = useCallback((ms: number) => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    pausedRef.current = true;
    resumeTimer.current = window.setTimeout(() => {
      resumeTimer.current = null;
      pausedRef.current = false;
    }, ms);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (videos.length === 0 || !track) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    let frame = 0;
    let last: number | null = null;
    /** An off-screen row doesn't need to move — an idle rAF loop writing to a
        scroll container is exactly the kind of thing that shows up in a long
        task trace on a low-end phone. */
    let onScreen = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry!.isIntersecting;
      },
      { rootMargin: "240px" },
    );
    observer.observe(track);

    const tick = (nowMs: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = last === null ? 16 : Math.min(nowMs - last, 64);
      last = nowMs;
      if (pausedRef.current || !onScreen || document.hidden) return;

      const max = track.scrollWidth - track.clientWidth;
      if (max <= 8) return;

      let next = track.scrollLeft + dirRef.current * SPEED_PX_PER_S * (elapsed / 1000);
      if (next >= max) {
        next = max;
        dirRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        dirRef.current = 1;
      }
      track.scrollLeft = next;
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [videos.length]);

  if (videos.length === 0) return null;

  const tiles = Array.from({ length: Math.max(videos.length, Math.ceil(MIN_TILES / videos.length) * videos.length) }, (_, i) => ({
    video: videos[i % videos.length]!,
    repeat: i >= videos.length,
    /** Repeats start part-way through the clip so neighbouring tiles never show the same frame. */
    offset: ((Math.floor(i / videos.length) * 0.37) % 1),
    key: `${i}`,
  }));

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    if (!track || e.pointerType !== "mouse" || e.button !== 0) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    const drag = dragRef.current;
    if (!track || !drag || drag.id !== e.pointerId) return;

    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.moved = true;
      track.setPointerCapture(e.pointerId);
      setDragging(true);
      pause();
    }
    track.scrollLeft = drag.left - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    const drag = dragRef.current;
    if (!track || !drag || drag.id !== e.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) return;
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    setDragging(false);
    pauseThenResume(1600);
  };

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={trackRef}
        aria-label="Product videos"
        className={cn(
          "scrollbar-none flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-2 select-none sm:gap-4",
          dragging && "cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        onPointerEnter={pause}
        onPointerLeave={() => {
          if (!dragRef.current) pauseThenResume(400);
        }}
        onWheel={() => pauseThenResume(1600)}
        onFocus={pause}
        onBlur={() => pauseThenResume(400)}
      >
        {tiles.map(({ video, repeat, offset, key }) => (
          <li
            key={key}
            aria-hidden={repeat || undefined}
            className={cn(
              "h-88 w-64 shrink-0 sm:h-96 sm:w-72",
              video.mobileFirst && "-order-1 sm:order-none",
            )}
          >
            <VideoCard video={video} offset={offset} />
          </li>
        ))}
      </ul>

      {/* Edge fades say the row continues past what's visible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-paper to-transparent sm:w-12"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-paper to-transparent sm:w-12"
      />
    </div>
  );
}

function VideoCard({ video, offset = 0 }: { video: ShowcaseVideo; offset?: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Start a repeated clip part-way through (see `offset` in the row).
  useEffect(() => {
    const el = ref.current;
    if (!el || offset <= 0) return;
    const seek = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) el.currentTime = el.duration * offset;
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });
    return () => el.removeEventListener("loadedmetadata", seek);
  }, [offset]);

  // Play only while the card is actually visible — the row renders every
  // card up front (no virtualization), so an unconditional autoplay would
  // start every clip's decode/network load at once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    let stop: (() => void) | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry!.isIntersecting;
        stop?.();
        stop = null;
        if (visible) stop = playMuted(el, () => visible);
        else el.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      visible = false;
      stop?.();
      observer.disconnect();
    };
  }, []);

  return (
    <div className="img-skeleton-dark relative size-full overflow-hidden rounded-[1.4rem] shadow-lift ring-1 ring-line">
      <video
        ref={ref}
        className="size-full object-cover"
        poster={video.poster ?? undefined}
        preload="metadata"
        muted
        loop
        playsInline
        aria-label={video.alt}
      >
        {/* `#t=0.001` makes the browser paint a real first frame under
            preload="metadata" — with no poster, an unplayed card is otherwise
            just the black `bg-ink` backdrop. */}
        <source src={`${video.src}#t=0.001`} type="video/mp4" />
      </video>
    </div>
  );
}
