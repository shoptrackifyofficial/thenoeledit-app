"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import { Icon } from "@/components/ui/Icon";
import type { CardView } from "@/lib/commerce/product-view";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Filter + sort over a server-rendered product list. The first render is the
 * full, unfiltered grid (that is what crawlers and the LCP see); `?budget=`
 * and `?sort=` are applied after mount and mirrored back into the URL without
 * a navigation, so filtered views are shareable.
 */

type Sort = "featured" | "discount" | "price-asc" | "price-desc" | "new";
type Budget = "all" | "25" | "50" | "100" | "luxe";

const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "discount", label: "Biggest saving" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "new", label: "Newest" },
];

export function ShopGrid({ cards, priorityCount = 4 }: { cards: CardView[]; priorityCount?: number }) {
  const currency = cards[0]?.currency ?? "USD";
  const [sort, setSort] = useState<Sort>("featured");
  const [budget, setBudget] = useState<Budget>("all");
  const [inStock, setInStock] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("sort") as Sort | null;
    const b = q.get("budget") as Budget | null;
    if (s && SORTS.some((o) => o.value === s)) setSort(s);
    if (b && ["25", "50", "100", "luxe"].includes(b)) setBudget(b);
    if (q.get("stock") === "1") setInStock(true);
  }, []);

  const sync = (next: { sort?: Sort; budget?: Budget; inStock?: boolean }) => {
    const url = new URL(window.location.href);
    const s = next.sort ?? sort;
    const b = next.budget ?? budget;
    const st = next.inStock ?? inStock;
    if (s === "featured") url.searchParams.delete("sort");
    else url.searchParams.set("sort", s);
    if (b === "all") url.searchParams.delete("budget");
    else url.searchParams.set("budget", b);
    if (st) url.searchParams.set("stock", "1");
    else url.searchParams.delete("stock");
    window.history.replaceState(window.history.state, "", url);
  };

  const budgets: { value: Budget; label: string }[] = [
    { value: "all", label: "All prices" },
    { value: "25", label: `Under ${formatMoney(25, currency)}` },
    { value: "50", label: `Under ${formatMoney(50, currency)}` },
    { value: "100", label: `Under ${formatMoney(100, currency)}` },
    { value: "luxe", label: `${formatMoney(100, currency)}+` },
  ];

  const shown = useMemo(() => {
    let list = cards.filter((c) => {
      if (inStock && !c.available) return false;
      if (budget === "luxe") return c.price >= 100;
      if (budget !== "all") return c.price < Number(budget);
      return true;
    });
    list = [...list];
    if (sort === "discount") list.sort((a, b) => (b.percentOff ?? 0) - (a.percentOff ?? 0));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "new") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // Sold-out items sink to the end in every order.
    return list.sort((a, b) => Number(b.available) - Number(a.available));
  }, [cards, sort, budget, inStock]);

  return (
    <div>
      <div className="sticky top-(--header-h) z-20 -mx-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-lg sm:mx-0 sm:rounded-full sm:border sm:px-3">
        <div className="flex items-center gap-3">
          <ul className="scrollbar-none -my-1 flex flex-1 gap-2 overflow-x-auto py-1" aria-label="Filter by price">
            {budgets.map((b) => (
              <li key={b.value}>
                <button
                  type="button"
                  aria-pressed={budget === b.value}
                  onClick={() => {
                    setBudget(b.value);
                    sync({ budget: b.value });
                  }}
                  className={cn(
                    "h-10 rounded-full px-4 text-[0.82rem] font-semibold whitespace-nowrap transition-colors",
                    budget === b.value ? "bg-pine-900 text-snow" : "bg-cream hover:bg-linen",
                  )}
                >
                  {b.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-pressed={inStock}
                onClick={() => {
                  setInStock(!inStock);
                  sync({ inStock: !inStock });
                }}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full px-4 text-[0.82rem] font-semibold whitespace-nowrap ring-1 transition-colors",
                  inStock ? "bg-pine-100 ring-pine-600" : "ring-line hover:bg-cream",
                )}
              >
                {inStock && <Icon name="check" className="size-3.5" strokeWidth={2.4} />}
                In stock
              </button>
            </li>
          </ul>
          <label className="relative hidden shrink-0 sm:block">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                const v = e.target.value as Sort;
                setSort(v);
                sync({ sort: v });
              }}
              className="h-10 appearance-none rounded-full bg-cream pr-10 pl-4 text-[0.82rem] font-semibold outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
          </label>
        </div>
        <label className="relative mt-2 block sm:hidden">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value as Sort;
              setSort(v);
              sync({ sort: v });
            }}
            className="h-10 w-full appearance-none rounded-full bg-cream pr-10 pl-4 text-[0.82rem] font-semibold outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
        </label>
      </div>

      <p className="mt-6 text-[0.85rem] text-ink-soft" aria-live="polite">
        {shown.length} {shown.length === 1 ? "gift" : "gifts"}
      </p>

      {shown.length === 0 ? (
        <div className="py-20 text-center">
          <p className="display-md">Nothing at that price — yet.</p>
          <button
            type="button"
            onClick={() => {
              setBudget("all");
              setInStock(false);
              sync({ budget: "all", inStock: false });
            }}
            className="btn btn-outline mt-6"
          >
            Show all gifts
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-12">
          {shown.map((c, i) => (
            <li key={c.handle}>
              <ProductCard card={c} priority={i < priorityCount} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
