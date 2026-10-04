import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Two faces, self-hosted at build time by next/font (no runtime request to
 * Google, size-adjusted fallbacks so swapping in causes no layout shift):
 *
 *  - Fraunces (display): a warm "soft serif" with optical-size and SOFT axes.
 *    Its rounded terminals echo the engraved serif of the logo while feeling
 *    friendly rather than stiff. Headlines, numerals and the italic accent word.
 *  - Plus Jakarta Sans (text + interface): clean, open and very legible at
 *    small sizes on phones. Preloaded — it is the most-used face.
 */
export const display = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--ff-display",
  display: "swap",
  preload: true,
  fallback: ["Georgia", "serif"],
});

export const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--ff-sans",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial"],
});
