"use client";

import Link from "next/link";

import { useLocalCards } from "@/components/localization/useLocalCards";
import { Icon } from "@/components/ui/Icon";
import type { CardView } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

/** The "gift by price" hanging tags — budgets and counts follow the visitor's currency. */
const TIERS = [
  { max: 25, label: "Under", tone: "bg-berry-50 text-ink", accent: "text-berry-600", hole: "bg-paper" },
  { max: 50, label: "Under", tone: "bg-gold-100 text-ink", accent: "text-gold-700", hole: "bg-paper" },
  { max: 100, label: "Under", tone: "bg-pine-900 text-snow", accent: "text-gold-300", hole: "bg-paper" },
  { max: 0, label: "Luxe", tone: "bg-berry-600 text-snow", accent: "text-gold-200", hole: "bg-paper" },
];

export function GiftTiers({ cards }: { cards: CardView[] }) {
  const { priceOf, band, money } = useLocalCards(cards, cards[0]?.currency ?? "USD");
  const tiers = TIERS.map((t) => ({
    ...t,
    href: t.max ? `/shop?budget=${t.max}` : "/shop?budget=luxe",
    count: cards.filter((c) => (t.max ? priceOf(c) < band(t.max) : priceOf(c) >= band(100))).length,
  }));

  return (
    <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-4 lg:gap-5">
      {tiers.map((t) => (
        <li key={t.href} className="flex flex-col items-center">
          {/* string */}
          <span aria-hidden="true" className="h-5 w-px bg-ink-faint/50" />
          <Link
            href={t.href}
            className={cn(
              "gift-tag group relative flex w-full flex-col items-center overflow-hidden rounded-t-[2.75rem] rounded-b-[1.4rem] px-4 pt-9 pb-5 text-center ring-1 ring-black/5 sm:pt-11 sm:pb-6",
              t.tone,
            )}
          >
            {/* punched hole */}
            <span aria-hidden="true" className={cn("absolute top-3.5 size-3.5 rounded-full shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)]", t.hole)} />
            <span className={cn("accent text-[1.25rem] leading-none sm:text-[1.45rem]", t.accent)}>{t.label}</span>
            <span className="numeral mt-1 text-[2.6rem] leading-none tracking-tight sm:text-[3.4rem]">
              {t.max ? money(band(t.max)) : `${money(band(100))}+`}
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-current/8 px-3 py-1.5 text-[0.72rem] font-semibold">
              <span>{t.count} gifts</span>
              <Icon name="arrow-right" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <Icon name="snowflake" className="absolute -right-5 -bottom-5 size-20 opacity-[0.07]" strokeWidth={1} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
