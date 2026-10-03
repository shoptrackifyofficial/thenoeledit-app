/**
 * Shop categories — the editorial layer over Shopify.
 *
 * A product lands in a category by (first match wins):
 *   1. a Shopify tag `category:<slug>` (e.g. `category:for-her`), or
 *   2. its Shopify Product type, matched against `productTypes` below, or
 *   3. its Product type slugified, which creates a category automatically.
 *
 * Images are placeholders — swap `image` for your own (Shopify CDN URLs work).
 */

export type CategoryContent = {
  slug: string;
  title: string;
  /** Short line for cards and the menu. */
  kicker: string;
  /** One or two sentences — shown on the category page and used as its meta description. */
  blurb: string;
  image: string;
  /** Shopify Product types that map here (case-insensitive). */
  productTypes: string[];
  /** Display order. */
  order: number;
};

const u = (id: string, extra = "") =>
  `https://images.unsplash.com/photo-${id}?fit=crop&crop=entropy${extra}`;

export const categories: CategoryContent[] = [
  {
    slug: "for-her",
    title: "For Her",
    kicker: "Jewellery, glow & soft layers",
    blurb:
      "Considered gifts for the women who have everything — fine jewellery, skincare rituals and cosy knits, all wrapped and ready for Christmas morning.",
    image: u("1515562141207-7a88fb7ce338"),
    productTypes: ["jewelry", "jewellery", "beauty", "skincare", "accessories for her"],
    order: 1,
  },
  {
    slug: "for-him",
    title: "For Him",
    kicker: "Timepieces, tech & essentials",
    blurb:
      "Gifts he will actually use — clean-lined watches, studio sound and everyday essentials, chosen to last well past the holidays.",
    image: u("1523275335684-37898b6baf30"),
    productTypes: ["watches", "tech", "electronics", "accessories for him"],
    order: 2,
  },
  {
    slug: "little-ones",
    title: "Little Ones",
    kicker: "Toys worth the wait",
    blurb:
      "Plush companions, builder sets and wind-up classics — toys made to be unwrapped first and played with for years.",
    image: u("1559454403-b8fb88521f11"),
    productTypes: ["toys", "kids", "baby"],
    order: 3,
  },
  {
    slug: "cosy-home",
    title: "Cosy Home",
    kicker: "Candlelight & slow mornings",
    blurb:
      "Scented candles, hand-thrown ceramics and the finishing touches that turn a house into the place everyone comes home to.",
    image: u("1603006905003-be475563bc59"),
    productTypes: ["home", "candles", "homeware", "decor"],
    order: 4,
  },
  {
    slug: "festive-treats",
    title: "Festive Treats",
    kicker: "Sweet things, beautifully boxed",
    blurb:
      "Truffles, cookie tins and hot cocoa kits — edible gifts packed in keepsake boxes, made for sharing round the tree.",
    image: u("1481391319762-47dff72954d9"),
    productTypes: ["food", "treats", "confectionery", "gourmet"],
    order: 5,
  },
  {
    slug: "stocking-fillers",
    title: "Stocking Fillers",
    kicker: "Little gifts, big smiles",
    blurb:
      "Small, clever and under budget — the stocking fillers and Secret Santa wins that get opened first.",
    image: u("1513885535751-8b9238bd345a"),
    productTypes: ["stocking fillers", "gifts", "books", "drinkware"],
    order: 6,
  },
];

export const FALLBACK_CATEGORY = "gifts";

export function categoryBySlug(slug: string): CategoryContent | undefined {
  return categories.find((c) => c.slug === slug);
}
