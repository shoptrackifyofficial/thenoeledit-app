"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import type { CardView } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

/** One-tap add for single-variant products, straight from a card. */
export function QuickAdd({ card, className }: { card: CardView; className?: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (!card.quickAddVariantId) return null;
  return (
    <button
      type="button"
      onClick={() => {
        add(card.quickAddVariantId!, 1, {
          productName: card.name,
          variantLabel: "",
          price: card.price,
          compareAtPrice: card.compareAtPrice,
          image: card.image?.url ?? null,
          href: card.href,
          available: true,
        });
        setDone(true);
        window.setTimeout(() => setDone(false), 1800);
      }}
      aria-label={`Add ${card.name} to bag`}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-snow text-ink shadow-soft transition-all duration-300 ease-out-soft hover:scale-105 hover:bg-berry-600 hover:text-snow",
        done && "bg-pine-700 text-snow",
        className,
      )}
    >
      <Icon name={done ? "check" : "plus"} className="size-5" strokeWidth={2} />
    </button>
  );
}
