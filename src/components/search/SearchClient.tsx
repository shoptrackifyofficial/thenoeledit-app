"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import { Icon } from "@/components/ui/Icon";
import type { CardView } from "@/lib/commerce/product-view";

/**
 * Instant search over the (small) catalog — no round trip per keystroke.
 * Matches every word against name, category and tags; `?q=` is kept in the
 * URL so results are shareable and the SearchAction schema works.
 */
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function SearchClient({ cards, suggestions }: { cards: CardView[]; suggestions: { label: string; href: string }[] }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    input.current?.focus();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  }, [q]);

  const index = useMemo(
    () => cards.map((c) => ({ c, text: norm(`${c.name} ${c.category.title} ${c.tags.join(" ")}`) })),
    [cards],
  );
  const words = norm(q).split(/\s+/).filter(Boolean);
  const results = words.length ? index.filter(({ text }) => words.every((w) => text.includes(w))).map(({ c }) => c) : [];

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="q" className="sr-only">
          Search gifts
        </label>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-soft" />
        <input
          ref={input}
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Candles, watches, under $50…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-16 w-full rounded-full bg-snow pr-6 pl-14 text-[1.1rem] shadow-soft ring-1 ring-line outline-none focus:ring-2 focus:ring-gold-500"
        />
      </form>

      {words.length === 0 ? (
        <div className="mt-8">
          <p className="eyebrow text-ink-soft">Popular</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex h-10 items-center rounded-full bg-cream px-4 text-[0.88rem] font-semibold hover:bg-linen">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="mt-6 text-[0.88rem] text-ink-soft" aria-live="polite">
            {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
          </p>
          {results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="display-md">No gifts match that — yet.</p>
              <Link href="/shop" className="btn btn-dark mt-6">
                Browse every gift
              </Link>
            </div>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
              {results.map((c) => (
                <li key={c.handle}>
                  <ProductCard card={c} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
