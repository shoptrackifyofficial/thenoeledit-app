import Image from "next/image";
import Link from "next/link";

import { QuickAdd } from "@/components/product/QuickAdd";
import { Price } from "@/components/ui/Price";
import type { CardView } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

/**
 * Product card. The whole card is one link (one tab stop); the quick-add
 * button sits outside the link so it stays a separate, valid control.
 * A gift-tag badge carries the real Shopify discount.
 */
export function ProductCard({
  card,
  priority = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw",
  className,
}: {
  card: CardView;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <article className={cn("group relative", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-cream">
        {card.image && (
          <Image
            src={card.image.url}
            alt={card.image.alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-[transform,opacity] duration-[1.1s] ease-out-soft group-hover:scale-[1.04]",
              card.hoverImage && "group-hover:opacity-0",
            )}
          />
        )}
        {card.hoverImage && (
          <Image
            src={card.hoverImage.url}
            alt=""
            fill
            sizes={sizes}
            loading="lazy"
            className="scale-[1.06] object-cover opacity-0 transition-[transform,opacity] duration-[1.1s] ease-out-soft group-hover:scale-100 group-hover:opacity-100"
          />
        )}

        {card.percentOff != null && card.percentOff > 0 && (
          <span className="absolute top-3 left-3 flex -rotate-6 items-center gap-1.5 rounded-[0.4rem_0.9rem_0.9rem_0.4rem] bg-berry-600 py-1.5 pr-3 pl-2 text-snow shadow-soft">
            <span className="size-1.5 rounded-full bg-snow/80" aria-hidden="true" />
            <span className="numeral text-[0.82rem] leading-none font-semibold">−{card.percentOff}%</span>
          </span>
        )}
        {!card.available && (
          <span className="absolute top-3 right-3 rounded-full bg-ink/80 px-3 py-1 text-[0.7rem] font-bold tracking-wider text-snow uppercase">
            Sold out
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-bold tracking-[0.18em] text-gold-700 uppercase">{card.category.title}</p>
          <h3 className="mt-1 text-[0.98rem] leading-snug font-semibold">
            <Link href={card.href} className="after:absolute after:inset-0 after:z-[1] after:rounded-[1.4rem]">
              {card.name}
            </Link>
          </h3>
          <Price price={card.price} compareAtPrice={card.compareAtPrice} currency={card.currency} size="sm" className="mt-1" />
        </div>
      </div>

      {card.available && card.quickAddVariantId && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] aspect-[4/5]">
          <QuickAdd
            card={card}
            className="pointer-events-auto absolute right-3 bottom-3 md:translate-y-2 md:opacity-0 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          />
        </div>
      )}
    </article>
  );
}
