"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Lines, gift options, totals and checkout — shared by the drawer and /cart. */
export function BagContents({ onNavigate, variant = "drawer" }: { onNavigate?: () => void; variant?: "drawer" | "page" }) {
  const { lines, subtotal, savings, currency, setQuantity, remove, checkout, hydrated, loading, demo, gift, setGift } =
    useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freeOver = site.delivery.freeOver;
  const remaining = Math.max(0, freeOver - subtotal);
  const progress = Math.min(1, subtotal / freeOver);

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
        <span className="grid size-20 place-items-center rounded-full bg-berry-50 text-berry-600">
          <Icon name="gift" className="size-9" strokeWidth={1.3} />
        </span>
        <div>
          <p className="display-md">Your bag is empty</p>
          <p className="mt-2 text-ink-soft">The best gifts are still waiting under the tree.</p>
        </div>
        <Link href="/shop" onClick={onNavigate} className="btn btn-primary shine">
          Shop the sale
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", variant === "page" && "lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-12")}>
      <div className={cn("min-h-0", variant === "drawer" && "flex-1 overflow-y-auto overscroll-contain px-5")}>
        {/* Free delivery progress */}
        <div className="mt-1 rounded-2xl bg-cream p-3.5">
          <p className="flex items-center gap-2 text-[0.82rem] font-semibold text-ink">
            <Icon name={remaining === 0 ? "sparkle" : "truck"} className="size-4.5 shrink-0" />
            {remaining === 0
              ? "You've unlocked free tracked delivery"
              : `Add ${formatMoney(remaining, currency)} for free delivery`}
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div
              className="h-full rounded-full bg-linear-to-r from-berry-600 to-gold-500 transition-[width] duration-700 ease-out-soft"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <ul className="mt-2 divide-y divide-line">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-3.5 py-4">
              <Link
                href={line.href}
                onClick={onNavigate}
                className="relative block size-20 shrink-0 overflow-hidden rounded-2xl bg-cream ring-1 ring-line"
              >
                {line.image && (
                  <Image src={line.image} alt="" fill sizes="96px" className="object-cover" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={line.href} onClick={onNavigate} className="line-clamp-2 font-semibold leading-snug hover:underline">
                      {line.productName}
                    </Link>
                    {line.variantLabel && <p className="mt-0.5 text-[0.8rem] text-ink-soft">{line.variantLabel}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="numeral font-semibold">{formatMoney(line.lineTotal, currency)}</p>
                    {line.compareAtPrice && (
                      <s className="numeral text-[0.78rem] text-ink-faint">
                        {formatMoney(line.compareAtPrice * line.quantity, currency)}
                      </s>
                    )}
                  </div>
                </div>
                {!line.available && <p className="mt-1 text-[0.78rem] font-semibold text-berry-600">Sold out — remove to continue</p>}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      className="grid size-9 place-items-center rounded-full hover:bg-cream"
                      aria-label={`Decrease quantity of ${line.productName}`}
                    >
                      <Icon name="minus" className="size-3.5" />
                    </button>
                    <span className="numeral w-7 text-center text-[0.95rem]" aria-live="polite">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      disabled={line.quantity >= 10}
                      className="grid size-9 place-items-center rounded-full hover:bg-cream"
                      aria-label={`Increase quantity of ${line.productName}`}
                    >
                      <Icon name="plus" className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    className="text-[0.78rem] text-ink-soft underline-offset-4 hover:text-berry-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Gift options — sent to Shopify as cart attributes + order note */}
        <fieldset className="mb-4 rounded-2xl bg-berry-50/60 p-4 ring-1 ring-berry-100">
          <legend className="px-1 text-[0.8rem] font-bold tracking-[0.12em] uppercase">Make it a gift</legend>
          <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
            <span className="flex items-center gap-2.5 text-[0.9rem]">
              <Icon name="gift" className="size-5 text-berry-600" />
              Free gift wrapping
            </span>
            <input
              type="checkbox"
              checked={gift.wrap}
              onChange={(e) => setGift({ wrap: e.target.checked })}
              className="size-5 accent-berry-600"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[0.8rem] text-ink-soft">Gift message (printed on a card)</span>
            <textarea
              value={gift.message}
              onChange={(e) => setGift({ message: e.target.value })}
              maxLength={240}
              rows={2}
              placeholder="Merry Christmas! Love, …"
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.9rem] outline-none focus:border-berry-500"
            />
          </label>
        </fieldset>
      </div>

      <div
        className={cn(
          variant === "drawer"
            ? "border-t border-line bg-paper px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            : "rounded-[1.75rem] bg-surface p-6 shadow-soft ring-1 ring-line lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]",
        )}
      >
        <dl className="space-y-1.5 text-[0.92rem]">
          {savings > 0 && (
            <div className="flex justify-between text-berry-600">
              <dt>Christmas savings</dt>
              <dd className="numeral font-semibold">−{formatMoney(savings, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-semibold">Subtotal</dt>
            <dd className="numeral text-[1.35rem]">{formatMoney(subtotal, currency)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-[0.75rem] text-ink-soft">Shipping and taxes calculated at checkout.</p>
        <button
          type="button"
          onClick={onCheckout}
          disabled={pending || lines.some((l) => !l.available)}
          className="btn btn-primary shine mt-4 w-full"
        >
          {pending ? <Icon name="spinner" className="size-4 animate-spin" /> : <Icon name="lock" className="size-4" />}
          {pending ? "Opening checkout…" : "Secure checkout"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-[0.82rem] text-berry-600">
            {error}
          </p>
        )}
        {demo && !error && (
          <p className="mt-3 text-[0.75rem] text-ink-faint">
            Demo catalog — checkout opens once your Shopify products are synced.
          </p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.75rem] text-ink-soft">
          <Icon name="shield" className="size-3.5" /> Secure payment by Shopify
        </p>
      </div>
    </div>
  );
}
