import "server-only";

import { createHash } from "node:crypto";

/**
 * Meta Conversions API (server events). Configured by:
 *   NEXT_PUBLIC_META_PIXEL_ID   dataset / pixel id
 *   META_CAPI_ACCESS_TOKEN      system-user token with ads_management
 *   META_GRAPH_API_VERSION      e.g. v21.0
 *   META_TEST_EVENT_CODE        optional — routes events to Events Manager →
 *                               Test Events. Remove it before going live.
 * Docs: developers.facebook.com/documentation/ads-commerce/conversions-api/parameters
 */

export const META_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "CustomizeProduct",
  "ViewCategory",
  "Search",
  "AddToCart",
  "InitiateCheckout",
  "Lead",
  "Contact",
]);

export function metaConfig() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !token || !/^\d{5,20}$/.test(pixelId)) return null;
  const version = /^v\d{2}\.\d$/.test(process.env.META_GRAPH_API_VERSION ?? "")
    ? process.env.META_GRAPH_API_VERSION!
    : "v21.0";
  return { pixelId, token, version, testCode: process.env.META_TEST_EVENT_CODE?.trim() || undefined };
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Meta normalisation: trim + lowercase, then SHA-256. */
export function hashEmail(email: string): string | null {
  const v = email.trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(v) ? sha256(v) : null;
}

/** City / region / zip / country normalised per Meta's spec, then hashed. */
export function hashLocation(kind: "ct" | "st" | "zp" | "country", raw: string | null): string | undefined {
  if (!raw) return undefined;
  let v = decodeURIComponent(raw).trim().toLowerCase();
  if (kind === "ct") v = v.replace(/[^a-z]/g, "");
  if (kind === "st") v = v.replace(/[^a-z]/g, "").slice(0, 2);
  if (kind === "zp") v = v.replace(/\s/g, "");
  if (kind === "country") v = v.replace(/[^a-z]/g, "").slice(0, 2);
  return v ? sha256(v) : undefined;
}

/** Generic contact field (names): trim + lowercase, then SHA-256. */
export function hashText(raw: string | null | undefined): string | undefined {
  const v = raw?.trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

/** Phone: digits only, including the country code (Shopify stores E.164, e.g. +14155550123). */
export function hashPhone(raw: string | null | undefined): string | undefined {
  const digits = raw?.replace(/\D/g, "").replace(/^0+/, "");
  return digits && digits.length >= 7 ? sha256(digits) : undefined;
}

/** Zip: lowercase, no spaces or dashes; US zips use the first 5 digits (Meta spec). */
export function hashZip(raw: string | null | undefined, country?: string | null): string | undefined {
  let v = raw?.trim().toLowerCase().replace(/[\s-]/g, "");
  if (!v) return undefined;
  if (country?.toUpperCase() === "US") v = v.slice(0, 5);
  return sha256(v);
}

/* ── custom_data sanitising — only Meta standard keys, sane types and sizes ── */

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 100) / 100 : undefined;
const int = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : undefined);

export function sanitizeCustomData(input: unknown): Record<string, unknown> {
  const d = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const ids = Array.isArray(d.content_ids)
    ? d.content_ids.map((x) => str(x, 80)).filter(Boolean).slice(0, 50)
    : undefined;
  const contents = Array.isArray(d.contents)
    ? d.contents
        .slice(0, 50)
        .map((c) => {
          const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
          const id = str(o.id, 80);
          return id ? { id, quantity: int(o.quantity, 100) ?? 1, item_price: num(o.item_price, 100000) } : null;
        })
        .filter(Boolean)
    : undefined;
  const currency = typeof d.currency === "string" && /^[A-Z]{3}$/.test(d.currency) ? d.currency : undefined;
  const out: Record<string, unknown> = {
    content_type: d.content_type === "product" || d.content_type === "product_group" ? d.content_type : undefined,
    content_ids: ids?.length ? ids : undefined,
    contents: contents?.length ? contents : undefined,
    content_name: str(d.content_name, 200),
    content_category: str(d.content_category, 100),
    currency,
    value: num(d.value, 100000),
    num_items: int(d.num_items, 1000),
    search_string: str(d.search_string, 100),
    option_name: str(d.option_name, 60),
    option_value: str(d.option_value, 60),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

export type ServerEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  referrer_url?: string;
  action_source: "website";
  user_data: Record<string, unknown>;
  custom_data: Record<string, unknown>;
};

export async function sendServerEvent(event: ServerEvent) {
  const cfg = metaConfig();
  if (!cfg) return { ok: false as const, error: "Meta Conversions API is not configured." };
  const res = await fetch(`https://graph.facebook.com/${cfg.version}/${cfg.pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [event],
      ...(cfg.testCode ? { test_event_code: cfg.testCode } : {}),
      access_token: cfg.token,
    }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) console.error("[meta capi]", event.event_name, res.status, JSON.stringify(body).slice(0, 400));
  return { ok: res.ok, status: res.status, body, test: Boolean(cfg.testCode) };
}
