import "server-only";

/**
 * GA4 Measurement Protocol (server events). Configured by:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID   e.g. G-XXXXXXXXXX
 *   GA_MP_API_SECRET                GA4 → Admin → Data streams → Measurement Protocol API secrets
 * Docs: developers.google.com/analytics/devguides/collection/protocol/ga4
 */

export function gaConfig() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA_MP_API_SECRET?.trim();
  if (!measurementId || !apiSecret || !/^G-[A-Z0-9]{4,20}$/.test(measurementId)) return null;
  return { measurementId, apiSecret };
}

/** `_ga` cookie `GA1.1.1234567890.1700000000` → client id `1234567890.1700000000`. */
export function gaClientIdFromCookie(value: string | undefined): string | null {
  const parts = value?.split(".") ?? [];
  return parts.length >= 4 && /^\d+$/.test(parts.at(-2)!) && /^\d+$/.test(parts.at(-1)!)
    ? `${parts.at(-2)}.${parts.at(-1)}`
    : null;
}

/** `_ga_<ID>` cookie: `GS1.1.<sessionId>.…` (older) or `GS2.1.s<sessionId>$o…` (current). */
export function gaSessionIdFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^GS1\.\d\.(\d{8,12})\./) ?? value.match(/^GS2\.\d\.s(\d{8,12})\$/);
  return m ? m[1]! : null;
}

export type GaItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity: number;
  discount?: number;
  coupon?: string;
  affiliation?: string;
};

export type GaPurchase = {
  clientId: string;
  sessionId?: string | null;
  timestampMicros: number;
  transactionId: string;
  currency: string;
  value: number;
  tax: number;
  shipping: number;
  coupon?: string;
  items: GaItem[];
  /** Enhanced-conversion identifiers, already normalised and SHA-256 hashed where GA requires it. */
  userData?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

/**
 * Sends a `purchase`. With `validate`, posts to GA's debug endpoint instead:
 * nothing is recorded and GA replies with `validationMessages` describing any
 * problem with the payload.
 */
export async function sendGaPurchase(p: GaPurchase, validate = false) {
  const cfg = gaConfig();
  if (!cfg) return { ok: false as const, error: "GA4 Measurement Protocol is not configured." };
  const base = validate ? "https://www.google-analytics.com/debug/mp/collect" : "https://www.google-analytics.com/mp/collect";
  const res = await fetch(
    `${base}?measurement_id=${encodeURIComponent(cfg.measurementId)}&api_secret=${encodeURIComponent(cfg.apiSecret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: p.clientId,
        timestamp_micros: p.timestampMicros,
        ...(p.userData ? { user_data: p.userData } : {}),
        events: [
          {
            name: "purchase",
            params: {
              transaction_id: p.transactionId,
              currency: p.currency,
              value: p.value,
              tax: p.tax,
              shipping: p.shipping,
              ...(p.coupon ? { coupon: p.coupon } : {}),
              items: p.items,
              // Ties the purchase to the shopper's browsing session so it is attributed to the right source/campaign.
              ...(p.sessionId ? { session_id: p.sessionId } : {}),
              engagement_time_msec: 1,
              ...p.extra,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    },
  );
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* the live endpoint replies with an empty 204 */
  }
  if (!res.ok) console.error("[ga mp]", res.status, text.slice(0, 300));
  return { ok: res.ok, status: res.status, body, validated: validate };
}
