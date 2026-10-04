"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Slide } from "yet-another-react-lightbox";

import { Icon } from "@/components/ui/Icon";
import type { ViewMedia, ViewVideo } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

const GalleryLightbox = dynamic(() => import("@/components/product/GalleryLightbox"), { ssr: false });

/** Horizontal travel before a touch gesture counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 40;

/**
 * PDP gallery (ported from the reference store's section 1):
 *
 *  - Sticky stage with a vertical thumbnail rail on its left from lg up, and
 *    a horizontal rail beneath it on phones.
 *  - The stage is a native scroll-snapped track (scrollTo + snap-x), so the
 *    browser's compositor drives every transition — never a blank slide.
 *  - Touch is tracked so one flick moves exactly one slide, like a native app.
 *  - Slide 1 is server-rendered with priority + fetchpriority=high — the LCP
 *    image never waits for JS. Other slides show a spinner until painted.
 *  - Choosing a variant in the purchase panel (`ne:variant` event) brings its
 *    photo to the stage. Click an image to open the zoomable lightbox.
 */
export function ProductGallery({ media, productName }: { media: ViewMedia[]; productName: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const thumbsRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const count = media.length;

  const markLoaded = useCallback(
    (i: number) => setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i))),
    [],
  );

  const slides: Slide[] = useMemo(
    () =>
      media.map((m) =>
        m.type === "image"
          ? { src: m.url, alt: m.alt, width: m.width, height: m.height }
          : {
              type: "video" as const,
              poster: m.poster,
              width: m.width,
              height: m.height,
              sources: m.sources.map((s) => ({ src: s.src, type: s.type })),
            },
      ),
    [media],
  );

  const goTo = useCallback(
    (index: number, smooth = true) => {
      const track = trackRef.current;
      if (!track) return;
      const i = Math.max(0, Math.min(count - 1, index));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduce ? "smooth" : "auto" });
      setActive(i);
    },
    [count],
  );

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (index !== active) setActive(index);
  };

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t || count < 2) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragging.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!dragging.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) dragging.current = true;
    if (dragging.current) e.preventDefault();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t || !dragging.current) return;
    dragging.current = false;
    const dx = t.clientX - start.x;
    if (dx <= -SWIPE_THRESHOLD) goTo(active + 1);
    else if (dx >= SWIPE_THRESHOLD) goTo(active - 1);
  };

  // Keep the active thumbnail in view — scroll the rail only, never the page.
  useEffect(() => {
    const rail = thumbsRef.current;
    const thumb = rail?.children[active] as HTMLElement | undefined;
    if (!rail || !thumb) return;
    const r = rail.getBoundingClientRect();
    const b = thumb.getBoundingClientRect();
    if (rail.scrollHeight > rail.clientHeight + 1) {
      if (b.top < r.top) rail.scrollBy({ top: b.top - r.top - 8, behavior: "smooth" });
      else if (b.bottom > r.bottom) rail.scrollBy({ top: b.bottom - r.bottom + 8, behavior: "smooth" });
    } else if (b.left < r.left) rail.scrollBy({ left: b.left - r.left - 8, behavior: "smooth" });
    else if (b.right > r.right) rail.scrollBy({ left: b.right - r.right + 8, behavior: "smooth" });
  }, [active]);

  // Variant chosen in the purchase panel → show its photo.
  useEffect(() => {
    const onVariant = (e: Event) => {
      const id = (e as CustomEvent<{ variantId: string }>).detail?.variantId;
      const index = media.findIndex((m) => m.type === "image" && m.variantId === id);
      if (index >= 0) goTo(index);
    };
    window.addEventListener("ne:variant", onVariant);
    return () => window.removeEventListener("ne:variant", onVariant);
  }, [media, goTo]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${productName} images`}
      className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+(100svh-var(--header-h)-var(--gallery-h))/2)] lg:self-start"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") goTo(active + 1);
        if (e.key === "ArrowLeft") goTo(active - 1);
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
        <div className="relative min-w-0 flex-1">
          <ul
            ref={trackRef}
            onScroll={onScroll}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="scrollbar-none flex snap-x snap-mandatory touch-pan-y overflow-x-auto overscroll-x-contain rounded-[1.75rem] shadow-soft ring-1 ring-line/60 [&::-webkit-scrollbar]:hidden"
            aria-live="polite"
          >
            {media.map((item, i) => (
              <li
                key={i}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== active}
                className="w-full shrink-0 snap-center"
              >
                {item.type === "image" ? (
                  <button
                    type="button"
                    onClick={() => setZoomAt(i)}
                    aria-label={`Zoom image ${i + 1}`}
                    tabIndex={i === active ? 0 : -1}
                    className="img-skeleton relative block aspect-square w-full cursor-zoom-in overflow-hidden lg:aspect-auto lg:h-(--gallery-h)"
                  >
                    <Image
                      src={item.url}
                      alt={item.alt}
                      fill
                      priority={i === 0}
                      fetchPriority={i === 0 ? "high" : undefined}
                      loading={i === 0 ? undefined : "lazy"}
                      sizes="(min-width: 1024px) 52vw, 100vw"
                      className={cn("object-cover transition-opacity duration-300", !loaded.has(i) && "opacity-0")}
                      onLoad={() => markLoaded(i)}
                    />
                    {!loaded.has(i) && (
                      <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                        <Icon name="spinner" className="size-8 animate-spin text-ink-faint" />
                      </span>
                    )}
                  </button>
                ) : (
                  <VideoSlide video={item} active={i === active} />
                )}
              </li>
            ))}
          </ul>

          {count > 1 && (
            <>
              <div className="glass pointer-events-none absolute bottom-3.5 left-3.5 rounded-[10px] px-3 py-1.5 sm:bottom-4 sm:left-4 text-[0.78rem] tabular-nums">
                {active + 1} / {count}
              </div>
              <div className="absolute right-4 bottom-4 hidden gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0}
                  className="glass grid size-11 place-items-center rounded-full transition-opacity disabled:opacity-40"
                  aria-label="Previous image"
                >
                  <Icon name="arrow-left" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(active + 1)}
                  disabled={active === count - 1}
                  className="glass grid size-11 place-items-center rounded-full transition-opacity disabled:opacity-40"
                  aria-label="Next image"
                >
                  <Icon name="arrow-right" className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {count > 1 && (
          <ul
            ref={thumbsRef}
            className="scrollbar-none flex w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain p-0.5 [&::-webkit-scrollbar]:hidden lg:max-h-(--gallery-h) lg:w-22 lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
            aria-label="Choose image"
          >
            {media.map((item, i) => (
              <li key={i} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show ${item.type === "video" ? "video" : "image"} ${i + 1}: ${item.alt}`}
                  aria-current={i === active}
                  className={cn(
                    "img-skeleton relative block size-19 overflow-hidden rounded-[14px] transition-[box-shadow,opacity] duration-300 md:size-22",
                    i === active
                      ? "shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <Image
                    src={item.type === "image" ? item.url : item.poster}
                    alt=""
                    fill
                    sizes="88px"
                    className="-z-0 object-cover"
                  />
                  {i === active && <span className="absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--color-ink)]" />}
                  {item.type === "video" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="glass grid size-7 place-items-center rounded-full">
                        <Icon name="play" className="size-3 translate-x-px" />
                      </span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {zoomAt !== null && (
        <GalleryLightbox
          slides={slides}
          index={zoomAt}
          onClose={(i) => {
            setZoomAt(null);
            goTo(i, false);
          }}
        />
      )}
    </section>
  );
}

/** Click-to-play video: only the poster loads until asked, so video never competes with LCP. */
function VideoSlide({ video, active }: { video: ViewVideo; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!active) ref.current?.pause();
  }, [active]);
  const src = video.sources.find((s) => (s.width ?? 0) >= 720) ?? video.sources[video.sources.length - 1];
  return (
    <div className="img-skeleton-dark relative aspect-square overflow-hidden lg:aspect-auto lg:h-(--gallery-h)">
      <video
        ref={ref}
        className="absolute inset-0 size-full object-contain"
        poster={video.poster ? `${video.poster}${video.poster.includes("?") ? "&" : "?"}width=900` : undefined}
        preload="none"
        playsInline
        controls={playing}
        aria-label={video.alt}
        onPlay={() => setPlaying(true)}
      >
        {src && <source src={src.src} type={src.type} />}
      </video>
      {!playing && (
        <button
          type="button"
          onClick={() => void ref.current?.play()}
          className="group absolute inset-0 grid place-items-center"
          aria-label={`Play video: ${video.alt}`}
        >
          <span className="glass grid size-18 place-items-center rounded-full text-ink transition-transform group-hover:scale-105">
            <Icon name="play" className="size-6 translate-x-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}
