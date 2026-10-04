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

const latteCamera: ShowcaseVideo[] = [
  clip("clip-1", "Making a latte art cappuccino with the latte art camera and stencil cards"),
  clip("clip-2", "Latte art camera printing designs onto cappuccinos"),
  clip("clip-3", "Setting the latte art camera on a cup and loading it by hand"),
  clip("clip-4", "Pressing the button on the latte art camera to print a design onto a latte"),
];

const p15: ShowcaseVideo[] = [
  clip("p15-4", "Typing a name on your phone and printing it onto ribbon with the P15 label maker"),
  clip("p15-6", "Printing a message on navy ribbon and tying it round a wrapped gift"),
  clip("p15-2", "Unboxing the P15 and printing ribbon to tie on a Christmas present"),
  clip("p15-1", "Printing custom wishes on label tape for a plate of festive biscuits"),
  clip("p15-3", "Labelling jars of coffee beans, seeds and pasta with the P15"),
  clip("p15-5", "Labelling kitchen jars and gift tags with the P15 label maker"),
];

/** Shown on a product page unless its handle has its own list below. None by default: a product only shows videos that belong to it. */
export const productVideos: ShowcaseVideo[] = [];

/** Per-product lists, keyed by product handle. */
export const productVideosByHandle: Record<string, ShowcaseVideo[]> = {
  "phomemo-p15-label-printer-gift-label-printer-ribbon-label-printer-bluetooth-enabled-printing-rechargeable-for-name-tag": p15,
  "one-touch-3d-printed-latte-art-cameras-coffee-stencil-printers-handheld-tools-templates-cappuccino-interchangeable-mold-christmas-gift": latteCamera,
};
