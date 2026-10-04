import type { ShowcaseVideo } from "@/components/product/ProductVideoShowcase";

/**
 * Videos for the auto-scrolling row after the product's first section.
 * Served from /public/videos/product (same-origin, so no third-party request),
 * and nothing is fetched until the row is about to scroll into view.
 *
 * To add a video: drop `name.mp4` (portrait, ~540px wide, H.264, muted, under
 * ~3 MB) and a `name.jpg` first-frame poster (~480px wide) into
 * public/videos/product/, then add a line below.  Each clip appears once; a
 * row that fits the screen is centred, a longer one drifts and can be dragged.
 */
const clip = (name: string, alt: string): ShowcaseVideo => ({
  src: `/videos/product/${name}.mp4`,
  poster: `/videos/product/${name}.jpg`,
  alt,
});

/** Shown on every product page unless the handle has its own list below. */
export const productVideos: ShowcaseVideo[] = [
  clip("clip-1", "Making a latte art cappuccino with the latte art camera and stencil cards"),
  clip("clip-2", "Latte art camera printing designs onto cappuccinos"),
  clip("clip-3", "Setting the latte art camera on a cup and loading it by hand"),
  clip("clip-4", "Pressing the button on the latte art camera to print a design onto a latte"),
];

/** Per-product overrides, keyed by product handle. */
export const productVideosByHandle: Record<string, ShowcaseVideo[]> = {};
