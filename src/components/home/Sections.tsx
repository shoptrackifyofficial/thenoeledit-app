import Image from "next/image";
import Link from "next/link";

import { GiftTiers } from "@/components/home/GiftTiers";
import { DragScroll } from "@/components/ui/DragScroll";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ProductCard } from "@/components/product/ProductCard";
import { site } from "@/content/site";
import type { CategoryInfo } from "@/lib/catalog";
import type { CardView } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

/* ── Shared heading ───────────────────────────────────────────────────── */

export function SectionHeading({
  kicker,
  title,
  intro,
  id,
  align = "left",
  tone = "dark",
  action,
  stack = false,
}: {
  stack?: boolean;
  kicker?: string;
  title: React.ReactNode;
  intro?: string;
  id: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  action?: { href: string; label: string };
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 text-center",
        align === "left" && !stack && "sm:flex-row sm:items-end sm:justify-between sm:text-left",
        align === "left" && stack && "lg:items-start lg:text-left",
      )}
    >
      <div className={cn("flex max-w-2xl flex-col items-center", align === "center" ? "mx-auto" : stack ? "lg:items-start" : "sm:items-start")}>
        {kicker && <p className={cn("kicker mb-3", tone === "light" && "text-gold-300")}>{kicker}</p>}
        <h2 id={id} className="display-lg">
          {title}
        </h2>
        {intro && (
          <p className={cn("mt-3 max-w-xl text-[0.95rem] sm:text-[0.98rem]", align === "center" && "mx-auto", tone === "dark" ? "text-ink-soft" : "text-white/70")}>
            {intro}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn("btn btn-sm shrink-0", tone === "dark" ? "btn-outline" : "btn-ghost-light")}
        >
          {action.label}
          <Icon name="arrow-right" className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/** Heading text with the soft italic accent word. */
export function Accent({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <span className={cn("accent", light ? "text-gold-300" : "text-berry-600")}>{children}</span>;
}

/* ── Satin ribbon marquee ─────────────────────────────────────────────── */

const ribbon = [
  "Up to 65% off",
  "Free shipping on every order",
  "Tracked delivery",
  "Order early, stress-free",
  `Arrives in ${site.delivery.minDays}–${site.delivery.maxDays} working days`,
  "Secure Shopify checkout",
];

export function RibbonMarquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ribbon.map((t) => (
        <li key={t} className="flex items-center gap-5 pr-5 whitespace-nowrap">
          <span className="font-display text-[1.02rem] italic sm:text-[1.15rem]">{t}</span>
          <Icon name="sparkle" className="size-3.5 text-gold-300" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-10 -my-1 overflow-hidden py-6 sm:py-8">
      <div className="-mx-4 -rotate-[1.4deg] bg-linear-to-r from-berry-700 via-berry-600 to-berry-700 py-2.5 text-snow shadow-ribbon ring-1 ring-gold-400/40">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}

/* ── Shop by category: ornaments on a garland ─────────────────────────── */

const STRING = ["h-3", "h-8", "h-5"];

export function CategoryOrnaments({ categories }: { categories: CategoryInfo[] }) {
  return (
    <section aria-labelledby="cat-title" className="scroll-mt-24 pt-4 pb-10 lg:pt-8 lg:pb-14">
      <div className="container-page">
        <SectionHeading
          id="cat-title"
          kicker="For everyone on your list"
          title={
            <>
              Shop by who <Accent>you&apos;re gifting</Accent>
            </>
          }
          align="center"
        />
      </div>
      {/* Each ornament carries its own swag of garland, so the line scrolls
          with the rail and joins seamlessly at every berry. */}
      <DragScroll
        label="Gift categories"
        centerOnDesktop
        className="mt-7 lg:justify-center-safe px-[max(1rem,calc((100vw-1320px)/2+2rem))] pb-3 [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]"
      >
        {categories.map((c, i) => (
          <li key={c.slug} className="relative w-[7.5rem] shrink-0 snap-start sm:w-40 lg:w-44">
            <svg
              aria-hidden="true"
              viewBox="0 0 100 28"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 top-0 h-7 w-full text-gold-500"
            >
              <path d="M0 3 Q 50 26 100 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d="M0 3 Q 50 26 100 3" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            {/* holly berries where two swags meet */}
            <span aria-hidden="true" className="absolute top-0 left-0 z-10 flex -translate-x-1/2 -translate-y-px gap-px">
              <span className="size-2 rounded-full bg-berry-600 ring-1 ring-paper" />
              <span className="mt-1 size-1.5 rounded-full bg-berry-500 ring-1 ring-paper" />
            </span>
            {i === categories.length - 1 && (
              <span aria-hidden="true" className="absolute top-0 right-0 z-10 flex translate-x-1/2 -translate-y-px gap-px">
                <span className="size-2 rounded-full bg-berry-600 ring-1 ring-paper" />
                <span className="mt-1 size-1.5 rounded-full bg-berry-500 ring-1 ring-paper" />
              </span>
            )}

            <Link
              href={`/shop/${c.slug}`}
              draggable={false}
              className="group flex flex-col items-center pt-[0.85rem] text-center outline-none"
            >
              <span aria-hidden="true" className={cn("w-px bg-linear-to-b from-gold-400 to-gold-600", STRING[i % 3])} />
              <span className="ornament relative mt-3 block">
                {/* cap + loop */}
                <span aria-hidden="true" className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                  <span className="mx-auto block size-2.5 rounded-full border-2 border-gold-500" />
                  <span className="-mt-0.5 block h-3 w-7 rounded-t-[0.3rem] rounded-b-sm bg-linear-to-b from-gold-300 via-gold-500 to-gold-700 shadow-sm" />
                </span>
                <span className="img-skeleton relative block size-[6.25rem] overflow-hidden rounded-full shadow-lift ring-[3px] ring-surface transition-shadow duration-500 group-hover:shadow-glow sm:size-32 lg:size-36">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 144px, 110px"
                    className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-110"
                  />
                  <span className="bauble-gloss absolute inset-0" aria-hidden="true" />
                </span>
              </span>
              <span className="mt-3 block px-1 font-display text-[1rem] leading-tight transition-colors group-hover:text-berry-600 sm:text-[1.12rem]">
                {c.title}
              </span>
              <span className="mt-0.5 block text-[0.7rem] text-ink-faint">{c.count} {c.count === 1 ? "gift" : "gifts"}</span>
            </Link>
          </li>
        ))}
      </DragScroll>
    </section>
  );
}

/* ── 12 Days of Deals: advent doors ───────────────────────────────────── */

const DOOR_TONES = [
  { door: "bg-berry-600", num: "text-gold-200", line: "border-gold-300/40" },
  { door: "bg-pine-700", num: "text-gold-300", line: "border-gold-300/35" },
  { door: "bg-cream", num: "text-berry-600", line: "border-berry-600/25" },
];

export function AdventDeals({ cards }: { cards: CardView[] }) {
  const doors = cards.slice(0, 12);
  if (doors.length < 4) return null;
  return (
    <section aria-labelledby="advent-title" className="px-2 sm:px-4">
      <div
        className="grain relative mx-auto max-w-[1600px] overflow-hidden rounded-[1.75rem] bg-pine-900 py-12 text-snow sm:rounded-[2.25rem] lg:py-16"
      >
        <div className="snow opacity-35" aria-hidden="true" />
        <div aria-hidden="true" className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative container-page">
          <SectionHeading
            id="advent-title"
            tone="light"
            kicker="Behind every door"
            title={
              <>
                The 12 Days <Accent light>of Deals</Accent>
              </>
            }
            intro="Our deepest Christmas discounts, hidden in an advent calendar. Hover — or scroll on your phone — to open each door."
            action={{ href: "/shop?sort=discount", label: "Every deal" }}
          />
          <ol className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {doors.map((p, i) => {
              const tone = DOOR_TONES[i % 3]!;
              return (
                <li key={p.handle} className="advent-cell relative aspect-[3/4]">
                  <Link
                    href={p.href}
                    className="img-skeleton-dark group absolute inset-0 overflow-hidden rounded-2xl ring-1 ring-white/10"
                    aria-label={`Day ${i + 1}: ${p.name}${p.percentOff ? `, ${p.percentOff}% off` : ""}`}
                  >
                    {/* Behind the door */}
                    {p.image && (
                      <Image
                        src={p.image.url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 15vw, 32vw"
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute inset-0 bg-linear-to-t from-pine-950/95 via-pine-950/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                      {p.percentOff != null && (
                        <span className="inline-block rounded-full bg-berry-600 px-2 py-0.5 text-[0.68rem] font-bold sm:text-[0.78rem]">
                          −{p.percentOff}%
                        </span>
                      )}
                      <span className="mt-1 line-clamp-2 block text-[0.68rem] leading-tight font-semibold sm:text-[0.8rem]">
                        {p.name}
                      </span>
                    </span>

                    {/* The door */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "advent-door absolute inset-0 flex flex-col items-center justify-center rounded-2xl shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]",
                        tone.door,
                      )}
                    >
                      <span className={cn("absolute inset-2 rounded-xl border border-dashed sm:inset-2.5", tone.line)} />
                      <span className={cn("numeral text-[2.2rem] leading-none sm:text-[3rem]", tone.num)}>{i + 1}</span>
                      <span className={cn("mt-1 text-[0.5rem] font-bold tracking-[0.3em] uppercase opacity-70 sm:text-[0.58rem]", tone.num)}>
                        Dec
                      </span>
                      {/* little bow on top */}
                      <Icon name="sparkle" className={cn("absolute top-3 size-3 opacity-70 sm:size-3.5", tone.num)} />
                      <span className="absolute top-1/2 right-2 size-1.5 rounded-full bg-gold-400 shadow-[0_0_6px_rgb(220_190_132/0.9)] sm:right-2.5 sm:size-2" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── Product rail / grid ──────────────────────────────────────────────── */

export function ProductGridSection({
  id,
  kicker,
  title,
  intro,
  cards,
  action,
  className,
}: {
  id: string;
  kicker?: string;
  title: React.ReactNode;
  intro?: string;
  cards: CardView[];
  action?: { href: string; label: string };
  className?: string;
}) {
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby={id} className={cn("section-y", className)}>
      <div className="container-page">
        <SectionHeading id={id} kicker={kicker} title={title} intro={intro} action={action} />
        <ul className="reveal-stagger mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:mt-9 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10">
          {cards.map((c) => (
            <li key={c.handle}>
              <ProductCard card={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Gift finder by budget: hanging gift tags ─────────────────────────── */

export function GiftFinder({ cards }: { cards: CardView[] }) {
  return (
    <section id="gift-finder" aria-labelledby="finder-title" className="section-y scroll-mt-24">
      <div className="container-page">
        <SectionHeading
          id="finder-title"
          kicker="On any budget"
          title={
            <>
              Find the gift <Accent>by price</Accent>
            </>
          }
          intro="Every price is already discounted — and shipping is free on every order."
          align="center"
        />
        <GiftTiers cards={cards} />
      </div>
    </section>
  );
}

/* ── Made for giving ────────────────────────────────────────────────── */

export function WrappedStory() {
  return (
    <section aria-labelledby="wrap-title" className="section-y overflow-hidden bg-cream">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div className="reveal relative mx-auto w-full max-w-[440px]">
          <div className="img-skeleton relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[2rem] shadow-lift ring-[6px] ring-surface">
            <Image
              src="https://images.unsplash.com/photo-1607344645866-009c320b63e0?fit=crop&crop=entropy&ar=4:5"
              alt="Gifts tied with gold satin ribbon"
              fill
              sizes="(min-width: 1024px) 36vw, 90vw"
              className="object-cover"
            />
          </div>
          {/* Gift tag */}
          <div className="absolute -bottom-5 -left-1 w-[58%] max-w-[230px] animate-float rounded-[0.6rem_1.4rem_1.4rem_0.6rem] bg-surface p-4 shadow-lift ring-1 ring-line [--r:-6deg] sm:-left-8">
            <span className="absolute top-1/2 left-3 size-2.5 -translate-y-1/2 rounded-full bg-cream ring-1 ring-line" aria-hidden="true" />
            <div className="pl-4">
              <p className="text-[0.6rem] font-bold tracking-[0.2em] text-ink-faint uppercase">To</p>
              <p className="accent text-[1.35rem] leading-tight text-berry-600">someone special</p>
              <p className="mt-1 text-[0.6rem] font-bold tracking-[0.2em] text-ink-faint uppercase">From</p>
              <p className="accent text-[1.2rem] leading-tight">you, with love</p>
            </div>
          </div>
          <span className="absolute -top-3 right-0 grid size-[4.5rem] place-items-center rounded-full bg-snow p-1 shadow-lift sm:size-24" aria-hidden="true">
            <Image src="/logo-200.webp" alt="" width={200} height={200} sizes="96px" className="size-full animate-[spin_30s_linear_infinite]" />
          </span>
        </div>

        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="kicker mb-3">Made for giving</p>
          <h2 id="wrap-title" className="display-lg">
            Every gift arrives <Accent>ready to give.</Accent>
          </h2>
          <p className="mt-4 max-w-lg text-[0.98rem] text-ink-soft">
            Send it straight to them, or to you to tuck under the tree. Every order ships tracked and ships free,
            with no minimum spend.
          </p>
          <ul className="mt-7 grid w-full gap-2.5 text-left sm:grid-cols-2">
            {site.promises.map((p) => (
              <li key={p.title} className="flex gap-3.5 rounded-2xl bg-surface p-3.5 shadow-soft ring-1 ring-line/70">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-berry-50 text-berry-600">
                  <Icon name={p.icon} className="size-[1.1rem]" />
                </span>
                <span>
                  <span className="block text-[0.9rem] font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-soft">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/shop" className="btn btn-primary shine mt-8">
            Start your list <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Stress-free Christmas steps ──────────────────────────────────────── */

export function DeliveryTimeline() {
  const steps: { icon: IconName; title: string; note: string; final?: boolean }[] = [
    { icon: "bag", title: "Order now", note: "Pick gifts at sale prices while stock is full." },
    { icon: "gift", title: "We pack it", note: "Checked, packed and sent with tracking." },
    { icon: "truck", title: "Tracked delivery", note: `Arrives in ${site.delivery.minDays}–${site.delivery.maxDays} working days.` },
    { icon: "sparkle", title: "Relax & unwrap", note: "Christmas morning, no last-minute rush.", final: true },
  ];

  return (
    <section aria-labelledby="delivery-title" className="section-y">
      <div className="container-page">
        <SectionHeading
          id="delivery-title"
          kicker="Beat the rush"
          title={
            <>
              A calm Christmas, <Accent>sorted early</Accent>
            </>
          }
          intro="Buy now and your gifts are packed, tracked and waiting well before the big day — no stress, no scramble."
          action={{ href: "/pages/shipping", label: "Delivery details" }}
          align="center"
        />
        <ol className="dots relative mt-8 grid gap-3 rounded-[1.75rem] bg-surface p-4 shadow-soft ring-1 ring-line sm:p-6 md:grid-cols-4 md:gap-4 md:p-8">
          <span
            className="absolute top-[3.75rem] right-[14%] left-[14%] hidden border-t-2 border-dashed border-berry-200 md:block"
            aria-hidden="true"
          />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex items-center gap-4 rounded-2xl p-2 md:flex-col md:gap-3 md:text-center">
              <span
                className={cn(
                  "relative grid size-[3.75rem] shrink-0 place-items-center rounded-full",
                  s.final ? "bg-berry-600 text-snow shadow-ribbon" : "bg-surface text-berry-600 shadow-soft ring-1 ring-line",
                )}
              >
                <Icon name={s.icon} className="size-6" strokeWidth={1.5} />
                <span className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-gold-500 text-[0.62rem] font-bold text-pine-950 tabular-nums">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-display text-[1.2rem] leading-tight">{s.title}</span>
                <span className="block text-[0.8rem] text-ink-soft">{s.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */

export function FaqList({ faqs, className }: { faqs: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      {faqs.map((f) => (
        <details
          key={f.q}
          className="group rounded-2xl bg-surface px-4 ring-1 ring-line transition-shadow open:shadow-soft sm:px-5"
        >
          <summary className="flex items-center justify-between gap-5 py-3.5">
            <h3 className="text-[0.95rem] leading-snug font-semibold">{f.q}</h3>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-berry-600 group-open:text-snow">
              <Icon name="plus" className="size-3.5" />
            </span>
          </summary>
          <p className="max-w-3xl pb-4 text-[0.9rem] text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
