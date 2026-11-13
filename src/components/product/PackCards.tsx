"use client";

import Image from "next/image";

import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One pack choice, ready to draw: its real price, the struck-through value (never on a single), and its photo. */
export type PackCard = {
  key: string;
  label: string;
  units: number;
  /** What the shopper pays for the whole pack. */
  price: number;
  /** Value of the pack at the single's price (only when it is more than `price`). */
  compare: number | null;
  /** Merchandising badge, e.g. "Buy 2 Get 1 Free". */
  tag: string | null;
  /** The best-value pack, drawn in gold. */
  featured: boolean;
  checked: boolean;
  available: boolean;
  img: string | null;
  /** The photo already shows every unit (so it is not fanned out). */
  ownPhoto: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One photo fanned out as `units` overlapping copies, or shown as it is when it already holds the whole pack. */
function Fan({ src, units, own, sizes }: { src: string; units: number; own: boolean; sizes: string }) {
  if (own)
    return (
      <span className="absolute inset-0 overflow-hidden rounded-lg">
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      </span>
    );
  const n = Math.min(Math.max(units, 1), 3);
  const step = n === 2 ? 24 : 16;
  const width = 100 - (n - 1) * step;
  return (
    <span className="absolute inset-0">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="absolute inset-y-0 overflow-hidden rounded-lg ring-2 ring-snow" style={{ left: `${i * step}%`, width: `${width}%`, zIndex: i }}>
          <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
        </span>
      ))}
    </span>
  );
}

function Dot({ checked, featured }: { checked: boolean; featured: boolean }) {
  return (
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
}

/** "Choose your pack" cards: stacked rows on phones, photo cards from tablet up. */
export function PackCards({ name, cards, currency, onPick }: { name: string; cards: PackCard[]; currency: string; onPick: (key: string) => void }) {
  const surface = (c: PackCard) =>
    c.featured
      ? cn("bg-gold-100", c.checked ? "border-gold-600" : "border-gold-300 hover:border-gold-600")
      : cn("bg-surface", c.checked ? "border-berry-600 shadow-ribbon" : "border-line hover:border-berry-500");
  const save = (c: PackCard) => (c.compare != null ? round2(c.compare - c.price) : 0);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-[0.95rem] font-semibold">Choose your pack</legend>

      {/* Phones: stacked rows */}
      <div className="grid gap-3.5 pt-2 sm:hidden">
        {cards.map((c) => (
          <label
            key={c.key}
            className={cn(
              "relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-3 transition-[border-color,transform] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500 motion-safe:active:scale-[0.985]",
              surface(c),
              !c.available && "cursor-not-allowed opacity-50",
            )}
          >
            <input type="radio" name={`${name}-m`} value={c.key} checked={c.checked} onChange={() => onPick(c.key)} disabled={!c.available} className="sr-only" />
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
            <span className="relative block h-12 w-16 shrink-0">{c.img && <Fan src={c.img} units={c.units} own={c.ownPhoto} sizes="48px" />}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[0.95rem] font-semibold">{c.label}</span>
              {save(c) > 0 && <span className="numeral text-[0.75rem] font-semibold text-berry-600">Save {formatMoney(save(c), currency)}</span>}
              {!c.available && <span className="text-[0.72rem] text-ink-soft">Sold out</span>}
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className={cn("numeral text-[1.2rem] leading-none font-semibold", c.featured && "text-berry-600")}>{formatMoney(c.price, currency)}</span>
              {c.compare != null && <s className="numeral mt-1 text-[0.92rem] font-medium text-ink-soft">{formatMoney(c.compare, currency)}</s>}
            </span>
          </label>
        ))}
      </div>

      {/* Tablet + desktop: photo cards */}
      <div className="hidden gap-3 pt-2 sm:grid" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
        {cards.map((c) => (
          <label
            key={c.key}
            className={cn(
              "relative flex cursor-pointer flex-col items-center rounded-2xl border-2 px-3 pb-3.5 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-500",
              c.tag ? "pt-8" : "pt-6",
              surface(c),
              !c.available && "cursor-not-allowed opacity-50",
            )}
          >
            <input type="radio" name={`${name}-d`} value={c.key} checked={c.checked} onChange={() => onPick(c.key)} disabled={!c.available} className="sr-only" />
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
            <span className="relative block aspect-4/3 w-full max-w-28">{c.img && <Fan src={c.img} units={c.units} own={c.ownPhoto} sizes="112px" />}</span>
            <span className="mt-2.5 text-[0.9rem] font-semibold">{c.label}</span>
            <span className={cn("numeral mt-0.5 text-[1.35rem] leading-tight font-semibold", c.featured && "text-berry-600")}>{formatMoney(c.price, currency)}</span>
            {c.compare != null && <s className="numeral text-[0.95rem] font-medium text-ink-soft">{formatMoney(c.compare, currency)}</s>}
            {save(c) > 0 && <span className="numeral mt-1.5 rounded-md bg-pine-900 px-2 py-0.5 text-[0.7rem] text-snow">Save {formatMoney(save(c), currency)}</span>}
            {!c.available && <span className="mt-1 text-[0.72rem] text-ink-soft">Sold out</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
