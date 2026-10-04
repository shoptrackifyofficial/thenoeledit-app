"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Countdown } from "@/components/home/Countdown";
import { Icon } from "@/components/ui/Icon";
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
  navy: "#1f2a44", blue: "#3b6aa0", pink: "#e8b4bc", grey: "#9a9a96", gray: "#9a9a96", brown: "#6b4a33",
};
const swatchFor = (value: string) => SWATCH[value.trim().toLowerCase()] ?? null;

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
      : cn("bg-surface", c.checked ? "border-gold-500" : "border-line hover:border-pine-300");

  const Dot = ({ checked, featured }: { checked: boolean; featured: boolean }) => (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 place-items-center rounded-full border-2 transition-colors",
        checked ? (featured ? "border-gold-600 bg-gold-600" : "border-gold-500 bg-gold-500") : "border-line bg-surface",
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

/* ── "Free gift wrap unlocked" strip (reference's celebratory strip) ──── */

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

function GiftWrapUnlocked() {
  return (
    <div className="relative min-w-0 flex-1 basis-56 overflow-hidden rounded-xl border border-dashed border-pine-300 bg-pine-900 py-1.5 pr-3 pl-2 text-pine-200">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[sweep_3.6s_ease-in-out_infinite]"
      />
      <div className="relative flex items-center gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-pine-300 motion-safe:animate-[unlock-ring_1.8s_ease-out_0.5s_2]" />
          {CONFETTI.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "absolute top-1/2 left-1/2 h-1.5 w-1 rounded-[1px] opacity-0 motion-safe:animate-[unlock-burst_1.1s_ease-out_0.35s_1_both]",
                p.c,
              )}
              style={{ "--bx": `${p.x}px`, "--by": `${p.y}px`, "--br": `${p.r}deg` } as React.CSSProperties}
            />
          ))}
          <span className="relative grid size-9 place-items-center text-berry-600 motion-safe:animate-[pop_0.6s_var(--ease-spring)_both]">
            <Icon name="gift" className="size-6" strokeWidth={1.6} />
          </span>
        </span>
        <p className="min-w-0 leading-tight">
          <span className="block text-[0.82rem] font-semibold">Free gift wrapping unlocked</span>
          <span className="block text-[0.7rem] text-ink-soft">Ribbon + handwritten card, added in your bag</span>
        </p>
      </div>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────── */

export function PurchasePanel({ view }: { view: ProductView }) {
  const { add, open } = useCart();
  const initial = view.variants.find((v) => v.id === view.defaultVariantId) ?? view.variants[0]!;
  const [selection, setSelection] = useState<Record<string, string>>(initial.options);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const variant = findVariant(view, selection);
  const canBuy = Boolean(variant?.availableForSale);
  const hasPack = view.packOptionName !== null;

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
          return (
            <fieldset key={option.name} className="min-w-0">
              <legend className="mb-3 flex w-full items-baseline justify-between text-[0.95rem] font-semibold">
                {option.name}
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
                        checked ? "border-gold-500 bg-pine-900" : "border-line bg-surface hover:border-pine-300",
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
        <div className="flex flex-wrap items-center gap-3">
          <GiftWrapUnlocked />
          <div className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.12em] text-berry-600 uppercase">
            <Icon name="clock" className="size-4" />
            <span>Sale ends in</span>
            <Countdown endsAt={view.saleEndsAt} tone="dark" size="sm" className="normal-case" />
          </div>
        </div>

        <div className="flex gap-3">
          {!hasPack && (
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
            {!variant ? (
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
                {variant && (
                  <span className="numeral ml-1 opacity-85">· {formatMoney(variant.price * (hasPack ? 1 : qty), view.currency)}</span>
                )}
              </>
            )}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[0.75rem] text-ink-soft">
          <Icon name="lock" className="size-3.5" /> Secure checkout by Shopify · Pay with card or express wallets
        </p>
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
            <p className="truncate text-[0.88rem] font-semibold">{variant?.label || view.name}</p>
            {variant && (
              <p className="numeral flex gap-1.5 text-[0.9rem]">
                <span className="text-berry-600">{formatMoney(variant.price, view.currency)}</span>
                {variant.compareAtPrice && <s className="text-ink-faint">{formatMoney(variant.compareAtPrice, view.currency)}</s>}
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
