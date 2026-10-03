import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { ProductCard } from "@/components/product/ProductCard";
import { site } from "@/content/site";
import type { CategoryInfo } from "@/lib/catalog";
import type { CardView } from "@/lib/commerce/product-view";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/* ── Shared heading ───────────────────────────────────────────────────── */

export function SectionHeading({
  script,
  title,
  intro,
  id,
  align = "left",
  tone = "dark",
  action,
}: {
  script?: string;
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
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {script && (
          <p className={cn("script text-[2.3rem] sm:text-[2.8rem]", tone === "dark" ? "text-berry-600" : "text-gold-300")} aria-hidden="true">
            {script}
          </p>
        )}
        <h2 id={id} className={cn("display-lg", script && "-mt-1")}>
          {title}
        </h2>
        {intro && (
          <p className={cn("mt-4 text-[1.02rem]", tone === "dark" ? "text-ink-soft" : "text-snow/75")}>{intro}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "group/link inline-flex shrink-0 items-center gap-2 text-[0.78rem] font-bold tracking-[0.16em] uppercase",
            tone === "light" && "text-gold-300",
          )}
        >
          <span className="link-underline">{action.label}</span>
          <Icon name="arrow-right" className="size-4 transition-transform group-hover/link:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/* ── Ribbon marquee ───────────────────────────────────────────────────── */

const ribbon = [
  "Up to 40% off",
  "Free gift wrapping",
  "Handwritten gift cards",
  "Delivered before Christmas",
  "Returns until January 31",
  "Secure Shopify checkout",
];

export function RibbonMarquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ribbon.map((t) => (
        <li key={t} className="flex items-center gap-6 pr-6 whitespace-nowrap">
          <span className="font-display text-[1.15rem] italic sm:text-[1.35rem]">{t}</span>
          <Icon name="sparkle" className="size-4 text-gold-400" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative overflow-hidden bg-berry-700 py-4 text-snow">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

/* ── Shop by category: advent arches ──────────────────────────────────── */

export function CategoryArches({ categories }: { categories: CategoryInfo[] }) {
  return (
    <section aria-labelledby="cat-title" className="py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          id="cat-title"
          script="for everyone"
          title="Shop by who you're gifting"
          action={{ href: "/shop", label: "All categories" }}
        />
      </div>
      <ul className="scrollbar-none container-page mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible">
        {categories.map((c, i) => (
          <li key={c.slug} className="reveal w-[62vw] max-w-[260px] shrink-0 snap-start sm:w-[38vw] lg:w-auto lg:max-w-none">
            <Link href={`/shop/${c.slug}`} className="group block">
              <span className="relative block aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[1.4rem] bg-cream ring-1 ring-line transition-shadow duration-500 group-hover:shadow-glow">
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 15vw, 62vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-linear-to-t from-pine-950/60 via-transparent to-transparent" />
                <span className="numeral absolute top-[18%] left-1/2 -translate-x-1/2 text-[0.8rem] text-snow/90">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="absolute inset-x-0 bottom-0 p-4 text-snow">
                  <span className="block font-display text-[1.5rem] leading-none">{c.title}</span>
                  <span className="mt-1 block text-[0.75rem] text-snow/80">{c.count} gifts</span>
                </span>
              </span>
              <span className="mt-3 block px-1 text-[0.82rem] text-ink-soft">{c.kicker}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 12 Days of Deals: advent doors ───────────────────────────────────── */

export function AdventDeals({ cards }: { cards: CardView[] }) {
  const doors = cards.slice(0, 12);
  if (doors.length < 4) return null;
  return (
    <section aria-labelledby="advent-title" className="grain relative overflow-hidden bg-pine-900 py-16 text-snow lg:py-24">
      <div className="snow opacity-40" aria-hidden="true" />
      <div className="relative container-page">
        <SectionHeading
          id="advent-title"
          tone="light"
          script="behind every door"
          title={
            <>
              The 12 Days <span className="italic text-gold-300">of Deals</span>
            </>
          }
          intro="Our deepest Christmas discounts, hidden in an advent calendar. Hover — or scroll on your phone — to open each door."
          action={{ href: "/shop?sort=discount", label: "Every deal" }}
        />
        <ol className="mt-10 grid grid-cols-3 gap-2.5 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {doors.map((p, i) => (
            <li key={p.handle} className="advent-cell relative aspect-[3/4]">
              <Link
                href={p.href}
                className="group absolute inset-0 overflow-hidden rounded-xl bg-pine-950 ring-1 ring-gold-500/30 sm:rounded-2xl"
                aria-label={`Day ${i + 1}: ${p.name}${p.percentOff ? `, ${p.percentOff}% off` : ""}, now ${formatMoney(p.price, p.currency)}`}
              >
                {/* Behind the door */}
                {p.image && (
                  <Image src={p.image.url} alt="" fill sizes="(min-width: 1024px) 15vw, 32vw" className="object-cover" />
                )}
                <span className="absolute inset-0 bg-linear-to-t from-pine-950/95 via-pine-950/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                  {p.percentOff != null && (
                    <span className="numeral inline-block rounded-md bg-berry-600 px-1.5 py-0.5 text-[0.75rem] sm:text-[0.9rem]">
                      −{p.percentOff}%
                    </span>
                  )}
                  <span className="mt-1 line-clamp-2 block text-[0.7rem] leading-tight font-semibold sm:text-[0.82rem]">
                    {p.name}
                  </span>
                </span>

                {/* The door */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "advent-door absolute inset-0 flex flex-col items-center justify-center rounded-xl shadow-[inset_0_0_0_1px_rgb(198_161_91/0.45),inset_0_0_0_6px_rgb(0_0_0/0.12)] sm:rounded-2xl",
                    i % 3 === 0 ? "bg-berry-700" : i % 3 === 1 ? "bg-pine-700" : "bg-[#5a1220]",
                  )}
                >
                  <span className="absolute inset-2 rounded-lg border border-dashed border-gold-400/35 sm:inset-3" />
                  <Icon name="sparkle" className="size-4 text-gold-400/80 sm:size-5" />
                  <span className="numeral mt-1 text-[2.3rem] leading-none text-gold-300 sm:text-[3.4rem]">{i + 1}</span>
                  <span className="mt-1 text-[0.5rem] font-bold tracking-[0.3em] text-gold-300/70 uppercase sm:text-[0.6rem]">
                    Dec
                  </span>
                  <span className="absolute top-1/2 right-2 size-1.5 rounded-full bg-gold-400 shadow-[0_0_6px_rgb(217_189_132/0.9)] sm:right-3 sm:size-2" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Product rail / grid ──────────────────────────────────────────────── */

export function ProductGridSection({
  id,
  script,
  title,
  intro,
  cards,
  action,
}: {
  id: string;
  script?: string;
  title: React.ReactNode;
  intro?: string;
  cards: CardView[];
  action?: { href: string; label: string };
}) {
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby={id} className="py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading id={id} script={script} title={title} intro={intro} action={action} />
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
          {cards.map((c) => (
            <li key={c.handle} className="reveal">
              <ProductCard card={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Gift finder by budget ────────────────────────────────────────────── */

export function GiftFinder({ cards }: { cards: CardView[] }) {
  const currency = cards[0]?.currency ?? "USD";
  const tiers = [
    { max: 25, label: "Under", tone: "bg-gold-100", accent: "text-gold-700" },
    { max: 50, label: "Under", tone: "bg-berry-100", accent: "text-berry-600" },
    { max: 100, label: "Under", tone: "bg-pine-100", accent: "text-pine-700" },
    { max: 0, label: "Luxe", tone: "bg-pine-900 text-snow", accent: "text-gold-300" },
  ].map((t) => ({
    ...t,
    href: t.max ? `/shop?budget=${t.max}` : "/shop?budget=luxe",
    count: cards.filter((c) => (t.max ? c.price < t.max : c.price >= 100)).length,
  }));

  return (
    <section id="gift-finder" aria-labelledby="finder-title" className="scroll-mt-24 bg-cream py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          id="finder-title"
          script="on any budget"
          title="Find the gift by price"
          intro="Every price below is already discounted — and every order is gift-wrapped free."
          align="center"
        />
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiers.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "group relative flex aspect-square flex-col justify-between overflow-hidden rounded-[1.6rem] p-5 transition-transform duration-500 ease-out-soft hover:-translate-y-1 sm:aspect-[4/3] sm:p-7",
                  t.tone,
                )}
              >
                <span className={cn("script text-[2rem] leading-none sm:text-[2.6rem]", t.accent)}>{t.label}</span>
                <span className="numeral text-[3.2rem] leading-none tracking-tight sm:text-[4.6rem]">
                  {t.max ? formatMoney(t.max, currency) : `${formatMoney(100, currency)}+`}
                </span>
                <span className="flex items-center justify-between text-[0.75rem] font-bold tracking-[0.14em] uppercase">
                  {t.count} gifts
                  <span className="grid size-9 place-items-center rounded-full bg-current/10 transition-transform group-hover:translate-x-1">
                    <Icon name="arrow-right" className="size-4" />
                  </span>
                </span>
                <Icon name="snowflake" className="absolute -right-6 -bottom-6 size-32 opacity-[0.07]" strokeWidth={1} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Wrapped with love ────────────────────────────────────────────────── */

export function WrappedStory() {
  return (
    <section aria-labelledby="wrap-title" className="overflow-hidden py-16 lg:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="reveal relative mx-auto w-full max-w-[520px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[2rem] bg-pine-900">
            <Image
              src="https://images.unsplash.com/photo-1607344645866-009c320b63e0?fit=crop&crop=entropy&ar=4:5"
              alt="Gifts tied with gold satin ribbon"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
          {/* Gift tag */}
          <div className="absolute -bottom-6 -left-2 w-[58%] max-w-[260px] rotate-[-7deg] rounded-[0.6rem_1.6rem_1.6rem_0.6rem] bg-paper p-5 shadow-lift ring-1 ring-line sm:-left-8">
            <span className="absolute top-1/2 left-3 size-3 -translate-y-1/2 rounded-full bg-cream ring-1 ring-line" aria-hidden="true" />
            <div className="pl-5">
              <p className="text-[0.62rem] font-bold tracking-[0.2em] text-ink-faint uppercase">To</p>
              <p className="script text-[1.9rem] leading-tight text-berry-600">someone special</p>
              <p className="mt-1 text-[0.62rem] font-bold tracking-[0.2em] text-ink-faint uppercase">From</p>
              <p className="script text-[1.6rem] leading-tight">you, with love</p>
            </div>
          </div>
          <span className="absolute -top-4 right-2 grid size-20 animate-spin-slow place-items-center rounded-full bg-gold-500 text-pine-950 sm:size-24" aria-hidden="true">
            <Icon name="gift" className="size-8" strokeWidth={1.4} />
          </span>
        </div>

        <div>
          <p className="script text-[2.4rem] text-berry-600 sm:text-[3rem]" aria-hidden="true">
            wrapped with love
          </p>
          <h2 id="wrap-title" className="display-lg -mt-1">
            Every gift arrives <span className="italic">ready to give.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[1.05rem] text-ink-soft">
            Tick one box in your bag and we wrap it for you — matte paper, satin ribbon and a card with your own
            words. Send it to them directly, or to you to tuck under the tree.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {site.promises.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-2xl bg-cream/70 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pine-900 text-gold-300">
                  <Icon name={p.icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-[0.86rem] text-ink-soft">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/shop" className="btn btn-dark shine mt-9">
            Start your list <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Christmas delivery timeline ──────────────────────────────────────── */

export function DeliveryTimeline() {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return {
      day: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
      month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    };
  };
  const steps = [
    ...site.deliveryCutoffs.map((c) => ({ ...fmt(c.date), title: c.service, note: c.note, final: false })),
    { day: "25", month: "Dec", weekday: "Christmas Day", title: "Unwrap", note: "Merry Christmas!", final: true },
  ];

  return (
    <section aria-labelledby="delivery-title" className="relative overflow-hidden bg-berry-800 py-16 text-snow lg:py-24">
      <div className="snow opacity-30" aria-hidden="true" />
      <div className="relative container-page">
        <SectionHeading
          id="delivery-title"
          tone="light"
          script="don't miss it"
          title="Order-by dates for Christmas"
          intro="Order before these dates and your gifts arrive in time for the tree."
          action={{ href: "/pages/shipping", label: "Delivery details" }}
        />
        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-4">
          <span className="absolute top-8 right-[12%] left-[12%] hidden h-px bg-linear-to-r from-gold-400/20 via-gold-400 to-gold-400/20 md:block" aria-hidden="true" />
          {steps.map((s) => (
            <li key={s.title} className="relative flex items-center gap-5 md:flex-col md:text-center">
              <span
                className={cn(
                  "relative grid size-16 shrink-0 place-items-center rounded-full ring-1",
                  s.final ? "bg-gold-500 text-pine-950 ring-gold-300" : "bg-berry-900 ring-gold-400/50",
                )}
              >
                <span className="text-center leading-none">
                  <span className="numeral block text-[1.5rem]">{s.day}</span>
                  <span className="block text-[0.55rem] font-bold tracking-[0.2em] uppercase opacity-80">{s.month}</span>
                </span>
              </span>
              <span>
                <span className="block font-display text-[1.5rem] leading-tight">{s.title}</span>
                <span className="block text-[0.85rem] text-snow/70">
                  {s.final ? s.note : `Order by ${s.weekday} · ${s.note}`}
                </span>
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
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {faqs.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex items-center justify-between gap-6 py-4 text-left">
            <h3 className="font-display text-[1.2rem] leading-snug sm:text-[1.35rem]">{f.q}</h3>
            <span className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-line transition-transform duration-300 group-open:rotate-45">
              <Icon name="plus" className="size-4" />
            </span>
          </summary>
          <p className="max-w-3xl pb-5 text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
