"use client";

import { useEffect, useState } from "react";

/**
 * Hero background video, mounted only when it is worth it: no reduced-motion
 * preference, no data-saver, and only after the page has loaded. Until then the
 * poster <picture> in <Hero> is all that renders — it is the LCP element, so
 * the video can never delay first paint. The portrait file is used below the
 * md breakpoint, the landscape one above it. The video fades in over the poster
 * once it is actually playing.
 */
export function HeroVideo({ src, mobileSrc }: { src: string; mobileSrc?: string | null }) {
  const [source, setSource] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const chosen = isDesktop ? src : (mobileSrc ?? src);
    const start = () => setSource(chosen);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [src, mobileSrc]);

  if (!source) return null;
  return (
    <video
      className={`absolute inset-0 -z-20 size-full object-cover object-[50%_40%] transition-opacity duration-1000 ${
        playing ? "opacity-100" : "opacity-0"
      }`}
      src={source}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
    />
  );
}
