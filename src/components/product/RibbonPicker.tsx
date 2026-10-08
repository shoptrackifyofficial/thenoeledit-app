"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { ViewAddon, ViewAddonVariant } from "@/lib/commerce/addon";
import { round2, tierPercent } from "@/lib/commerce/tiers";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type RibbonOffer = {
  units: number;
  /** What the shopper pays for these units. */
  total: number;
  /** Struck-through original, or null. */
  compare: number | null;
  pct: number | null;
  code: string | null;
};

const GalleryLightbox = dynamic(() => import("@/components/product/GalleryLightbox"), { ssr: false });

/** The look of one tape: its colour, with the print colour as an "Aa" on top. */
function Tape({ v, className }: { v: ViewAddonVariant; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid place-items-center rounded-full font-display leading-none shadow-[inset_0_0_0_1px_rgb(14_26_51/0.16)]", className)}
      style={{ background: v.tapeHex ?? "#e8e2d6", color: v.inkHex ?? "#222" }}
    >
      Aa
    </span>
  );
}

/**
 * Pick any ribbon colours in any quantity. Each colour is a tape swatch (the circle
 * is the ribbon, the "Aa" the print colour) with its own − / + stepper once chosen.
 * The more ribbons in total, the bigger the offer (same ladder as the camera
 * bundle), shown as a live summary line. Prices are Shopify's own.
 *
 * Used twice: as the optional "add ribbons" extra on the printer's page
 * (`optional`), and as the main picker on the ribbon's own page.
 */
export function RibbonPicker({
  addon,
  currency,
  quantities,
  offer,
  optional,
  onChange,
}: {
  addon: ViewAddon;
  currency: string;
  quantities: Record<string, number>;
  offer: RibbonOffer;
  optional: boolean;
  onChange: (id: string, quantity: number) => void;
}) {
  const maxPct = addon.discounts.length ? tierPercent(addon, addon.discounts.length) : 0;
  // Tap the magnifier on a photo to see that ribbon big (swipe through all of them).
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const withPhoto = addon.variants.filter((v) => v.image);
  const lead = addon.variants.find((v) => (quantities[v.id] ?? 0) > 0);
  const photo = lead?.image ?? addon.image;

  return (
    <fieldset id="ribbon-picker" className="min-w-0 scroll-mt-28">
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3 text-[0.95rem] font-semibold">
        {optional ? "Add printed ribbon" : "Choose your ribbons"}
        <span className="text-[0.78rem] font-normal text-ink-soft">
          {optional ? "Optional · " : ""}any colours, any amount
        </span>
      </legend>

      <div className="rounded-2xl bg-cream/70 p-3 ring-1 ring-line">
        {optional && (
          <div className="mb-3 flex items-center gap-3">
            <span className="img-skeleton relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-line/60">
              {photo && <Image key={photo} src={photo} alt="" fill sizes="56px" className="animate-[fade_0.35s_ease-out] object-cover" />}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9rem] leading-tight font-bold">{addon.name}</p>
              <p className="mt-0.5 text-[0.76rem] leading-snug text-ink-soft">{addon.intro}</p>
            </div>
          </div>
        )}

        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {addon.variants.map((v) => {
            const q = quantities[v.id] ?? 0;
            const on = q > 0;
            const out = !v.availableForSale;
            return (
              <li
                key={v.id}
                className={cn(
                  "relative rounded-2xl bg-surface ring-1 transition-colors",
                  on ? "ring-2 ring-berry-600" : "ring-line hover:ring-berry-500",
                  out && "opacity-40",
                )}
              >
                {/* The whole card is the toggle: tap anywhere to add it, tap again to remove it. */}
                <button
                  type="button"
                  disabled={out}
                  onClick={() => onChange(v.id, on ? 0 : 1)}
                  aria-pressed={on}
                  aria-label={`${v.label}, ${formatMoney(v.price, currency)}${out ? ", sold out" : ""}`}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                />
                <div className="pointer-events-none relative flex items-center gap-2.5 p-1.5 pr-2">
                  {/* The real photo of this ribbon, so shoppers see exactly what they pick; the tape swatch is the fallback. */}
                  <span className="relative shrink-0">
                    {v.image ? (
                      <span className="img-skeleton relative block size-16 overflow-hidden rounded-xl ring-1 ring-line/60">
                        <Image src={v.image} alt="" fill sizes="64px" className="object-cover" />
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 left-1 size-3.5 rounded-full shadow-[0_0_0_1.5px_white,inset_0_0_0_1px_rgb(14_26_51/0.2)]"
                          style={{ background: v.tapeHex ?? "#e8e2d6" }}
                        />
                      </span>
                    ) : (
                      <Tape v={v} className="size-16 rounded-xl text-[1rem]" />
                    )}
                    {on && (
                      <span aria-hidden="true" className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-berry-600 text-snow ring-2 ring-white">
                        <Icon name="check" className="size-3" strokeWidth={3} />
                      </span>
                    )}
                    {v.image && (
                      <button
                        type="button"
                        onClick={() => setZoomAt(withPhoto.findIndex((x) => x.id === v.id))}
                        aria-label={`Preview ${v.label}`}
                        className="pointer-events-auto absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow-soft ring-1 ring-line hover:bg-white"
                      >
                        <Icon name="search" className="size-3" />
                      </button>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.72rem] leading-tight font-semibold">
                    <span className="line-clamp-2 leading-tight" title={v.label}>
                      {v.label}
                    </span>
                    {/* Price (and compare-at) stay visible whether or not the ribbon is selected */}
                    <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 font-normal tabular-nums">
                      {out ? (
                        <span className="text-ink-soft">Sold out</span>
                      ) : (
                        <>
                          <span className="font-semibold text-berry-600">{formatMoney(v.price, currency)}</span>
                          {v.compareAt != null && <s className="text-[0.66rem] text-ink-faint">{formatMoney(v.compareAt, currency)}</s>}
                        </>
                      )}
                    </span>
                    {on && (
                      <span className="pointer-events-auto mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onChange(v.id, q - 1)}
                            aria-label={`Fewer ${v.label}`}
                            className="grid size-6 place-items-center rounded-md bg-cream hover:bg-linen"
                          >
                            <Icon name="minus" className="size-3" />
                          </button>
                          <span className="w-5 text-center tabular-nums" aria-live="polite">
                            {q}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChange(v.id, q + 1)}
                            disabled={q >= 20}
                            aria-label={`More ${v.label}`}
                            className="grid size-6 place-items-center rounded-md bg-cream hover:bg-linen disabled:opacity-40"
                          >
                            <Icon name="plus" className="size-3" />
                          </button>
                        </span>
                        {q > 1 && <span className="font-normal text-ink-soft tabular-nums">= {formatMoney(round2(v.price * q), currency)}</span>}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {zoomAt !== null && (
          <GalleryLightbox
            slides={withPhoto.map((v) => ({ src: v.image!, alt: v.label, description: `${v.label} · ${formatMoney(v.price, currency)}` }))}
            index={zoomAt}
            onClose={() => setZoomAt(null)}
          />
        )}

        <p className="mt-3 text-[0.76rem] text-ink-soft" aria-live="polite">
          {offer.units === 0 ? (
            <>Tap a ribbon to add it{maxPct ? <> — the more you add, the more you save (up to <b className="text-berry-600">{maxPct}% off</b>)</> : null}.</>
          ) : (
            <>
              <b className="text-ink">{offer.units} ribbon{offer.units === 1 ? "" : "s"}</b> selected
              {offer.pct != null && <> · <b className="text-berry-600">{offer.pct}% off</b></>}
              {optional && <> · {formatMoney(offer.total, currency)}</>}
            </>
          )}
        </p>
      </div>
    </fieldset>
  );
}
