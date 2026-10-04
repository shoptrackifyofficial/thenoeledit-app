/**
 * Site-wide settings and copy. Everything a merchant is likely to change
 * before launch lives here: name, sale window, hero media, delivery cut-offs.
 */

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://thenoeledit.com").replace(/\/+$/, "");

export const site = {
  name: "The Noel Edit",
  shortName: "Noel Edit",
  tagline: "The Christmas gift sale, beautifully wrapped.",
  description:
    "The Noel Edit is a curated Christmas gift sale — up to 40% off jewellery, tech, toys, home and festive treats, with free gift wrapping and tracked delivery before Christmas.",
  url: siteUrl,
  locale: "en_US",
  email: "hello@thenoeledit.com",
  themeColor: "#fffaf6",

  sale: {
    headline: "Up to 40% off",
    /** When the sale ends — drives every countdown. Per-product `custom.sale_ends_at` overrides it. */
    endsAt: "2026-12-26T00:00:00Z",
    /** Christmas Day (local midnight is computed in the browser). */
    christmas: { month: 12, day: 25 },
  },

  /**
   * Hero media. Swap `image` for your own photo, or set `video` (an mp4 URL)
   * and keep `image` as its poster — the poster stays the LCP element.
   */
  hero: {
    /** Posters are the LCP element; the videos fade in over them after load (portrait file on phones). */
    image: "/videos/hero-poster.jpg",
    imageMobile: "/videos/hero-poster-mobile.jpg",
    video: "/videos/hero.mp4" as string | null,
    videoMobile: "/videos/hero-mobile.mp4" as string | null,
    alt: "A gold satin ribbon unties from an evergreen gift box, releasing warm golden light",
  },


  delivery: { minDays: 2, maxDays: 6, freeOver: 50 },

  promises: [
    { icon: "gift", title: "Free gift wrapping", text: "Hand-tied ribbon and a handwritten card, on every order." },
    { icon: "truck", title: "Early for Christmas", text: "Order early — tracked shipping, no last-minute rush." },
    { icon: "refresh", title: "Returns until January 31", text: "Gift receipts included — easy exchanges after the holidays." },
    { icon: "shield", title: "Secure checkout", text: "Paid safely through Shopify Checkout." },
  ],

  social: {
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/",
    pinterest: "https://pinterest.com/",
  },
} as const;

export type IconKey = (typeof site.promises)[number]["icon"];
