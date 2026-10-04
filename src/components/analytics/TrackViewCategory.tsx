"use client";

import { useEffect, useRef } from "react";

import { cardItem, trackViewCategory } from "@/lib/analytics";
import type { CardView } from "@/lib/commerce/product-view";

/** Fires one ViewCategory (Meta) / view_item_list (GA4) for a listing page. */
export function TrackViewCategory({ category, cards }: { category: string; cards: CardView[] }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === category) return; // once per listing, even under React dev double-effects
    sent.current = category;
    trackViewCategory(category, cards.map(cardItem), cards[0]?.currency ?? "USD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  return null;
}
