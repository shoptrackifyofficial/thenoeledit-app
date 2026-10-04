import { getImageProps } from "next/image";
import Link from "next/link";

import { Countdown } from "@/components/home/Countdown";
import { HeroVideo } from "@/components/home/HeroVideo";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";

/**
 * Full-bleed hero, exactly one screen tall (100svh — the small-viewport unit,
 * so a phone's collapsing URL bar never makes it jump). The home header sits
 * transparently on top, so nav and hero read as one surface. Content is
 * centred on both axes.
 *
 * LCP: an art-directed <picture> (portrait crop on phones, landscape on
 * desktop) rendered on the server with fetchpriority="high" — no JS involved.
 * `site.hero.video` layers an autoplaying muted video over it after load.
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
      className="relative isolate flex h-svh w-full items-center justify-center overflow-hidden bg-pine-950 text-snow"
    >
      {/* Media */}
      <picture className="absolute inset-0 -z-20">
        <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
        <source media="(max-width: 767px)" srcSet={mobile} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in `rest` */}
        <img {...rest} className="ken-burns size-full object-cover object-[50%_45%]" />
      </picture>
      {site.hero.video && <HeroVideo src={site.hero.video} mobileSrc={site.hero.videoMobile} />}

      {/* Shade: an even veil + a centre glow so centred type always reads */}
      <div className="absolute inset-0 -z-10 bg-pine-950/45" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_52%,rgb(10_29_21/0.55),transparent_75%)] lg:bg-[radial-gradient(55%_75%_at_22%_55%,rgb(10_29_21/0.7),transparent_75%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-pine-950/80 to-transparent" />
      <div className="snow -z-10 opacity-70" aria-hidden="true" />

      {/* Content — vertically centred everywhere; centred horizontally on
          phones, left-aligned on desktop. Clears the header on top. */}
      <div className="container-page flex flex-col items-center pt-[calc(var(--header-h)+1.5rem)] pb-10 text-center lg:items-start lg:text-left">
        <p className="rise rise-1 inline-flex items-center gap-2 rounded-full bg-white/12 py-1 pr-3.5 pl-1 text-[0.72rem] font-semibold ring-1 ring-white/25 backdrop-blur-md">
          <span className="rounded-full bg-berry-600 px-2 py-0.5 text-[0.64rem] font-bold tracking-wide uppercase">Sale</span>
          The Christmas Gift Edit
        </p>

        <h1 id="hero-title" className="display-xl hero-title rise rise-2 mt-4">
          Gifts worth <span className="accent block text-gold-300">unwrapping.</span>
        </h1>

        <p className="rise rise-3 mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/80 sm:max-w-lg sm:text-[1.05rem] [@media(max-height:740px)]:hidden">
          {site.sale.headline} hand-picked Christmas gifts — free shipping on every order and tracked
          delivery that lands before the big day.
        </p>

        <div className="rise rise-4 mt-6 flex w-full flex-col items-center justify-center gap-2.5 min-[420px]:w-auto min-[420px]:flex-row lg:justify-start">
          <Link href="/shop" className="btn btn-light shine w-full max-w-xs min-[420px]:w-auto">
            Shop the sale <Icon name="arrow-right" className="size-4" />
          </Link>
          <Link href="#gift-finder" className="btn btn-ghost-light w-full max-w-xs min-[420px]:w-auto">
            <Icon name="gift" className="size-4" /> Gifts by budget
          </Link>
        </div>

        <div className="rise rise-4 mt-6 flex flex-col items-center lg:mt-8 lg:items-start">
          <p className="mb-2 flex items-center gap-2 text-[0.64rem] font-bold tracking-[0.18em] text-white/75 uppercase">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-berry-500" />
              <span className="relative size-2 rounded-full bg-berry-500" />
            </span>
            Sale ends {endsLabel}
          </p>
          <Countdown endsAt={site.sale.endsAt} size="md" />
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#cat-title"
        aria-label="Scroll to shop by category"
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/70 transition-colors hover:text-white sm:flex [@media(max-height:760px)]:hidden"
      >
        <Icon name="snowflake" className="size-4 animate-[spin_8s_linear_infinite]" />
        <span className="h-8 w-px overflow-hidden bg-white/25">
          <span className="block h-1/2 w-full animate-[rise_1.6s_ease-in-out_infinite] bg-gold-300" />
        </span>
      </a>
    </section>
  );
}
