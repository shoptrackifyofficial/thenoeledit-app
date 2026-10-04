import Image from "next/image";
import Link from "next/link";

import { QuickAdd } from "@/components/product/QuickAdd";
import { Price } from "@/components/ui/Price";
import type { CardView } from "@/lib/commerce/product-view";
import { cn } from "@/lib/utils";

/**
 * Product card. The whole card is one link (one tab stop); the quick-add
 * button sits outside the link so it stays a separate, valid control.
 * A ribbon badge carries the real Shopify discount.
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
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-cream ring-1 ring-line/60 transition-shadow duration-500 group-hover:shadow-lift">
        {card.image && (
          <Image
            src={card.image.url}
            alt={card.image.alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-[transform,opacity] duration-[1.1s] ease-out-soft group-hover:scale-[1.05]",
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
          <span className="absolute top-2.5 left-2.5 inline-flex -rotate-3 items-center gap-1.5 rounded-[0.35rem_999px_999px_0.35rem] bg-berry-600 py-1 pr-2.5 pl-1.5 text-[0.7rem] leading-none font-bold text-snow shadow-ribbon">
            {/* gift-tag hole */}
            <span aria-hidden="true" className="size-1.5 rounded-full bg-white/85" />−{card.percentOff}%
          </span>
        )}
        {!card.available && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[0.66rem] font-bold tracking-wide text-ink uppercase backdrop-blur">
            Sold out
          </span>
        )}
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-[0.62rem] font-bold tracking-[0.16em] text-gold-700 uppercase">{card.category.title}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.9rem] leading-snug font-semibold sm:text-[0.95rem]">
          <Link
            href={card.href}
            className="transition-colors after:absolute after:inset-0 after:z-[1] after:rounded-[1.25rem] group-hover:text-berry-700"
          >
            {card.name}
          </Link>
        </h3>
        <Price price={card.price} compareAtPrice={card.compareAtPrice} currency={card.currency} size="sm" className="mt-1" />
      </div>

      {card.available && card.quickAddVariantId && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] aspect-[4/5]">
          <QuickAdd
            card={card}
            className="pointer-events-auto absolute right-2.5 bottom-2.5 md:translate-y-2 md:opacity-0 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          />
        </div>
      )}
    </article>
  );
}
