import "server-only";

/** Anything with a Headers-shaped `.get()` — a NextRequest's `.headers`, or next/headers' `headers()` result. */
type HeaderSource = { get(name: string): string | null };

/**
 * Visitor country, from whichever edge/CDN in front of this app already
 * geolocated the request — never computed or guessed by this app itself.
 *
 * Checks the headers real hosting providers set: `CF-IPCountry` (Cloudflare)
 * and `x-vercel-ip-country` (Vercel), in that order. Neither is set on
 * localhost with no such proxy in front of it, which is why this returns
 * null there — there is nothing to detect.
 *
 * This only ever supplies a country to look up in the catalog's own
 * pre-synced `pricesByMarket` (see lib/catalog/index.ts) — never a live
 * Shopify call, since the catalog is ISR-cached, not per-request.
 */
export function detectVisitorCountry(headers: HeaderSource): string | null {
  const candidate = headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country");

  if (!candidate) return null;
  const code = candidate.trim().toUpperCase();
  // Both providers use these for "unknown" / non-country traffic (Tor, etc.)
  // rather than omitting the header outright.
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return null;
  return code;
}
