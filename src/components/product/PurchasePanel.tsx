"use client";

import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { useLocalization } from "@/components/localization/LocalizationProvider";
import { LowStockAlert } from "@/components/product/LowStockAlert";
import { BoxContents } from "@/components/product/BoxContents";
import { RibbonPicker, type RibbonOffer } from "@/components/product/RibbonPicker";
import { SaleCountdown } from "@/components/product/SaleCountdown";
import { Icon } from "@/components/ui/Icon";
import { PaymentIcons } from "@/components/ui/PaymentIcons";
import type { PaymentMethod } from "@/lib/shopify/payments";
import { site } from "@/content/site";
import { trackCustomizeProduct, trackViewItem } from "@/lib/analytics";
import type { ProductView, ViewVariant } from "@/lib/commerce/product-view";
import { localizeProductView } from "@/lib/commerce/localize";
import { originalPrice, round2, tierCode, tierPercent, tierPrice } from "@/lib/commerce/tiers";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The PDP buying controls (ported from the reference store's section 1).
 *
 *  - Options are native radio groups in fieldsets — keyboard and screen-reader
 *    behaviour for free. Combinations Shopify doesn't have are disabled and
 *    labelled, never silently hidden.
 *  - A pack option ("Pack": 1 Pack / 2 Pack / 3 Pack) renders as photo cards
 *    with per-unit price and the real Shopify compare-at saving.
 *  - The chosen variant is mirrored to `?variant=` for shareable links; the
 *    canonical URL stays the bare product URL.
 *  - A sticky add-to-bag bar slides up on phones once the main button
 *    scrolls out of view.
 */

const numericId = (gid: string) => gid.split("/").pop() ?? gid;

function findVariant(view: ProductView, selection: Record<string, string>): ViewVariant | undefined {
  return view.variants.find((v) => view.options.every((o) => v.options[o.name] === selection[o.name]));
}

/** Known colour words → swatch. Anything else falls back to a text chip. */
const SWATCH: Record<string, string> = {
  black: "#1c1b19", white: "#f7f5f0", snow: "#fbfaf6", silver: "linear-gradient(135deg,#f1f1f1,#a9a9a9)",
  gold: "linear-gradient(135deg,#f3dfa6,#b8913f)", "rose gold": "linear-gradient(135deg,#f6d2c4,#c58b78)",
  red: "#b3202f", berry: "#8a1428", green: "#2d5b45", pine: "#1b4332", oat: "#d9cbb1", cream: "#f2e8d6",
  "dark green": "#2f4a3a", "mint green": "#b9dcc8", "retro red": "#b3202f", navy: "#1f2a44", blue: "#3b6aa0", pink: "#e8b4bc", grey: "#9a9a96", gray: "#9a9a96", brown: "#6b4a33",
};
const swatchFor = (value: string) => SWATCH[value.trim().toLowerCase().replace(/\s+camera$/, "")] ?? null;
/** "Dark Green Camera" → "Dark green" */
const shortName = (value: string) => {
  const v = value.trim().replace(/\s+camera$/i, "").toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
};

/* ── Pack cards (reference "cards" mode) ─────────────────────────────── */

function PackCards({
  name,
  values,
  selection,
  view,
  onChoose,
}: {
  name: string;
  values: string[];
  selection: Record<string, string>;
  view: ProductView;
  onChoose: (name: string, value: string) => void;
}) {
  const rows = values.map((value) => ({ value, combo: findVariant(view, { ...selection, [name]: value }) }));
  const maxUnits = Math.max(...rows.map((r) => r.combo?.units ?? 1));
  const cards = rows.map(({ value, combo }) => {
    const units = combo?.units ?? 1;
    return {
      value,
      combo,
      checked: selection[name] === value,
      units,
      label: combo ? `${units} Pack` : value,
      tag: units === 2 ? "Most gifted" : units === maxUnits && units > 2 ? "Best value" : null,
      featured: units === maxUnits && units > 1,
      unitPrice: combo ? Math.floor((combo.price / units) * 100 + 1e-6) / 100 : null,
      img: combo?.image ?? view.cardImage?.url ?? null,
    };
  });

  const surface = (c: (typeof cards)[number]) =>
    c.featured
      ? cn("bg-gold-100", c.checked ? "border-gold-600" : "border-gold-300 hover:border-gold-600")
      : cn("bg-surface", c.checked ? "border-berry-600 shadow-ribbon" : "border-line hover:border-berry-500");

  const Dot = ({ checked, featured }: { checked: boolean; featured: boolean }) => (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 place-items-center rounded-full border-2 transition-colors",
        checked ? (featured ? "border-gold-600 bg-gold-600" : "border-berry-600 bg-berry-600") : "border-line bg-surface",
      )}
    >
      {checked && <Icon name="check" className="size-3 text-snow" strokeWidth={3} />}
    </span>
  );

  const Fan = ({ src, units, sizes }: { src: string; units: number; sizes: string }) => {
    const n = Math.min(Math.max(units, 1), 3);
    const step = n === 2 ? 24 : 16;
    const width = 100 - (n - 1) * step;
    return (
      <span className="absolute inset-0">
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className="absolute inset-y-0 overflow-hidden rounded-lg ring-2 ring-snow"
            style={{ left: `${i * step}%`, width: `${width}%`, zIndex: i }}
          >
            <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
          </span>
        ))}
      </span>
    );
  };

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-[0.95rem] font-semibold">Choose your pack</legend>

      {/* Phones: stacked rows */}
      <div className="grid gap-3.5 pt-2 sm:hidden">
        {cards.map((c) => (
          <label
            key={c.value}
            className={cn(
              "relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-3 transition-[border-color,transform] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500 motion-safe:active:scale-[0.985]",
              surface(c),
              !c.combo && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              name={`${name}-m`}
              value={c.value}
              checked={c.checked}
              onChange={() => onChoose(name, c.value)}
              disabled={!c.combo}
              className="sr-only"
            />
            {c.tag && (
              <span
                className={cn(
                  "absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] leading-none font-bold tracking-[0.1em] text-snow uppercase",
                  c.featured ? "bg-linear-to-r from-gold-600 to-gold-500" : "bg-berry-600",
                )}
              >
                <Icon name={c.featured ? "gift" : "star"} className="size-3" />
                {c.tag}
              </span>
            )}
            <Dot checked={c.checked} featured={c.featured} />
            <span className="relative block h-12 w-16 shrink-0">{c.img && <Fan src={c.img} units={c.units} sizes="48px" />}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[0.95rem] font-semibold">{c.label}</span>
              {c.combo?.compareAtPercent ? (
                <span className="numeral text-[0.75rem] font-semibold text-berry-600">Save {c.combo.compareAtPercent}%</span>
              ) : null}
              {c.combo && !c.combo.availableForSale && <span className="text-[0.72rem] text-ink-soft">Sold out</span>}
            </span>
            {c.combo && (
              <span className="flex shrink-0 flex-col items-end">
                <span className={cn("numeral text-[1.2rem] leading-none font-semibold", c.featured && "text-berry-600")}>
                  {formatMoney(c.units > 1 && c.unitPrice != null ? c.unitPrice : c.combo.price, view.currency)}
                  {c.units > 1 && <span className="ml-1 font-sans text-[0.68rem] font-medium text-ink-soft">each</span>}
                </span>
                <span className="numeral mt-1 flex gap-1.5 text-[0.7rem] text-ink-soft">
                  {c.combo.compareAtPrice != null && <s>{formatMoney(c.combo.compareAtPrice, view.currency)}</s>}
                  {c.units > 1 && <span>{formatMoney(c.combo.price, view.currency)} total</span>}
                </span>
              </span>
            )}
          </label>
        ))}
      </div>

      {/* Tablet + desktop: photo cards */}
      <div className="hidden gap-3 pt-2 sm:grid" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
        {cards.map((c) => (
          <label
            key={c.value}
            className={cn(
              "relative flex cursor-pointer flex-col items-center rounded-2xl border-2 px-3 pb-3.5 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500",
              c.tag ? "pt-8" : "pt-6",
              surface(c),
              !c.combo && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              name={`${name}-d`}
              value={c.value}
              checked={c.checked}
              onChange={() => onChoose(name, c.value)}
              disabled={!c.combo}
              className="sr-only"
            />
            {c.tag && (
              <span
                className={cn(
                  "absolute -top-px -left-px rounded-tl-2xl rounded-br-xl px-2.5 py-1.5 text-[0.62rem] leading-none font-bold tracking-[0.08em] text-snow uppercase",
                  c.featured ? "bg-gold-600" : "bg-berry-600",
                )}
              >
                {c.tag}
              </span>
            )}
            <span className="absolute top-2.5 right-2.5">
              <Dot checked={c.checked} featured={c.featured} />
            </span>
            <span className="relative block aspect-[4/3] w-full max-w-28">{c.img && <Fan src={c.img} units={c.units} sizes="112px" />}</span>
            <span className="mt-2.5 text-[0.9rem] font-semibold">{c.label}</span>
            {c.combo && (
              <>
                <span className={cn("numeral mt-0.5 text-[1.35rem] leading-tight font-semibold", c.featured && "text-berry-600")}>
                  {formatMoney(c.units > 1 && c.unitPrice != null ? c.unitPrice : c.combo.price, view.currency)}
                  {c.units > 1 && <span className="ml-1 font-sans text-[0.72rem] font-medium text-ink-soft">each</span>}
                </span>
                <span className="numeral flex gap-1.5 text-[0.72rem] text-ink-soft">
                  {c.combo.compareAtPrice != null && <s>{formatMoney(c.combo.compareAtPrice, view.currency)}</s>}
                  {c.units > 1 && <span>{formatMoney(c.combo.price, view.currency)} total</span>}
                </span>
                {c.combo.compareAtPercent ? (
                  <span className="numeral mt-1.5 rounded-md bg-pine-900 px-2 py-0.5 text-[0.7rem] text-snow">
                    Save {c.combo.compareAtPercent}%
                  </span>
                ) : null}
                {!c.combo.availableForSale && <span className="mt-1 text-[0.72rem] text-ink-soft">Sold out</span>}
              </>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ── "Free shipping unlocked" strip ────────────────────────────────────── */

const CONFETTI = [
  { x: -46, y: -30, r: -200, c: "bg-gold-500" },
  { x: -30, y: 34, r: 160, c: "bg-berry-500" },
  { x: -64, y: 4, r: 240, c: "bg-pine-500" },
  { x: 8, y: -42, r: -120, c: "bg-berry-500" },
  { x: 44, y: -34, r: 220, c: "bg-gold-500" },
  { x: 60, y: 6, r: -180, c: "bg-pine-500" },
  { x: 34, y: 38, r: 140, c: "bg-berry-500" },
  { x: -8, y: 44, r: -240, c: "bg-gold-500" },
] as const;

/**
 * Compact celebratory strip: the truck drives in, a tick pops, confetti bursts
 * once and a soft light sweeps across now and then (decorative motion only —
 * the text carries the message, and it all stops under reduced-motion).
 * Shows "unlocked" once the order reaches the free-shipping threshold, and a
 * nudge towards it before that, so it never promises something checkout won't
 * honour. Set `site.delivery.freeOver` to 0 to make shipping always free.
 */
function FreeShippingStrip({ total, currency, ratio = 1 }: { total: number; currency: string; ratio?: number }) {
  // `total` is in the shop's currency (the threshold is too); `ratio` carries the visitor's currency
  // (their price ÷ shop price) so the "add X more" hint is shown in the money they see.
  const threshold = site.delivery.freeOver;
  const unlocked = total >= threshold;
  const shown = (amount: number) => formatMoney(round2(amount * ratio), currency);
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 basis-56 items-center self-stretch overflow-hidden rounded-xl border border-dashed py-1.5 pr-3 pl-2",
        unlocked ? "border-gold-400 bg-gold-100 text-ink" : "border-line bg-cream text-ink",
      )}
    >
      {unlocked && (
        <span
          aria-hidden="true"
          className="unlock-anim pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[unlock-sweep_3.6s_ease-in-out_infinite]"
        />
      )}
      <div className="relative flex w-full items-center gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center">
          {unlocked && (
            <>
              <span aria-hidden="true" className="unlock-anim absolute inset-0 rounded-full border-2 border-gold-500/60 motion-safe:animate-[unlock-ring_1.8s_ease-out_0.5s_2]" />
              {CONFETTI.map((p, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={cn(
                    "unlock-anim absolute top-1/2 left-1/2 h-1.5 w-1 rounded-[1px] opacity-0 motion-safe:animate-[unlock-burst_1.1s_ease-out_0.35s_1_both]",
                    p.c,
                  )}
                  style={{ "--bx": `${p.x}px`, "--by": `${p.y}px`, "--br": `${p.r}deg` } as React.CSSProperties}
                />
              ))}
            </>
          )}
          <span
            className={cn(
              "unlock-anim relative grid size-9 place-items-center",
              unlocked ? "text-gold-700 motion-safe:animate-[unlock-truck_0.7s_cubic-bezier(0.2,0.8,0.3,1)_both]" : "text-ink-faint",
            )}
          >
            <Icon name="truck" className="size-6" strokeWidth={1.6} />
          </span>
          {unlocked && (
            <span
              aria-hidden="true"
              className="unlock-anim absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full border-2 border-gold-100 bg-pine-600 text-white motion-safe:animate-[unlock-tick_0.4s_cubic-bezier(0.3,1.6,0.5,1)_0.6s_both]"
            >
              <Icon name="check" className="size-2.5" strokeWidth={3} />
            </span>
          )}
        </span>
        <p className="min-w-0 leading-tight">
          {unlocked ? (
            <>
              <span className="block text-[0.82rem] font-semibold">Free shipping unlocked</span>
              <span className="block text-[0.7rem] text-ink-soft">{threshold <= 0 ? (
                  <>
                    {site.delivery.rate > 0 && <s className="mr-1 text-ink-faint">{formatMoney(round2(site.delivery.rate * ratio), currency)}</s>}
                    on every order — limited-time offer
                  </>
                ) : (
                  "Applied to this order"
                )}</span>
            </>
          ) : (
            <>
              <span className="block text-[0.82rem] font-semibold">Add {shown(threshold - total)} for free shipping</span>
              <span className="block text-[0.7rem] text-ink-soft">Free on orders over {formatMoney(Math.ceil(threshold * ratio), currency)}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── Bundle picker: how many, and which colour for each ─────────────── */

/** A plain colour circle. */
function Lens({ value, className }: { value: string; active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(14_26_51/0.18)]", className)}
      style={{ background: swatchFor(value) ?? "#d8d2c6" }}
    />
  );
}

/** `price` is what is charged per camera; `original` the struck-through price it is shown against. */
/** `price` is the extra charged per camera over the base pack (0 + `included` for the base pack); `original` the struck-through price it is shown against. */
type PackChoice = { value: string; label: string; price: number; original: number | null; selected: boolean; included: boolean };

type Offer = { n: number; total: number; unit: number; compare: number | null; pct: number | null; code: string | null };

const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six"];

/** n photos fanned out like a hand of cards (one per camera in the set). */
function Fan({ images, size }: { images: (string | null)[]; size: string }) {
  const n = images.length;
  return (
    <span className="relative block size-full">
      {images.map((src, i) => {
        const turn = n === 1 ? 0 : (i - (n - 1) / 2) * 9;
        const shift = n === 1 ? 0 : (i - (n - 1) / 2) * 16;
        return (
          <span
            key={i}
            className="img-skeleton absolute inset-[8%] overflow-hidden rounded-xl shadow-soft ring-2 ring-surface transition-transform duration-500 ease-out-soft"
            style={{ transform: `translateX(${shift}%) rotate(${turn}deg)`, zIndex: i }}
          >
            {src && <Image src={src} alt="" fill sizes={size} className="object-cover" />}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Bundle offers, modelled on the reference store's pack cards: a stacked,
 * photo-first list on phones and three photo cards from `sm` up. Each card
 * shows the unit price, the set total and — when Shopify has a compare-at
 * price — the struck-through original with the real saving. Choosing a card
 * springs open a panel to customise the set: the stencil pack and a colour for
 * every camera. All prices are Shopify's own; nothing is invented.
 */
function BundlePicker({
  noun,
  max,
  values,
  count,
  picks,
  currency,
  popular,
  tags,
  packs,
  offers,
  imageFor,
  isAvailable,
  onCount,
  onPack,
  onPick,
}: {
  noun: string;
  max: number;
  values: string[];
  count: number;
  picks: string[];
  currency: string;
  popular: number | null;
  tags: string[];
  packs: PackChoice[];
  offers: Offer[];
  imageFor: (value: string) => string | null;
  isAvailable: (value: string) => boolean;
  onCount: (n: number) => void;
  onPack: (value: string) => void;
  onPick: (index: number, value: string) => void;
}) {
  const fanFor = (n: number) =>
    Array.from({ length: n }, (_, i) => imageFor(n === count ? (picks[i] ?? values[i % values.length]!) : values[i % values.length]!));
  const selectedIndex = Math.max(0, offers.findIndex((o) => o.n === count));

  /** "2 cameras · 4 stencils each" — camera count and the stencil pack on one line. */
  const packName = packs.find((p) => p.included)?.label.toLowerCase() ?? null;
  const summary = (n: number) => (
    <>
      {n} {noun}
      {n === 1 ? "" : "s"}
      {packName && (
        <>
          {" · "}
          {packName}
          {n > 1 && <span className="max-[479px]:hidden sm:inline"> each</span>}
        </>
      )}
    </>
  );
  const tagFor = (n: number) => (popular === n ? "Most popular" : tags[n - 1] || null);
  const priceBlock = (o: Offer, align: "end" | "center") => (
    <span className={cn("flex flex-col", align === "end" ? "items-end" : "items-center")}>
      {o.n > 1 ? (
        <>
          <span className="numeral text-[1.2rem] leading-none font-semibold text-berry-600 tabular-nums">
            {formatMoney(o.unit, currency)}
            <span className="ml-1 font-sans text-[0.7rem] font-medium text-ink-soft">each</span>
          </span>
          <span className="mt-1 flex items-baseline gap-1.5 text-[0.7rem] text-ink-soft tabular-nums">
            {o.compare != null && <s className="text-ink-faint">{formatMoney(o.compare, currency)}</s>}
            <span className="font-semibold text-ink">{formatMoney(o.total, currency)} total</span>
          </span>
        </>
      ) : (
        <>
          {o.compare != null && <s className="text-[0.72rem] text-ink-faint tabular-nums">{formatMoney(o.compare, currency)}</s>}
          <span className="numeral text-[1.2rem] leading-none font-semibold text-berry-600 tabular-nums">{formatMoney(o.total, currency)}</span>
        </>
      )}
      {o.pct != null && o.pct > 0 && (
        <span className="mt-1 rounded-md bg-pine-700 px-1.5 py-0.5 text-[0.66rem] leading-none font-bold text-snow">Save {o.pct}%</span>
      )}
    </span>
  );

  const radioDot = (checked: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
        checked ? "border-berry-600 bg-berry-600" : "border-line bg-surface",
      )}
    >
      {checked && <Icon name="check" className="size-3 text-snow" strokeWidth={3} />}
    </span>
  );

  /** Little arrow joining the customise panel to the card it belongs to. */
  const notch =
    "absolute -top-[7px] z-10 size-3 -translate-x-1/2 rotate-45 border-t border-l border-berry-600/50 bg-cream";

  /** Customise the chosen set: the stencil pack (with its own price) and a colour for every camera. */
  const panel = (id: "m" | "d", arrow: React.ReactNode) => (
    <div
      key={`${id}-${count}`}
      className={cn(
        "relative origin-top animate-[bundle-open_0.5s_var(--ease-spring)_both] rounded-2xl border border-berry-600/50 bg-cream p-3 shadow-soft",
        id === "m" && "sm:hidden",
      )}
    >
      {arrow}
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 right-6 text-gold-500 motion-safe:animate-[pop_0.6s_var(--ease-spring)_both]">
        <Icon name="sparkle" className="size-4" />
      </span>
      <p className="mb-2.5 text-[0.8rem] font-semibold">
        Pick colours for your {count === 1 ? noun : `${count} ${noun}s`}
      </p>

      <div className="grid gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const colour = picks[i] ?? values[0]!;
          const img = imageFor(colour);
          return (
            <div key={i} role="radiogroup" aria-label={count === 1 ? "Colour" : `Colour for ${noun} ${i + 1}`} className="flex items-center gap-2.5 rounded-xl bg-surface p-1.5 pr-2 shadow-soft">
              <span className="img-skeleton relative size-10 shrink-0 overflow-hidden rounded-lg">
                {img && <Image key={img} src={img} alt="" fill sizes="40px" className="animate-[fade_0.35s_ease-out] object-cover" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
                {count > 1 && <span className="text-ink-faint">#{i + 1} </span>}
                {shortName(colour)}
              </span>
              <span className="flex items-center gap-1">
                {values.map((value) => {
                  const on = colour === value;
                  const ok = isAvailable(value);
                  return (
                    <label
                      key={value}
                      title={shortName(value)}
                      className={cn(
                        "grid cursor-pointer place-items-center rounded-full p-0.5 ring-2 transition-[box-shadow] has-focus-visible:outline-2 has-focus-visible:outline-gold-500",
                        on ? "ring-berry-600" : "ring-transparent hover:ring-line",
                        !ok && "cursor-not-allowed opacity-35",
                      )}
                    >
                      <input type="radio" name={`bundle-colour-${id}-${i}`} value={value} checked={on} disabled={!ok} onChange={() => onPick(i, value)} className="sr-only" />
                      <span className="sr-only">{shortName(value)}</span>
                      <Lens value={value} active={on} className="size-6" />
                    </label>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-7">
    <fieldset className="min-w-0">
      <legend className="mb-3 flex w-full items-baseline justify-between text-[0.95rem] font-semibold">
        Choose your bundle
        <span className="text-[0.78rem] font-normal text-ink-soft">Mix any colours</span>
      </legend>

      {/* ── Phones: stacked, photo-first rows ─────────────────────────── */}
      <div role="radiogroup" aria-label={`How many ${noun}s`} className="grid gap-3 pt-2 sm:hidden">
        {offers.map((o) => {
          const checked = o.n === count;
          const tag = tagFor(o.n);
          const row = (
            <label
              key={o.n}
              className={cn(
                "relative flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2.5 transition-[border-color,background-color,transform] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500 motion-safe:active:scale-[0.985]",
                checked ? "border-berry-600 bg-berry-50/60" : "border-line bg-surface",
                tag && "pt-3.5",
              )}
            >
              <input type="radio" name="bundle-count-m" value={o.n} checked={checked} onChange={() => onCount(o.n)} className="sr-only" />
              {tag && (
                <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[0.58rem] leading-none font-bold tracking-[0.1em] text-snow uppercase">
                  <Icon name={popular === o.n ? "star" : "gift"} className="size-3" /> {tag}
                </span>
              )}
              <span className="relative size-12 min-[400px]:size-14 shrink-0">
                <Fan images={fanFor(o.n)} size="56px" />
                <span className="absolute -top-1.5 -left-1.5 z-10">{radioDot(checked)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.95rem] leading-tight font-bold">Buy {WORDS[o.n]}</span>
                <span className="block text-[0.7rem] leading-snug whitespace-nowrap text-ink-soft">{summary(o.n)}</span>
              </span>
              {priceBlock(o, "end")}
            </label>
          );
          return checked ? (
            <Fragment key={o.n}>
              {row}
              {panel("m", <span aria-hidden="true" className={notch} style={{ left: "2.25rem" }} />)}
            </Fragment>
          ) : (
            row
          );
        })}
      </div>

      {/* ── Tablet & desktop: three photo cards ───────────────────────── */}
      <div role="radiogroup" aria-label={`How many ${noun}s`} className="hidden gap-3 sm:grid sm:grid-cols-3">
        {offers.map((o) => {
          const checked = o.n === count;
          const tag = tagFor(o.n);
          return (
            <label
              key={o.n}
              className={cn(
                "relative flex cursor-pointer flex-col items-center rounded-2xl border-2 px-3 pb-3 text-center transition-[border-color,background-color,transform] duration-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500 hover:-translate-y-0.5",
                checked ? "border-berry-600 bg-berry-50/60 shadow-ribbon" : "border-line bg-surface hover:border-berry-500",
                tag ? "pt-8" : "pt-6",
              )}
            >
              <input type="radio" name="bundle-count-d" value={o.n} checked={checked} onChange={() => onCount(o.n)} className="sr-only" />
              {tag && (
                <span className="absolute -top-px -left-px rounded-tl-2xl rounded-br-lg bg-ink px-2.5 py-1.5 text-[0.6rem] leading-none font-bold tracking-[0.1em] text-snow uppercase">
                  {tag}
                </span>
              )}
              <span className="absolute top-2.5 right-2.5">{radioDot(checked)}</span>
              <span className="block aspect-square w-full max-w-24">
                <Fan images={fanFor(o.n)} size="96px" />
              </span>
              <span className="mt-2 text-[0.92rem] font-bold">Buy {WORDS[o.n]}</span>
              <span className="mb-1.5 text-[0.7rem] whitespace-nowrap text-ink-soft">{summary(o.n)}</span>
              {priceBlock(o, "center")}
            </label>
          );
        })}
      </div>

      {/* ── Tablet & desktop: the panel sits below, its notch slides to the chosen card ── */}
      <div className="relative mt-4 hidden sm:block">
        <span
          aria-hidden="true"
          className={cn(notch, "transition-[left] duration-500 ease-[var(--ease-spring)]")}
          style={{
            left: `calc((100% - ${(offers.length - 1) * 0.75}rem) * ${(selectedIndex + 0.5) / offers.length} + ${selectedIndex * 0.75}rem)`,
          }}
        />
        {panel("d", null)}
      </div>
    </fieldset>

      {/* ── Stencils per camera: its own step, after the bundle ─────────── */}
      {packs.length > 1 && (
        <fieldset className="min-w-0">
          <legend className="mb-3 flex w-full items-baseline justify-between text-[0.95rem] font-semibold">
            Stencils in each {noun}
            <span className="text-[0.78rem] font-normal text-ink-soft">Pick 4 or 12</span>
          </legend>
          <div role="radiogroup" aria-label={`Stencils in each ${noun}`} className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${packs.length}, minmax(0, 1fr))` }}>
            {packs.map((pk) => (
              <label
                key={pk.value}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-2xl border-2 px-3.5 py-2.5 transition-[border-color,background-color] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500",
                  pk.selected ? "border-berry-600 bg-berry-50/60" : "border-line bg-surface hover:border-berry-500",
                )}
              >
                <input type="radio" name="bundle-pack" value={pk.value} checked={pk.selected} onChange={() => onPack(pk.value)} className="sr-only" />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.9rem] font-bold">{pk.label}</span>
                  {radioDot(pk.selected)}
                </span>
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                  {pk.included ? (
                    <span className="text-[0.84rem] leading-none font-semibold text-pine-700">Included with camera</span>
                  ) : (
                    <>
                      <span className="numeral text-[1.1rem] leading-none font-semibold text-berry-600">+{formatMoney(pk.price, currency)}</span>
                      {pk.original != null && <s className="text-[0.74rem] text-ink-faint">{formatMoney(pk.original, currency)}</s>}
                      {count > 1 && <span className="text-[0.7rem] text-ink-soft">per camera</span>}
                    </>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────── */

export function PurchasePanel({ view: baseView, payments = [] }: { view: ProductView; payments?: PaymentMethod[] }) {
  const { add, addBundle, open } = useCart();
  // Shopify's own prices for the visitor's country (Markets); the page shows the shop's currency until they land.
  const { localizedPriceFor, requestPrices, isPriceLoading } = useLocalization();
  useEffect(() => {
    requestPrices([
      ...baseView.variants.map((v) => v.id),
      ...(baseView.addon?.variants.map((v) => v.id) ?? []),
      ...(baseView.multi?.variants.map((v) => v.id) ?? []),
    ]);
  }, [requestPrices, baseView.variants, baseView.addon, baseView.multi]);
  const view = useMemo(() => localizeProductView(baseView, localizedPriceFor), [baseView, localizedPriceFor]);
  const pricesLoading = view === baseView && baseView.variants.some((v) => isPriceLoading(v.id));
  /** The shop-currency price of a variant (the bag always starts from this and re-prices itself). */
  const baseVariant = (id: string) => baseView.variants.find((v) => v.id === id);
  // Ribbons: any colours in any quantity. Either the page's main purchase (`view.multi`, the ribbon's own
  // page) or an optional extra on this product's page (`view.addon`).
  const ribbonView = view.multi ?? view.addon;
  const ribbonOnly = Boolean(view.multi);
  const [ribbonQty, setRibbonQty] = useState<Record<string, number>>({});
  const ribbonTiers = ribbonView && ribbonView.discounts.length ? { discounts: ribbonView.discounts, codePrefix: ribbonView.codePrefix } : null;
  const ribbonUnits = ribbonView ? ribbonView.variants.reduce((n, v) => n + (ribbonQty[v.id] ?? 0), 0) : 0;
  const ribbonList = round2(ribbonView ? ribbonView.variants.reduce((n, v) => n + v.price * (ribbonQty[v.id] ?? 0), 0) : 0);
  const ribbonOffer: RibbonOffer = (() => {
    if (!ribbonView || ribbonUnits === 0) return { units: 0, total: 0, compare: null, pct: null, code: null };
    if (!ribbonTiers) return { units: ribbonUnits, total: ribbonList, compare: null, pct: null, code: null };
    // Each ribbon's original is worked back from its own price; the step's percentage is off that.
    const pct = tierPercent(ribbonTiers, ribbonUnits);
    return {
      units: ribbonUnits,
      total: tierPrice(ribbonList, ribbonTiers, ribbonUnits),
      compare: pct > 0 ? originalPrice(ribbonList, ribbonTiers.discounts[0]!) : null,
      pct: pct > 0 ? pct : null,
      code: tierCode(ribbonTiers, ribbonUnits),
    };
  })();
  const ribbonTotal = ribbonOffer.total;
  const setRibbon = (id: string, q: number) => {
    setAdded(false);
    // On the ribbon's own page, picking a colour brings its photo to the gallery.
    if (ribbonOnly && q === 1 && !ribbonQty[id]) window.dispatchEvent(new CustomEvent("ne:variant", { detail: { variantId: id } }));
    setRibbonQty((prev) => {
      const next = { ...prev };
      if (q <= 0) delete next[id];
      else next[id] = Math.min(20, q);
      return next;
    });
  };
  const initial = view.variants.find((v) => v.id === view.defaultVariantId) ?? view.variants[0]!;
  const [selection, setSelection] = useState<Record<string, string>>(initial.options);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const variant = findVariant(view, selection);
  const hasPack = view.packOptionName !== null;

  // Bundle mode: "how many, and which colour for each" (configured by the product's story).
  const cfg = view.story?.bundle ?? null;
  const bundleOption = cfg ? view.options.find((o) => o.name === cfg.option) : undefined;
  const bundle = cfg && bundleOption ? { ...cfg, label: bundleOption.label, values: bundleOption.values } : null;
  const packOption = bundle?.secondary ? view.options.find((o) => o.name === bundle.secondary) : undefined;
  const [count, setCount] = useState(1);
  const [extraPicks, setExtraPicks] = useState<string[]>([]);
  /** Colour of each camera; camera 1 is always the main selection (it drives the gallery and the URL). */
  const picks = bundle ? [selection[bundle.option]!, ...extraPicks] : [];

  /** One entry per distinct bag line (the same colour twice becomes quantity 2). */
  const bundleLines = useMemo(() => {
    if (!bundle) return [];
    const byId = new Map<string, { variant: ViewVariant; quantity: number }>();
    for (const colour of picks.slice(0, count)) {
      const v = findVariant(view, { ...selection, [bundle.option]: colour });
      if (!v) continue;
      const line = byId.get(v.id) ?? { variant: v, quantity: 0 };
      line.quantity += 1;
      byId.set(v.id, line);
    }
    return [...byId.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.option, count, selection, extraPicks, view]);

  const tiers = bundle && bundle.discounts.length ? { discounts: bundle.discounts, codePrefix: bundle.codePrefix } : null;
  const bundleQty = bundleLines.reduce((n, l) => n + l.quantity, 0);
  const bundleList = round2(bundleLines.reduce((s, l) => s + l.variant.price * l.quantity, 0));
  /** What the shopper pays: Shopify's price × quantity, less the bundle step (checkout applies the matching code). */
  const bundleTotal = bundle && bundleLines.length ? (tiers ? tierPrice(bundleList, tiers, count) : bundleList) : 0;
  const bundleComplete = bundle ? bundleQty === count : true;
  const canBuy = ribbonOnly
    ? ribbonUnits > 0
    : bundle
      ? bundleComplete && bundleLines.every((l) => l.variant.availableForSale)
      : Boolean(variant?.availableForSale);
  /** What the order costs right now (all cameras), for the shipping strip, the button and the sticky bar. */
  const orderTotal = (ribbonOnly ? 0 : bundle ? bundleTotal : variant ? variant.price * (hasPack ? 1 : qty) : 0) + ribbonTotal;

  /** The scarcest variant in the order, when it is genuinely low (real Shopify stock only). */
  const lowStock = (() => {
    const lines = bundle ? bundleLines : variant ? [{ variant, quantity: hasPack ? 1 : qty }] : [];
    let worst: { left: number; wanted: number } | null = null;
    for (const { variant: v, quantity } of lines) {
      if (v.stock == null || v.stock > site.lowStockAt) continue;
      if (!worst || v.stock < worst.left) worst = { left: v.stock, wanted: quantity };
    }
    return worst && worst.left > 0 ? worst : null;
  })();

  /** Visitor's price ÷ shop price (1 until Shopify's local prices have landed). */
  const priceRatio = (() => {
    const base = variant ? baseVariant(variant.id)?.price : undefined;
    return variant && base ? variant.price / base : 1;
  })();

  const colourAvailable = (colour: string) => {
    const v = bundle ? findVariant(view, { ...selection, [bundle.option]: colour }) : undefined;
    return Boolean(v?.availableForSale);
  };

  /** What each offer card shows: Shopify's list prices for n cameras, less the tier discount (the checkout code gives the same). */
  const offerFor = (n: number, colours: string[], pack?: string): Offer => {
    const vs = colours.map((c) => findVariant(view, { ...selection, [bundle!.option]: c, ...(pack && packOption ? { [packOption.name]: pack } : {}) }) ?? variant);
    const list = round2(vs.reduce((t, v) => t + (v?.price ?? 0), 0));
    if (tiers) {
      // The original is n × (Shopify price ÷ (1 − first%)); each step's percentage is off that.
      const pct = tierPercent(tiers, n);
      const total = tierPrice(list, tiers, n);
      return { n, total, unit: Math.floor((total / n) * 100 + 1e-6) / 100, compare: pct > 0 ? originalPrice(list, tiers.discounts[0]!) : null, pct: pct > 0 ? pct : null, code: tierCode(tiers, n) };
    }
    const compareRaw = vs.every((v) => v?.compareAtPrice) ? vs.reduce((t, v) => t + (v!.compareAtPrice ?? 0), 0) : null;
    const compare = compareRaw && compareRaw > list ? round2(compareRaw) : null;
    return { n, total: list, unit: Math.floor((list / n) * 100 + 1e-6) / 100, compare, pct: compare ? Math.round(((compare - list) / compare) * 100) : null, code: null };
  };
  /** The base stencil pack (the cheapest, included with the camera): the bundle cards show the camera price at this pack. */
  const basePack = packOption
    ? [...packOption.values].sort(
        (a, b) =>
          (findVariant(view, { ...selection, [packOption.name]: a })?.price ?? 0) - (findVariant(view, { ...selection, [packOption.name]: b })?.price ?? 0),
      )[0]
    : undefined;
  const coloursFor = (n: number) =>
    Array.from({ length: n }, (_, i) => (n === count ? (picks[i] ?? bundle!.values[i % bundle!.values.length]!) : bundle!.values[i % bundle!.values.length]!));
  const bundleOffers: Offer[] = bundle
    ? Array.from({ length: bundle.max }, (_, i) => i + 1).map((n) => offerFor(n, coloursFor(n), basePack))
    : [];
  /** What the shopper actually pays: the camera(s) plus the chosen stencil pack. */
  const currentOffer = bundle ? offerFor(count, coloursFor(count)) : null;

  /** Struck-through value and saving shown in the floating bar. */
  const stickyCompare = ribbonOnly ? ribbonOffer.compare : bundle ? (currentOffer?.compare ?? null) : (variant?.compareAtPrice ?? null);
  const stickyPct = ribbonOnly ? ribbonOffer.pct : bundle ? (currentOffer?.pct ?? null) : (variant?.compareAtPercent ?? null);

  /** The template-pack choices (e.g. 4 or 12), each with its per-camera price for the current colour. */
  const packChoices: PackChoice[] =
    bundle && packOption
      ? packOption.values.map((value) => {
          const priceOf = (v: string) => findVariant(view, { ...selection, [packOption.name]: v })?.price ?? variant?.price ?? 0;
          const extra = Math.max(0, round2(priceOf(value) - priceOf(basePack!)));
          return {
            value,
            label: view.story?.valueLabels[value] ?? value,
            selected: selection[packOption.name] === value,
            included: value === basePack || extra === 0,
            // Only the stencil part of the price, per camera, at the bundle size chosen.
            price: tiers ? tierPrice(extra, tiers, count) : extra,
            original: tiers && extra > 0 ? originalPrice(extra, tiers.discounts[0]!) : null,
          };
        })
      : [];
  const colourImage = (colour: string) =>
    (bundle && findVariant(view, { ...selection, [bundle.option]: colour })?.image) || view.cardImage?.url || null;

  const setBundleCount = (n: number) => {
    if (!bundle) return;
    setCount(n);
    setAdded(false);
    // New cameras start in the next free colours, so a pair or trio is varied by default.
    setExtraPicks((prev) => {
      const next = prev.slice(0, n - 1);
      const used = [selection[bundle.option]!, ...next];
      while (next.length < n - 1) {
        const pick = bundle.values.find((v) => !used.includes(v) && colourAvailable(v)) ?? bundle.values.find(colourAvailable) ?? bundle.values[0]!;
        next.push(pick);
        used.push(pick);
      }
      return next;
    });
  };

  /** Removes one camera; the ones after it move up (camera 1 stays the main selection). */
  const removeBundleCamera = (index: number) => {
    if (!bundle || count <= 1) return;
    const list = picks.slice(0, count);
    list.splice(index, 1);
    if (index === 0) choose(bundle.option, list[0]!);
    setExtraPicks(list.slice(1));
    setCount(count - 1);
    setAdded(false);
  };

  const setBundlePick = (index: number, colour: string) => {
    if (!bundle) return;
    setAdded(false);
    if (index === 0) {
      choose(bundle.option, colour);
    } else {
      setExtraPicks((prev) => prev.map((c, i) => (i === index - 1 ? colour : c)));
      const v = findVariant(view, { ...selection, [bundle.option]: colour });
      if (v) window.dispatchEvent(new CustomEvent("ne:variant", { detail: { variantId: v.id } }));
    }
  };

  // Restore a shared ?variant= link, and record the product view.
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return; // one ViewContent per page, even under React dev double-effects
    viewed.current = true;
    const param = new URLSearchParams(window.location.search).get("variant");
    const fromUrl = param ? view.variants.find((v) => numericId(v.id) === param) : undefined;
    if (fromUrl) setSelection(fromUrl.options);
    const v = fromUrl ?? initial;
    trackViewItem(
      { id: v.id, productId: view.productId, name: view.name, variant: v.label, price: v.price, category: view.category.title },
      view.currency,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]!;
      setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const choose = (name: string, value: string) => {
    let next = { ...selection, [name]: value };
    // Missing combination: keep this choice, move the other option to one that exists.
    if (!findVariant(view, next)) {
      const fallback =
        view.variants.find((v) => v.options[name] === value && v.availableForSale) ??
        view.variants.find((v) => v.options[name] === value);
      if (fallback) next = { ...fallback.options };
    }
    setSelection(next);
    setAdded(false);
    const v = findVariant(view, next);
    if (!v) return;
    trackCustomizeProduct(
      { id: v.id, productId: view.productId, name: view.name, variant: v.label, price: v.price, category: view.category.title },
      view.currency,
      name,
      value,
    );
    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", numericId(v.id));
      window.history.replaceState(window.history.state, "", url);
    });
    if (name !== view.packOptionName) {
      window.dispatchEvent(new CustomEvent("ne:variant", { detail: { variantId: v.id } }));
    }
  };

  const optionAvailable = (name: string, value: string) => {
    const exact = findVariant(view, { ...selection, [name]: value });
    if (exact) return exact.availableForSale;
    return view.variants.some((v) => v.options[name] === value && v.availableForSale);
  };

  /** Puts the chosen ribbons in the bag as one group (replacing the ribbons already there). */
  const addRibbons = () => {
    const rv = baseView.multi ?? baseView.addon;
    if (!rv) return;
    const entries = rv.variants
      .filter((v) => (ribbonQty[v.id] ?? 0) > 0)
      .map((v) => ({
        variantId: v.id,
        quantity: ribbonQty[v.id]!,
        snapshot: {
          productName: rv.name,
          variantLabel: v.label,
          price: v.price,
          compareAtPrice: null,
          image: v.image ?? rv.image,
          href: `${rv.href}?variant=${numericId(v.id)}`,
          available: true,
          productId: rv.productId,
          category: view.category.title,
        },
      }));
    if (entries.length) addBundle(entries, rv.variants.map((v) => v.id));
  };

  const onAdd = () => {
    if (ribbonOnly) {
      if (!canBuy) return;
      addRibbons();
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
      return;
    }
    if (bundle) {
      if (!canBuy) return;
      // One bundle per product: a new size or colours replaces the one already in the bag.
      addBundle(
        bundleLines.map(({ variant: v, quantity }) => ({
          variantId: v.id,
          quantity,
          snapshot: {
            productName: view.name,
            variantLabel: v.label,
            price: baseVariant(v.id)?.price ?? v.price,
            compareAtPrice: baseVariant(v.id)?.compareAtPrice ?? v.compareAtPrice,
            image: v.image ?? view.cardImage?.url ?? null,
            href: `${view.href}?variant=${numericId(v.id)}`,
            available: true,
            productId: view.productId,
            category: view.category.title,
          },
        })),
        view.variants.map((v) => v.id),
      );
      addRibbons();
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
      return;
    }
    if (!variant || !canBuy) return;
    add(variant.id, hasPack ? 1 : qty, {
      productName: view.name,
      variantLabel: variant.label,
      price: baseVariant(variant.id)?.price ?? variant.price,
      compareAtPrice: baseVariant(variant.id)?.compareAtPrice ?? variant.compareAtPrice,
      image: variant.image ?? view.cardImage?.url ?? null,
      href: `${view.href}?variant=${numericId(variant.id)}`,
      available: true,
      productId: view.productId,
      category: view.category.title,
    });
    // Ribbons ride along as their own lines (a separate product in Shopify).
    addRibbons();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  /** "Your price" for a plain product (with any ribbons ticked): shown above the shipping strip, like the bundle page. */
  const plainOffer = (() => {
    if (!variant || bundle || ribbonOnly || hasPack) return null;
    const q = hasPack ? 1 : qty;
    const base = variant.price * q;
    const ribbonOriginal = ribbonOffer.units > 0 ? (ribbonOffer.compare ?? ribbonOffer.total) : 0;
    const total = round2(base + ribbonTotal);
    const compare = round2((variant.compareAtPrice ?? variant.price) * q + ribbonOriginal);
    const on = compare > total + 0.009;
    return {
      total,
      compare: on ? compare : null,
      pct: on ? Math.round((1 - total / compare) * 100) : null,
      line: `${q > 1 ? `${q} × ` : ""}${variant.label || view.story?.shortName || view.name}${ribbonOffer.units ? ` + ${ribbonOffer.units} ribbon${ribbonOffer.units === 1 ? "" : "s"}` : ""}`,
    };
  })();

  return (
    <div className={cn(pricesLoading && "[&_.numeral]:animate-pulse")}>
      <div className="space-y-7">
        {view.options.map((option) => {
          if (ribbonOnly) return null;
          if (option.name === view.packOptionName) {
            return (
              <PackCards
                key={option.name}
                name={option.name}
                values={option.values}
                selection={selection}
                view={view}
                onChoose={choose}
              />
            );
          }
          if (bundle && option.name === bundle.secondary) return null;
          if (bundle && option.name === bundle.option) {
            return (
              <BundlePicker
                key={option.name}
                noun={bundle.noun}
                max={bundle.max}
                values={option.values}
                count={count}
                picks={picks}
                currency={view.currency}
                popular={bundle.popular}
                tags={bundle.tags}
                packs={packChoices}
                offers={bundleOffers}
                imageFor={colourImage}
                isAvailable={colourAvailable}
                onCount={setBundleCount}
                onPack={(value) => packOption && choose(packOption.name, value)}
                onPick={setBundlePick}
              />
            );
          }
          return (
            <fieldset key={option.name} className="min-w-0">
              <legend className="mb-3 flex w-full items-baseline justify-between text-[0.95rem] font-semibold">
                {option.label}
                <span className="font-normal text-ink-soft">{view.story?.valueLabels[selection[option.name]!] ?? selection[option.name]}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {option.values.map((value) => {
                  const available = optionAvailable(option.name, value);
                  const checked = selection[option.name] === value;
                  const shown = view.story?.valueLabels[value] ?? value;
                  const swatch = swatchFor(shown) ?? swatchFor(value);
                  // Options with no colour swatch (e.g. print designs) show the variant's own photo instead.
                  const thumb = swatch ? null : (view.variants.find((v) => v.options[option.name] === value && v.image)?.image ?? null);
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border-2 py-2 pr-5 pl-2.5 text-[0.9rem] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500",
                        !swatch && !thumb && "pl-5",
                        checked ? "border-berry-600 bg-berry-50 text-berry-700 shadow-ribbon" : "border-line bg-surface hover:border-berry-500",
                        !available && "text-ink-faint",
                      )}
                    >
                      <input
                        type="radio"
                        name={option.name}
                        value={value}
                        checked={checked}
                        onChange={() => choose(option.name, value)}
                        className="sr-only"
                        aria-describedby={!available ? `${option.name}-${value}-na` : undefined}
                      />
                      {swatch && (
                        <span
                          aria-hidden="true"
                          className="size-7 rounded-full ring-1 ring-ink/15"
                          style={{ background: swatch }}
                        />
                      )}
                      {thumb && (
                        <span className="img-skeleton relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-ink/15">
                          <Image src={thumb} alt="" fill sizes="36px" className="object-cover" />
                        </span>
                      )}
                      <span className={cn(!available && "line-through decoration-1")}>{shown}</span>
                      {!available && (
                        <span id={`${option.name}-${value}-na`} className="sr-only">
                          sold out
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        {view.story?.box && !ribbonOnly && <BoxContents box={view.story.box} />}
        {ribbonView && (
          <RibbonPicker addon={ribbonView} currency={view.currency} quantities={ribbonQty} offer={ribbonOffer} optional={!ribbonOnly} onChange={setRibbon} />
        )}
      </div>

      <div className="mt-8 space-y-3">
        {plainOffer && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-soft ring-1 ring-line" aria-live="polite">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-bold tracking-[0.12em] text-ink-soft uppercase">Your price</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tabular-nums">
                <span key={plainOffer.total} className="numeral text-[1.9rem] leading-none font-semibold text-berry-600 motion-safe:animate-[pop_0.5s_var(--ease-spring)_both]">
                  {formatMoney(plainOffer.total, view.currency)}
                </span>
                {plainOffer.compare != null && <s className="text-[1.05rem] text-ink-faint">{formatMoney(plainOffer.compare, view.currency)}</s>}
              </p>
              <p className="mt-1.5 text-[0.74rem] text-ink-soft">
                {plainOffer.line}
                {ribbonOffer.code && <> · code <span className="numeral font-semibold tracking-wide text-berry-600">{ribbonOffer.code}</span> applied</>}
              </p>
            </div>
            {plainOffer.pct != null && plainOffer.compare != null && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="numeral rounded-md bg-berry-600 px-2.5 py-1 text-[0.8rem] leading-none font-bold text-snow">Save {plainOffer.pct}%</span>
                <span className="text-[0.72rem] font-semibold text-pine-700 tabular-nums">
                  You save {formatMoney(round2(plainOffer.compare - plainOffer.total), view.currency)}
                </span>
              </div>
            )}
          </div>
        )}
        {ribbonOnly && ribbonOffer.units > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-soft ring-1 ring-line" aria-live="polite">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-bold tracking-[0.12em] text-ink-soft uppercase">Your price</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tabular-nums">
                <span key={ribbonOffer.total} className="numeral text-[1.9rem] leading-none font-semibold text-berry-600 motion-safe:animate-[pop_0.5s_var(--ease-spring)_both]">
                  {formatMoney(ribbonOffer.total, view.currency)}
                </span>
                {ribbonOffer.compare != null && <s className="text-[1.05rem] text-ink-faint">{formatMoney(ribbonOffer.compare, view.currency)}</s>}
              </p>
              <p className="mt-1.5 text-[0.74rem] text-ink-soft">
                {ribbonOffer.units} ribbon{ribbonOffer.units === 1 ? "" : "s"}
                {ribbonOffer.units > 1 && ` · ${formatMoney(Math.floor((ribbonOffer.total / ribbonOffer.units) * 100 + 1e-6) / 100, view.currency)} each`}
                {ribbonOffer.code && <> · code <span className="numeral font-semibold tracking-wide text-berry-600">{ribbonOffer.code}</span> applied</>}
              </p>
            </div>
            {ribbonOffer.pct != null && ribbonOffer.compare != null && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="numeral rounded-md bg-berry-600 px-2.5 py-1 text-[0.8rem] leading-none font-bold text-snow">Save {ribbonOffer.pct}%</span>
                <span className="text-[0.72rem] font-semibold text-pine-700 tabular-nums">
                  You save {formatMoney(round2(ribbonOffer.compare - ribbonOffer.total), view.currency)}
                </span>
              </div>
            )}
          </div>
        )}
        {bundle && currentOffer && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-soft ring-1 ring-line" aria-live="polite">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-bold tracking-[0.12em] text-ink-soft uppercase">Your price</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tabular-nums">
                <span key={currentOffer.total} className="numeral text-[1.9rem] leading-none font-semibold text-berry-600 motion-safe:animate-[pop_0.5s_var(--ease-spring)_both]">
                  {formatMoney(currentOffer.total, view.currency)}
                </span>
                {currentOffer.compare != null && <s className="text-[1.05rem] text-ink-faint">{formatMoney(currentOffer.compare, view.currency)}</s>}
              </p>
              <p className="mt-1.5 text-[0.74rem] text-ink-soft">
                {count > 1 ? `${formatMoney(currentOffer.unit, view.currency)} each · ${count} ${bundle.noun}s` : `1 ${bundle.noun}`}
                {currentOffer.code && <> · code <span className="numeral font-semibold tracking-wide text-berry-600">{currentOffer.code}</span> applied</>}
                {packChoices.find((p) => p.selected) && ` · ${packChoices.find((p) => p.selected)!.label.toLowerCase()}${count > 1 ? ` per ${bundle.noun}` : ""}`}
              </p>
            </div>
            {currentOffer.pct != null && currentOffer.compare != null && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="numeral rounded-md bg-berry-600 px-2.5 py-1 text-[0.8rem] leading-none font-bold text-snow">Save {currentOffer.pct}%</span>
                <span className="text-[0.72rem] font-semibold text-pine-700 tabular-nums">
                  You save {formatMoney(round2(currentOffer.compare - currentOffer.total), view.currency)}
                </span>
              </div>
            )}
          </div>
        )}
        {/* Shipping strip with the offer deadline beside it (below it on phones). */}
        <div className="flex flex-wrap items-stretch gap-x-3 gap-y-2.5 sm:flex-nowrap">
          <FreeShippingStrip total={orderTotal / priceRatio} currency={view.currency} ratio={priceRatio} />
          {view.offerEndsAt && <SaleCountdown endsAt={view.offerEndsAt} />}
        </div>
        {lowStock && <LowStockAlert left={lowStock.left} wanted={lowStock.wanted} />}

        <div className="flex gap-3">
          {!hasPack && !bundle && !ribbonOnly && (
            <div className="flex shrink-0 items-center rounded-full border border-line bg-surface">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="grid size-12 place-items-center rounded-full hover:bg-cream disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                aria-label="Decrease quantity"
              >
                <Icon name="minus" className="size-4" />
              </button>
              <span className="numeral w-6 text-center text-[1.05rem]" aria-live="polite" aria-label={`Quantity ${qty}`}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                disabled={qty >= 10}
                className="grid size-12 place-items-center rounded-full hover:bg-cream disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                aria-label="Increase quantity"
              >
                <Icon name="plus" className="size-4" />
              </button>
            </div>
          )}
          <button
            ref={buttonRef}
            type="button"
            className="btn btn-primary shine min-h-14 flex-1 text-[0.85rem]"
            onClick={onAdd}
            disabled={!canBuy}
          >
            {ribbonOnly && ribbonUnits === 0 ? (
              "Pick your ribbons"
            ) : !variant || (bundle && !bundleComplete) ? (
              "Choose your options"
            ) : !canBuy ? (
              "Sold out"
            ) : added ? (
              <>
                <Icon name="check" className="size-4" strokeWidth={2.4} /> Added to bag
              </>
            ) : (
              <>
                <Icon name="bag" className="size-4.5" /> Add to bag
                {variant && <span className="ml-1 tabular-nums opacity-90">· {formatMoney(orderTotal, view.currency)}</span>}
              </>
            )}
          </button>
        </div>
        {payments.length > 0 ? (
          <PaymentIcons methods={payments} />
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-[0.75rem] text-ink-soft">
            <Icon name="lock" className="size-3.5" /> Secure checkout by Shopify
          </p>
        )}
      </div>

      {/* Floating add-to-bag bar: appears once the main button has scrolled out of view (all screen sizes). */}
      <div
        className={cn(
          "fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl rounded-2xl bg-surface p-2 pl-2.5 shadow-lift ring-1 ring-line transition-transform duration-500 ease-out-soft",
          showSticky ? "translate-y-0" : "translate-y-[calc(100%+1.5rem)]",
        )}
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* The cameras in the bag, fanned like the bundle card (fixed width, so the text never gets pushed) */}
          <span className="relative size-14 shrink-0 sm:size-16">
            <Fan
              images={
                ribbonOnly
                  ? (ribbonView!.variants.filter((v) => ribbonQty[v.id]).map((v) => v.image).slice(0, 3).concat(null).slice(0, Math.max(1, Math.min(3, Object.keys(ribbonQty).length))))
                  : bundle
                    ? picks.slice(0, count).map(colourImage)
                    : [variant?.image ?? view.cardImage?.url ?? null]
              }
              size="64px"
            />
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-[0.82rem] sm:text-[0.86rem] leading-tight font-semibold">
              {bundle
                ? `${count} ${bundle.noun}${count === 1 ? ` · ${shortName(picks[0]!)}` : "s"}`
                : ribbonOnly
                  ? `${ribbonUnits || "No"} ribbon${ribbonUnits === 1 ? "" : "s"}`
                  : `${variant?.label || view.name}${ribbonUnits ? ` + ${ribbonUnits} ribbon${ribbonUnits === 1 ? "" : "s"}` : ""}`}
            </p>
            {variant && (
              <p className="mt-0.5 flex min-w-0 items-center gap-x-1.5 overflow-hidden whitespace-nowrap tabular-nums">
                <span className="numeral text-[1rem] leading-none font-semibold text-berry-600">{formatMoney(orderTotal, view.currency)}</span>
                {stickyCompare != null && <s className="text-[0.78rem] text-ink-faint max-[389px]:hidden">{formatMoney(stickyCompare, view.currency)}</s>}
                {stickyPct != null && stickyCompare != null && (
                  <span className="numeral rounded bg-berry-600 px-1.5 py-[0.2rem] text-[0.62rem] leading-none font-bold text-snow">−{stickyPct}%</span>
                )}
              </p>
            )}
          </div>
          <button type="button" className="btn btn-primary min-h-12 shrink-0 px-4 sm:px-7" onClick={added ? open : onAdd} disabled={!canBuy}>
            {added ? "View bag" : canBuy ? "Add to bag" : "Sold out"}
          </button>
        </div>
      </div>
    </div>
  );
}
