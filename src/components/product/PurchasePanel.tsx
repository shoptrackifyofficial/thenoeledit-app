"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { LowStockAlert } from "@/components/product/LowStockAlert";
import { Icon } from "@/components/ui/Icon";
import { PaymentIcons } from "@/components/ui/PaymentIcons";
import type { PaymentMethod } from "@/lib/shopify/payments";
import { site } from "@/content/site";
import { trackCustomizeProduct, trackViewItem } from "@/lib/analytics";
import type { ProductView, ViewVariant } from "@/lib/commerce/product-view";
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
  "dark green": "#2f4a3a", navy: "#1f2a44", blue: "#3b6aa0", pink: "#e8b4bc", grey: "#9a9a96", gray: "#9a9a96", brown: "#6b4a33",
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
function FreeShippingStrip({ total, currency }: { total: number; currency: string }) {
  const threshold = site.delivery.freeOver;
  const unlocked = total >= threshold;
  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 basis-56 overflow-hidden rounded-xl border border-dashed py-1.5 pr-3 pl-2",
        unlocked ? "border-gold-400 bg-gold-100 text-ink" : "border-line bg-cream text-ink",
      )}
    >
      {unlocked && (
        <span
          aria-hidden="true"
          className="unlock-anim pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[unlock-sweep_3.6s_ease-in-out_infinite]"
        />
      )}
      <div className="relative flex items-center gap-3">
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
              <span className="block text-[0.7rem] text-ink-soft">Applied to this order</span>
            </>
          ) : (
            <>
              <span className="block text-[0.82rem] font-semibold">Add {formatMoney(threshold - total, currency)} for free shipping</span>
              <span className="block text-[0.7rem] text-ink-soft">Free on orders over {formatMoney(threshold, currency)}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── Bundle picker: how many, and which colour for each ─────────────── */

/** A camera-lens swatch: the colour body with a glassy lens ring in the middle. */
function Lens({ value, active, className }: { value: string; active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid shrink-0 place-items-center rounded-full ring-1 ring-ink/20 transition-transform duration-300 ease-out-soft", active && "scale-110", className)}
      style={{ background: swatchFor(value) ?? "#d8d2c6" }}
    >
      <span className="size-[46%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#6b7a8f,#10141c_65%)] ring-[1.5px] ring-gold-400/80" />
    </span>
  );
}

type PackChoice = { value: string; label: string; price: number; selected: boolean };

/**
 * "Build your set": up to `max` camera slots in one row. A filled slot shows
 * that camera's photo with lens-style colour dots under it; an empty slot is a
 * dashed "+ Add" tile. Tap + to add a camera, × to remove one, and a small
 * segmented switch sets the template pack for the set. Every control is a
 * native radio or button, so keyboard and screen readers work for free.
 * Prices are Shopify's real per-variant prices; nothing here invents a discount.
 */
function BundlePicker({
  noun,
  max,
  values,
  count,
  picks,
  unit,
  currency,
  packs,
  imageFor,
  isAvailable,
  onCount,
  onRemove,
  onPack,
  onPick,
}: {
  noun: string;
  max: number;
  values: string[];
  count: number;
  picks: string[];
  unit: number;
  currency: string;
  packs: PackChoice[];
  imageFor: (value: string) => string | null;
  isAvailable: (value: string) => boolean;
  onCount: (n: number) => void;
  onRemove: (index: number) => void;
  onPack: (value: string) => void;
  onPick: (index: number, value: string) => void;
}) {
  const packIndex = Math.max(0, packs.findIndex((p) => p.selected));
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Build your set</legend>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.95rem] font-semibold whitespace-nowrap">
          Your set
          <span className="numeral rounded-full bg-berry-600 px-2 py-0.5 text-[0.72rem] leading-none text-snow">
            {count} × {noun}
          </span>
        </p>

        {/* Template pack: a two-way switch with a sliding thumb */}
        {packs.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Stencils in each camera"
            className="relative grid shrink-0 rounded-full bg-cream p-1 ring-1 ring-line"
            style={{ gridTemplateColumns: `repeat(${packs.length}, minmax(0, 1fr))` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 rounded-full bg-surface shadow-soft ring-1 ring-berry-200 transition-transform duration-300 ease-out-soft"
              style={{ width: `calc((100% - 0.5rem) / ${packs.length})`, transform: `translateX(${packIndex * 100}%)` }}
            />
            {packs.map((pk) => (
              <label
                key={pk.value}
                className={cn(
                  "relative z-10 cursor-pointer rounded-full px-3 py-1.5 text-center text-[0.76rem] leading-none font-bold whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:outline-gold-500",
                  pk.selected ? "text-berry-700" : "text-ink-soft hover:text-ink",
                )}
              >
                <input type="radio" name="bundle-pack" value={pk.value} checked={pk.selected} onChange={() => onPack(pk.value)} className="sr-only" />
                {pk.label.replace(/\s*(stencils?|templates?)$/i, "")}
                <span className="font-semibold opacity-70"> stencils</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {Array.from({ length: max }, (_, i) => {
          if (i >= count) {
            return (
              <li key={`add-${i}`}>
                <button
                  type="button"
                  onClick={() => onCount(i + 1)}
                  className="group flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line bg-cream/50 text-ink-soft transition-[border-color,background-color,color] hover:border-berry-500 hover:bg-berry-50 hover:text-berry-700"
                  aria-label={`Add a ${noun} (${formatMoney(unit, currency)})`}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-surface shadow-soft ring-1 ring-line transition-transform duration-300 ease-out-soft group-hover:scale-110 group-hover:rotate-90">
                    <Icon name="plus" className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[0.74rem] leading-tight font-semibold">Add {noun}</span>
                  <span className="numeral text-[0.72rem] opacity-80">+{formatMoney(unit, currency)}</span>
                </button>
              </li>
            );
          }
          const colour = picks[i] ?? values[0]!;
          const img = imageFor(colour);
          return (
            <li key={`cam-${i}`} className="animate-[pop_0.35s_var(--ease-spring)]">
              <div
                role="radiogroup"
                aria-label={count === 1 ? "Colour" : `Colour for ${noun} ${i + 1}`}
                className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-surface shadow-soft ring-2 ring-berry-600/80"
              >
                <span className="relative block min-h-0 flex-1 bg-cream">
                  {img && <Image key={img} src={img} alt="" fill sizes="120px" className="animate-[fade_0.35s_ease-out] object-cover" />}
                  <span aria-hidden="true" className="numeral absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-ink/80 text-[0.66rem] text-snow backdrop-blur">
                    {i + 1}
                  </span>
                  {count > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur transition-colors hover:bg-berry-600 hover:text-snow"
                      aria-label={`Remove ${noun} ${i + 1}`}
                    >
                      <Icon name="close" className="size-3.5" strokeWidth={2.2} />
                    </button>
                  )}
                </span>
                <span className="flex items-center justify-center gap-1.5 px-1 pt-2">
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
                        <input
                          type="radio"
                          name={`bundle-colour-${i}`}
                          value={value}
                          checked={on}
                          disabled={!ok}
                          onChange={() => onPick(i, value)}
                          className="sr-only"
                        />
                        <span className="sr-only">{shortName(value)}</span>
                        <Lens value={value} active={on} className="size-5" />
                      </label>
                    );
                  })}
                </span>
                <span className="truncate px-1 pt-1 pb-2 text-center text-[0.7rem] font-semibold text-ink-soft">{shortName(colour)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {count < max && (
        <p className="mt-2 text-center text-[0.74rem] text-ink-faint">Tap + to add a {noun} — mix any colours.</p>
      )}
    </fieldset>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────── */

export function PurchasePanel({ view, payments = [] }: { view: ProductView; payments?: PaymentMethod[] }) {
  const { add, open } = useCart();
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

  const bundleQty = bundleLines.reduce((n, l) => n + l.quantity, 0);
  const bundleTotal = Math.round(bundleLines.reduce((s, l) => s + l.variant.price * l.quantity, 0) * 100) / 100;
  const bundleComplete = bundle ? bundleQty === count : true;
  const canBuy = bundle
    ? bundleComplete && bundleLines.every((l) => l.variant.availableForSale)
    : Boolean(variant?.availableForSale);
  /** What the order costs right now (all cameras), for the shipping strip, the button and the sticky bar. */
  const orderTotal = bundle ? bundleTotal : variant ? variant.price * (hasPack ? 1 : qty) : 0;

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

  const colourAvailable = (colour: string) => {
    const v = bundle ? findVariant(view, { ...selection, [bundle.option]: colour }) : undefined;
    return Boolean(v?.availableForSale);
  };

  /** The template-pack choices (e.g. 4 or 12), each with its per-camera price for the current colour. */
  const packChoices: PackChoice[] =
    bundle && packOption
      ? packOption.values.map((value) => ({
          value,
          label: view.story?.valueLabels[value] ?? value,
          selected: selection[packOption.name] === value,
          price: findVariant(view, { ...selection, [packOption.name]: value })?.price ?? variant?.price ?? 0,
        }))
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
    const io = new IntersectionObserver(([entry]) =>
      setShowSticky(!entry!.isIntersecting && entry!.boundingClientRect.top < 0),
    );
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

  const onAdd = () => {
    if (bundle) {
      if (!canBuy) return;
      for (const { variant: v, quantity } of bundleLines) {
        add(v.id, quantity, {
          productName: view.name,
          variantLabel: v.label,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          image: v.image ?? view.cardImage?.url ?? null,
          href: `${view.href}?variant=${numericId(v.id)}`,
          available: true,
          productId: view.productId,
          category: view.category.title,
        });
      }
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
      return;
    }
    if (!variant || !canBuy) return;
    add(variant.id, hasPack ? 1 : qty, {
      productName: view.name,
      variantLabel: variant.label,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      image: variant.image ?? view.cardImage?.url ?? null,
      href: `${view.href}?variant=${numericId(variant.id)}`,
      available: true,
      productId: view.productId,
      category: view.category.title,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const priceBlock = useMemo(() => {
    if (!variant || hasPack) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="numeral text-[2rem] leading-none font-semibold text-berry-600" aria-live="polite">
          {formatMoney(variant.price, view.currency)}
        </p>
        {variant.compareAtPrice && (
          <s className="numeral text-[1.1rem] text-ink-faint">{formatMoney(variant.compareAtPrice, view.currency)}</s>
        )}
        {variant.compareAtPercent && (
          <span className="numeral rounded-md bg-berry-600 px-2.5 py-1 text-[0.8rem] leading-none font-bold text-snow">
            −{variant.compareAtPercent}% OFF
          </span>
        )}
      </div>
    );
  }, [variant, hasPack, view.currency]);

  return (
    <div>
      {priceBlock && <div className="mb-7">{priceBlock}</div>}

      <div className="space-y-7">
        {view.options.map((option) => {
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
                unit={variant?.price ?? 0}
                currency={view.currency}
                packs={packChoices}
                imageFor={colourImage}
                isAvailable={colourAvailable}
                onCount={setBundleCount}
                onRemove={removeBundleCamera}
                onPack={(value) => packOption && choose(packOption.name, value)}
                onPick={setBundlePick}
              />
            );
          }
          return (
            <fieldset key={option.name} className="min-w-0">
              <legend className="mb-3 flex w-full items-baseline justify-between text-[0.95rem] font-semibold">
                {option.label}
                <span className="font-normal text-ink-soft">{selection[option.name]}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {option.values.map((value) => {
                  const available = optionAvailable(option.name, value);
                  const checked = selection[option.name] === value;
                  const swatch = swatchFor(value);
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border-2 py-2 pr-5 pl-2.5 text-[0.9rem] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500",
                        !swatch && "pl-5",
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
                      <span className={cn(!available && "line-through decoration-1")}>{value}</span>
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
      </div>

      <div className="mt-8 space-y-3">
        <FreeShippingStrip total={orderTotal} currency={view.currency} />
        {lowStock && <LowStockAlert left={lowStock.left} wanted={lowStock.wanted} />}

        <div className="flex gap-3">
          {!hasPack && !bundle && (
            <div className="flex shrink-0 items-center rounded-full border border-line bg-surface">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid size-12 place-items-center rounded-full hover:bg-cream"
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
                className="grid size-12 place-items-center rounded-full hover:bg-cream"
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
            {!variant || (bundle && !bundleComplete) ? (
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
                {variant && <span className="numeral ml-1 opacity-85">· {formatMoney(orderTotal, view.currency)}</span>}
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

      {/* Sticky mobile bar */}
      <div
        className={cn(
          "glass fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 rounded-[1.4rem] p-2.5 pl-4 shadow-lift ring-1 ring-line transition-transform duration-500 ease-out-soft lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-[calc(100%+1.5rem)]",
        )}
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.88rem] font-semibold">
              {bundle ? `${count} ${bundle.noun}${count === 1 ? "" : "s"}` : variant?.label || view.name}
            </p>
            {variant && (
              <p className="numeral flex gap-1.5 text-[0.9rem]">
                <span className="text-berry-600">{formatMoney(bundle ? orderTotal : variant.price, view.currency)}</span>
                {!bundle && variant.compareAtPrice && <s className="text-ink-faint">{formatMoney(variant.compareAtPrice, view.currency)}</s>}
              </p>
            )}
          </div>
          <button type="button" className="btn btn-primary min-h-12 px-6" onClick={added ? open : onAdd} disabled={!canBuy}>
            {added ? "View bag" : canBuy ? "Add to bag" : "Sold out"}
          </button>
        </div>
      </div>
    </div>
  );
}
