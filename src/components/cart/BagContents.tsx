"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { SaleCountdown } from "@/components/product/SaleCountdown";
import { PaymentIcons } from "@/components/ui/PaymentIcons";
import { site } from "@/content/site";
import { useLocalBand } from "@/components/localization/useLocalCards";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Bag body shared by the drawer and /cart (layout follows the reference
 * store): item cards with photo, variant, price, a "Saved x%" badge from
 * Shopify's real compare-at price, a quantity stepper and a bin button; then a
 * floating summary card with free-shipping progress,
 * subtotal / sale savings / total, the checkout button and the payment logos
 * Shopify accepts. `onNavigate` closes the drawer when a link is followed.
 */
export function BagContents({ onNavigate, variant = "drawer" }: { onNavigate?: () => void; variant?: "drawer" | "page" }) {
  const { lines, subtotal, savings, currency, freeShipping, setQuantity, remove, removeMany, checkout, hydrated, loading, demo, payments } =
    useCart();
  const budget50 = useLocalBand(50, currency);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The summary starts short in the drawer; on the full cart page there is room, so it starts open.
  const [open, setOpen] = useState(variant === "page");

  /** Free shipping on every order (site.delivery.freeOver = 0): no threshold, no progress bar. */
  const noMinimum = site.delivery.freeOver <= 0;
  const remaining = freeShipping.unlocked ? 0 : Math.max(0.01, freeShipping.remaining);
  const progress = freeShipping.unlocked ? 1 : Math.min(1, subtotal / Math.max(1, freeShipping.threshold));
  // A product with a bundle offer is one card ("3 cameras"), however many colours it holds.
  const groups = (() => {
    const out: { key: string; bundle: boolean; lines: typeof lines }[] = [];
    for (const line of lines) {
      const bundle = Boolean(line.tiers && line.productId);
      const existing = bundle ? out.find((g) => g.bundle && g.lines[0]!.productId === line.productId) : undefined;
      if (existing) existing.lines.push(line);
      else out.push({ key: bundle ? `bundle:${line.productId}` : line.variantId, bundle, lines: [line] });
    }
    return out;
  })();
  const codes = [...new Set(lines.map((l) => l.couponCode).filter((c): c is string => c !== null))];
  const original = Math.round((subtotal + savings) * 100) / 100;

  const onCheckout = async () => {
    setError(null);
    setPending(true);
    const result = await checkout();
    if (!result.ok) {
      setError(result.error);
      setPending(false);
    }
  };

  if (!hydrated || (loading && lines.length === 0)) {
    return (
      <div className="grid flex-1 place-items-center py-16" aria-busy="true">
        <Icon name="spinner" className="size-7 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-berry-50 text-berry-600 ring-1 ring-berry-100">
          <Icon name="bag" className="size-9" strokeWidth={1.3} />
        </span>
        <div>
          <p className="display-md">Your bag is empty</p>
          <p className="mt-2 text-[0.92rem] text-ink-soft">The best gifts are still waiting under the tree.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link href="/shop" onClick={onNavigate} className="btn btn-primary shine">
            Shop the sale <Icon name="arrow-right" className="size-4" />
          </Link>
          <Link href="/shop?budget=50" onClick={onNavigate} className="btn btn-outline">
            Gifts under {budget50}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", variant === "page" && "lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-10")}>
      {/* ── Items ─────────────────────────────────────────────────────── */}
      <ul
        aria-label="Items in your bag"
        className={cn("flex flex-col gap-2.5", variant === "drawer" && "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2")}
      >
        {groups.map((group) => {
          if (group.bundle) {
            const first = group.lines[0]!;
            const units = group.lines.reduce((n, l) => n + l.quantity, 0);
            const total = group.lines.reduce((n, l) => n + l.lineTotal, 0);
            const original = group.lines.reduce((n, l) => n + l.listTotal, 0);
            const noun = first.bundleNoun ?? "item";
            const pct = first.savedPercent;
            // One thumbnail per unit, fanned like the bundle card on the product page.
            const photos = group.lines.flatMap((l) => Array.from({ length: l.quantity }, () => l.image)).slice(0, 3);
            return (
              <li key={group.key} className="flex gap-3 rounded-[1.1rem] bg-surface p-2.5 shadow-soft ring-1 ring-line/70">
                <Link href={first.href} onClick={onNavigate} tabIndex={-1} aria-hidden="true" className="relative size-[4.5rem] shrink-0">
                  {photos.map((src, i) => {
                    const turn = photos.length === 1 ? 0 : (i - (photos.length - 1) / 2) * 9;
                    const shift = photos.length === 1 ? 0 : (i - (photos.length - 1) / 2) * 16;
                    return (
                      <span
                        key={i}
                        className="img-skeleton absolute inset-[8%] overflow-hidden rounded-xl shadow-soft ring-2 ring-surface"
                        style={{ transform: `translateX(${shift}%) rotate(${turn}deg)`, zIndex: i }}
                      >
                        {src && <Image src={src} alt="" fill sizes="72px" className="object-cover" />}
                      </span>
                    );
                  })}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={first.href} onClick={onNavigate} title={first.productName} className="line-clamp-2 text-[0.84rem] leading-snug font-semibold hover:underline">
                        {first.productName}
                      </Link>
                      <p className="mt-0.5 text-[0.74rem] font-semibold text-ink">
                        {units} {noun}
                        {units === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="flex shrink-0 flex-col items-end tabular-nums">
                      <span className="text-[0.86rem] font-bold">{formatMoney(total, currency)}</span>
                      {original > total && <s className="text-[0.72rem] text-ink-faint">{formatMoney(original, currency)}</s>}
                    </p>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[0.72rem] text-ink-soft">
                    {group.lines.map((l) => (
                      <li key={l.variantId} className="flex items-center gap-1.5">
                        <span className="size-1 shrink-0 rounded-full bg-berry-600/60" aria-hidden="true" />
                        <span className="min-w-0 truncate">{l.variantLabel}</span>
                        {l.quantity > 1 && <span className="shrink-0 font-semibold text-ink">× {l.quantity}</span>}
                        {!l.available && <span className="shrink-0 font-semibold text-berry-600">Sold out</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 flex items-center gap-x-1.5 text-[0.7rem]">
                    {pct != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-berry-50 px-1.5 py-0.5 font-bold text-berry-700 ring-1 ring-berry-100">
                        <Icon name="tag" className="size-3" /> Saved {pct}%
                      </span>
                    )}
                    {first.couponCode && (
                      <span className="text-ink-soft">
                        <span className="numeral font-semibold tracking-wide text-berry-600">{first.couponCode}</span> applied
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMany(group.lines.map((l) => l.variantId))}
                      className="-my-1.5 ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-berry-50 hover:text-berry-600"
                    >
                      <Icon name="trash" className="size-4" />
                      <span className="sr-only">Remove {first.productName}</span>
                    </button>
                  </p>
                </div>
              </li>
            );
          }
          const line = group.lines[0]!;
          const savedPct = line.savedPercent;
          const compareTotal = line.listTotal;
          return (
            <li key={line.variantId} className="flex gap-3 rounded-[1.1rem] bg-surface p-2.5 shadow-soft ring-1 ring-line/70">
              <Link
                href={line.href}
                onClick={onNavigate}
                tabIndex={-1}
                aria-hidden="true"
                className="img-skeleton relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl"
              >
                {line.image && <Image src={line.image} alt="" fill sizes="72px" className="object-cover" />}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={line.href}
                      onClick={onNavigate}
                      title={line.productName}
                      className="block truncate text-[0.84rem] leading-snug font-semibold hover:underline"
                    >
                      {line.productName}
                    </Link>
                    {line.variantLabel && (
                      <p className="truncate text-[0.74rem] text-ink-soft">
                        {line.variantLabel}
                        {line.tiers && line.quantity > 1 && <span className="font-semibold text-ink"> × {line.quantity}</span>}
                      </p>
                    )}
                  </div>
                  <p className="flex shrink-0 flex-col items-end tabular-nums">
                    <span className="text-[0.86rem] font-bold">{formatMoney(line.lineTotal, currency)}</span>
                    {compareTotal > line.lineTotal && (
                      <s className="text-[0.72rem] text-ink-faint">{formatMoney(compareTotal, currency)}</s>
                    )}
                  </p>
                </div>

                {savedPct != null && (
                  <p className="mt-1 flex items-center gap-x-1.5 gap-y-1 text-[0.7rem]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-berry-50 px-1.5 py-0.5 font-bold text-berry-700 ring-1 ring-berry-100">
                      <Icon name="tag" className="size-3" /> Saved {savedPct}%
                    </span>
                    {line.couponCode && (
                      <span className="text-ink-soft">
                        <span className="numeral font-semibold tracking-wide text-berry-600">{line.couponCode}</span> applied
                      </span>
                    )}
                    {line.tiers && (
                      // Bundle lines have no stepper (the bundle size is chosen on the product page): the bin sits at the row's right end.
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        className="-my-1.5 ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-berry-50 hover:text-berry-600"
                      >
                        <Icon name="trash" className="size-4" />
                        <span className="sr-only">Remove {line.productName}</span>
                      </button>
                    )}
                  </p>
                )}
                {!line.available && <p className="mt-1 text-[0.74rem] font-semibold text-berry-600">Sold out — remove to continue</p>}

                {!(line.tiers && savedPct != null) && (
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg bg-cream ring-1 ring-line" role="group" aria-label={`Quantity for ${line.productName}`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                        className="grid size-8 place-items-center rounded-lg hover:bg-linen"
                        aria-label="Decrease quantity"
                      >
                        <Icon name="minus" className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-[0.84rem] font-semibold tabular-nums" aria-live="polite">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                        disabled={line.quantity >= 10}
                        className="grid size-8 place-items-center rounded-lg hover:bg-linen disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Icon name="plus" className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.variantId)}
                      className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-berry-50 hover:text-berry-600"
                    >
                      <Icon name="trash" className="size-4" />
                      <span className="sr-only">Remove {line.productName}</span>
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Summary card ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-[1.4rem] bg-surface px-4 pt-4 shadow-lift ring-1 ring-line",
          variant === "drawer" ? "m-3 mt-2 pb-[max(1rem,env(safe-area-inset-bottom))]" : "mt-4 pb-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mt-0",
        )}
      >
        {/* Short version: total, free shipping and the saving on one row. Tap to open the full breakdown. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="bag-summary-details"
          className="flex w-full items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[0.66rem] font-bold tracking-[0.12em] text-ink-soft uppercase">{open ? "Order summary" : "Total"}</span>
            {!open && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="numeral text-[1.4rem] leading-none font-semibold tabular-nums">{formatMoney(subtotal, currency)}</span>
                {original > subtotal + 0.009 && <s className="text-[0.8rem] text-ink-faint tabular-nums">{formatMoney(original, currency)}</s>}
              </span>
            )}
          </span>
          {!open && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              {remaining === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-pine-600 py-0.5 pr-2 pl-1.5 text-[0.68rem] leading-none font-semibold text-snow">
                  <Icon name="truck" className="size-3" /> Free shipping
                </span>
              ) : (
                <span className="rounded-full bg-cream px-2 py-1 text-[0.68rem] leading-none font-semibold text-ink-soft">
                  Add {formatMoney(remaining, currency)} for free shipping
                </span>
              )}
              {savings > 0.009 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-berry-50 px-1.5 py-0.5 text-[0.68rem] leading-none font-bold text-berry-700 ring-1 ring-berry-100">
                  <Icon name="tag" className="size-3" /> Saved {Math.round((savings / original) * 100)}%
                </span>
              )}
            </span>
          )}
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream text-ink-soft" aria-hidden="true">
            <Icon name="arrow-right" className={cn("size-4 transition-transform duration-300", open ? "rotate-90" : "-rotate-90")} />
          </span>
          <span className="sr-only">{open ? "Hide details" : "Show details"}</span>
        </button>

        {/* Full version */}
        <div id="bag-summary-details" className={cn("grid transition-[grid-template-rows] duration-300 ease-out-soft", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden" inert={!open}>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
              <span
                aria-hidden="true"
                className={cn("grid size-9 shrink-0 place-items-center rounded-xl", remaining === 0 ? "bg-gold-100 text-gold-700" : "bg-cream text-ink-soft")}
              >
                <Icon name="truck" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-[0.82rem] leading-tight font-semibold">
                    {noMinimum ? "Free shipping on every order" : remaining === 0 ? "Free shipping unlocked" : `Add ${formatMoney(remaining, currency)} for free shipping`}
                  </p>
                  {remaining === 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pine-600 py-0.5 pr-2 pl-1.5 text-[0.68rem] leading-none font-semibold text-snow">
                      <Icon name="check" className="size-3" strokeWidth={3} /> Free
                    </span>
                  )}
                </div>
                {noMinimum && (
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[0.72rem] leading-tight text-ink-soft">Limited-time offer</p>
                    {freeShipping.endsAt && <SaleCountdown endsAt={freeShipping.endsAt} compact />}
                  </div>
                )}
                <div hidden={noMinimum} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-berry-600 to-gold-500 transition-[width] duration-700 ease-out-soft"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[0.84rem]">
              {savings > 0.009 && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-soft">Subtotal</dt>
                    <dd className="text-ink-soft tabular-nums">{formatMoney(original, currency)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-ink-soft">
                      Discount
                      {/* Just the icon (hover / screen reader names the codes), not a chip per coupon */}
                      <span
                        title={codes.join(" · ")}
                        aria-label={`${codes.length || 1} coupon${(codes.length || 1) === 1 ? "" : "s"} applied${codes.length ? `: ${codes.join(", ")}` : ""}`}
                        className="inline-flex items-center gap-1 rounded-md bg-berry-50 px-1.5 py-0.5 text-[0.7rem] leading-none font-bold text-berry-700 ring-1 ring-berry-100"
                      >
                        <Icon name="tag" className="size-3" />
                        <span className="tabular-nums">{codes.length || 1}</span>
                      </span>
                    </dt>
                    <dd className="font-semibold text-berry-600 tabular-nums">−{formatMoney(savings, currency)}</dd>
                  </div>
                </>
              )}
              {freeShipping.unlocked && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Shipping</dt>
                  <dd className="flex items-baseline gap-1.5 tabular-nums">
                    {freeShipping.rate > 0 && <s className="text-ink-faint">{formatMoney(freeShipping.rate, currency)}</s>}
                    <span className="font-semibold text-pine-700">Free</span>
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-line pt-2 text-[1rem]">
                <dt className="font-bold">Total</dt>
                <dd className="numeral text-[1.25rem] font-semibold tabular-nums">{formatMoney(subtotal, currency)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[0.82rem] text-berry-600">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onCheckout}
          disabled={pending || lines.some((l) => !l.available)}
          className="btn btn-primary shine mt-3 w-full min-h-13"
        >
          {pending ? (
            <>
              <Icon name="spinner" className="size-4 animate-spin" /> Opening secure checkout…
            </>
          ) : (
            <>
              <Icon name="lock" className="size-4" /> Checkout · {formatMoney(subtotal, currency)}
            </>
          )}
        </button>
        {demo && !error && (
          <p className="mt-2 text-center text-[0.72rem] text-ink-faint">Demo catalog — checkout opens once your Shopify products are synced.</p>
        )}
        <PaymentIcons methods={payments} className="mt-3" />
      </div>
    </div>
  );
}
