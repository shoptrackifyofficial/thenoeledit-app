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
        "grid size-10 place-items-center rounded-full bg-surface text-ink shadow-lift ring-1 ring-black/5 transition-all duration-300 ease-out-soft hover:scale-110 hover:bg-berry-600 hover:text-snow active:scale-95",
        done && "animate-[pop_0.4s_var(--ease-spring)] bg-pine-600 text-snow",
        className,
      )}
    >
      <Icon name={done ? "check" : "plus"} className="size-[1.1rem]" strokeWidth={2.2} />
    </button>
  );
}
