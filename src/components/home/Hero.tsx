import { getImageProps } from "next/image";
import Link from "next/link";

import { Countdown } from "@/components/home/Countdown";
import { HeroVideo } from "@/components/home/HeroVideo";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";

/**
 * Full-viewport hero (100svh on every device — the small-viewport unit, so a
 * phone's collapsing URL bar never makes it jump). The fixed header sits
 * transparently on top of it.
 *
 * LCP: an art-directed <picture> (portrait crop on phones, landscape on
 * desktop) rendered on the server with fetchpriority="high" — no JS involved.
 * Set `site.hero.video` to layer an autoplaying muted video over it; the
 * picture stays as the poster and the LCP element.
 */
export function Hero() {
  const common = { alt: site.hero.alt, fill: true, priority: true, quality: 70 } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: site.hero.image, sizes: "100vw" });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: site.hero.imageMobile, sizes: "100vw" });

  const endsLabel = new Date(site.sale.endsAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex h-svh min-h-[580px] w-full flex-col overflow-hidden bg-pine-950 text-snow"
    >
      {/* Media */}
      <picture className="absolute inset-0 -z-20">
        <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
        <source media="(max-width: 767px)" srcSet={mobile} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in `rest` */}
        <img {...rest} className="ken-burns size-full object-cover object-[50%_40%]" />
      </picture>
      {site.hero.video && <HeroVideo src={site.hero.video} mobileSrc={site.hero.videoMobile} />}

      {/* Light: warm glow, vignette and a deep base so type always reads */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_20%,transparent_0%,rgb(7_20_14/0.35)_60%,rgb(7_20_14/0.8)_100%)]" />
      {/* Left-side shade where the headline sits, so type never fights the video. */}
      <div className="absolute inset-y-0 left-0 -z-10 w-full bg-linear-to-r from-pine-950/80 via-pine-950/35 to-transparent md:w-[70%]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[75%] bg-linear-to-t from-pine-950 via-pine-950/70 to-transparent" />
      <div className="absolute -top-1/4 right-[-10%] -z-10 size-[70vmax] rounded-full bg-gold-500/10 blur-3xl" />
      <div className="snow -z-10" aria-hidden="true" />

      {/* Rotating gift tag */}
      <div
        aria-hidden="true"
        className="rise rise-4 absolute top-[calc(var(--header-h)+1.25rem)] right-4 size-28 sm:right-8 sm:size-36 lg:top-[calc(var(--header-h)+3rem)] lg:right-14 lg:size-44"
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-slow">
          <defs>
            <path id="hero-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <text className="fill-gold-300 text-[17px] font-bold tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-sans)" }}>
            <textPath href="#hero-ring">Christmas sale ✦ Free gift wrap ✦ </textPath>
          </text>
        </svg>
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-berry-600 text-center shadow-[0_10px_40px_-8px_rgb(169_29_51/0.8)] ring-1 ring-gold-400/60">
          <span className="leading-none">
            <span className="block text-[0.5rem] font-bold tracking-[0.2em] uppercase sm:text-[0.6rem]">Up to</span>
            <span className="numeral block text-[1.6rem] sm:text-[2.1rem] lg:text-[2.5rem]">40%</span>
            <span className="block text-[0.5rem] font-bold tracking-[0.2em] uppercase sm:text-[0.6rem]">off</span>
          </span>
        </div>
      </div>

      {/* Copy */}
      <div className="container-page mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12 lg:pb-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="max-w-4xl">
            <p className="rise rise-1 inline-flex items-center gap-2 rounded-full bg-snow/10 px-3.5 py-1.5 text-[0.68rem] font-bold tracking-[0.22em] uppercase ring-1 ring-snow/20 backdrop-blur-md">
              <Icon name="sparkle" className="size-3.5 animate-twinkle text-gold-400" />
              The Christmas Gift Sale
            </p>
            <p className="script hero-script rise rise-1 mt-4 text-[2.6rem] text-gold-300 sm:text-[3.4rem] lg:text-[4.2rem]" aria-hidden="true">
              Merry &amp; bright
            </p>
            <h1 id="hero-title" className="display-xl hero-title rise rise-2 mt-1">
              Gifts worth <span className="italic text-gold-200">unwrapping.</span>
            </h1>
            <p className="rise rise-3 mt-5 max-w-xl text-[1.02rem] leading-relaxed text-snow/85 sm:text-[1.12rem]">
              {site.sale.headline} hand-picked Christmas gifts — free gift wrapping, a handwritten card and
              tracked delivery before the big day.
            </p>
            <div className="rise rise-4 mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="btn btn-gold shine">
                Shop the sale <Icon name="arrow-right" className="size-4" />
              </Link>
              <Link href="#gift-finder" className="btn btn-ghost-light hidden sm:inline-flex">
                Find a gift by budget
              </Link>
            </div>
          </div>

          <div className="rise rise-4">
            <p className="mb-2.5 text-[0.7rem] font-bold tracking-[0.2em] uppercase text-snow/75">
              Sale ends {endsLabel}
            </p>
            <Countdown endsAt={site.sale.endsAt} />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div aria-hidden="true" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="h-10 w-px overflow-hidden bg-snow/20">
          <span className="block h-1/2 w-full animate-[rise_1.6s_ease-in-out_infinite] bg-gold-400" />
        </span>
      </div>
    </section>
  );
}
