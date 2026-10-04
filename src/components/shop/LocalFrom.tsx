"use client";

import { useLocalCards } from "@/components/localization/useLocalCards";
import type { CardView } from "@/lib/commerce/product-view";

/** The lowest price in a list, in the visitor's currency (shop currency until Shopify's local prices land). */
export function LocalFrom({ cards }: { cards: CardView[] }) {
  const { priceOf, money } = useLocalCards(cards, cards[0]?.currency ?? "USD");
  return <>{money(Math.min(...cards.map(priceOf)))}</>;
}
