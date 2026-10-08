import type { ProductRecord } from "@/lib/catalog/types";

/** An add-on's variant, ready for the product page (e.g. one ribbon colour). */
export type ViewAddonVariant = {
  id: string;
  /** "Gold on Red" */
  label: string;
  /** Tape colour name ("Red") and the print colour ("Gold"), when the label follows "<ink> on <tape>". */
  tape: string | null;
  ink: string | null;
  tapeHex: string | null;
  inkHex: string | null;
  price: number;
  /** Shopify's own compare-at price (only when higher than the price), shown struck through. */
  compareAt: number | null;
  image: string | null;
  availableForSale: boolean;
};

export type ViewAddon = {
  handle: string;
  name: string;
  intro: string;
  /** The add-on product's own page. */
  href: string;
  /** Percent shown for 1, 2, 3… units across all ribbons (same ladder as the bundle offer), and its coupon label prefix. */
  discounts: number[];
  codePrefix: string;
  /** First step's real percent from the ribbons' Shopify compare-at price (see lib/commerce/tiers.ts). */
  basePct?: number;
  productId: string;
  /** Hero image of the add-on product. */
  image: string | null;
  variants: ViewAddonVariant[];
};

/** Satin-tape colours as they look on the supplier's photos. */
const TAPE: Record<string, string> = {
  white: "#f7f6f1",
  black: "#1d1d1f",
  red: "#b3202a",
  pink: "#f3b4c3",
  "dark pink": "#d52f7c",
  navy: "#1f2e57",
  "light blue": "#a9cdee",
  "tf blue": "#7fd6cf",
  "tiffany blue": "#7fd6cf",
  "light green": "#c3deb4",
  "dark green": "#1d5a3b",
  beige: "#e5d5c0",
  gold: "#c9a24a",
};
const INK: Record<string, string> = { black: "#141414", gold: "#c6993a", white: "#ffffff", silver: "#b9bcc2" };

/** "Gold on Red" → { ink: "Gold", tape: "Red" }; anything else keeps just its label. */
export function parseRibbonLabel(label: string): { ink: string | null; tape: string | null } {
  const m = label.match(/^(.+?)\s+on\s+(.+)$/i);
  return m ? { ink: m[1]!.trim(), tape: m[2]!.trim() } : { ink: null, tape: null };
}

export function buildAddonView(
  record: ProductRecord,
  config: { name: string; intro: string; discounts: number[]; codePrefix: string; basePct?: number },
): ViewAddon {
  const image = record.media.find((m) => m.type === "image");
  return {
    handle: record.handle,
    name: config.name,
    intro: config.intro,
    href: `/products/${record.handle}`,
    discounts: config.discounts,
    codePrefix: config.codePrefix,
    ...(config.basePct != null ? { basePct: config.basePct } : {}),
    productId: record.id,
    image: image && image.type === "image" ? image.url : null,
    variants: record.variants.map((v) => {
      const label = Object.values(v.options).join(" · ") || v.title;
      const { ink, tape } = parseRibbonLabel(label);
      return {
        id: v.id,
        label,
        tape,
        ink,
        tapeHex: tape ? (TAPE[tape.toLowerCase()] ?? null) : null,
        inkHex: ink ? (INK[ink.toLowerCase()] ?? null) : null,
        price: v.price,
        compareAt: v.compareAtPrice != null && v.compareAtPrice > v.price ? v.compareAtPrice : null,
        image: v.image,
        availableForSale: v.availableForSale,
      };
    }),
  };
}
