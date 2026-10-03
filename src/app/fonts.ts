import { Bodoni_Moda, Manrope, Pinyon_Script } from "next/font/google";

/**
 * Three faces, self-hosted at build time by next/font (no runtime request to
 * Google, size-adjusted fallbacks so swapping in causes no layout shift):
 *
 *  - Bodoni Moda (display): high-contrast didone with an optical-size axis —
 *    the look of a luxury Christmas catalogue. Headlines and prices only.
 *  - Manrope (text + interface): warm geometric grotesk, highly legible at
 *    small sizes on phones. Preloaded — it is the most-used face.
 *  - Pinyon Script (accent): a copperplate script for one- or two-word
 *    flourishes ("Merry", "with love"). Never body copy; not preloaded.
 */
export const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--ff-display",
  display: "swap",
  preload: true,
  fallback: ["Didot", "Bodoni 72", "Georgia", "serif"],
});

export const sans = Manrope({
  subsets: ["latin"],
  weight: "variable",
  variable: "--ff-sans",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial"],
});

export const script = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--ff-script",
  display: "swap",
  preload: false,
  fallback: ["cursive"],
});
