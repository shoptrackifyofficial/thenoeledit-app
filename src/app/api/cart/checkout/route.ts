import { NextResponse, type NextRequest } from "next/server";

import { isDemoCatalog, variantIndex } from "@/lib/catalog";
import { gaClientIdFromCookie, gaSessionIdFromCookie } from "@/lib/ga/mp";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { isStorefrontConfigured } from "@/lib/shopify/config";
import { createCheckout } from "@/lib/shopify/storefront";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/cart/checkout — turns the browser bag into a Shopify Storefront
 * cart and returns Shopify's hosted checkout URL.
 *
 * Trust model: the client sends only variant ids + quantities (+ gift
 * options). Every id must be a variant in the synced catalog (the store is
 * shared with other brands), quantities are clamped, and Shopify prices the
 * cart itself — no price or discount is ever accepted from the browser.
 */

const GID = /^gid:\/\/shopify\/ProductVariant\/\d{1,20}$/;
const MAX_LINES = 20;
const MAX_QTY = 10;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return json({ error: "Invalid origin." }, 403);
  if (!rateLimit(`checkout:${clientIp(request.headers)}`, 20, 60_000)) {
    return json({ error: "Too many attempts. Please wait a moment and try again." }, 429);
  }
  if (await isDemoCatalog()) {
    return json({ error: "This is the demo catalog. Sync your Shopify products to enable checkout." }, 409);
  }
  if (!isStorefrontConfigured()) return json({ error: "Checkout is temporarily unavailable." }, 503);

  const raw = await request.text();
  if (raw.length > 8_000) return json({ error: "Request too large." }, 413);
  let body: { lines?: unknown; gift?: { wrap?: unknown; message?: unknown }; externalId?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const input = body.lines;
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) {
    return json({ error: "Your bag is empty." }, 400);
  }

  const known = await variantIndex();
  const merged = new Map<string, number>();
  for (const line of input) {
    const id = (line as { variantId?: unknown })?.variantId;
    const qty = Number((line as { quantity?: unknown })?.quantity);
    if (typeof id !== "string" || !GID.test(id) || !known.has(id)) continue;
    if (!Number.isInteger(qty) || qty < 1) continue;
    merged.set(id, Math.min(MAX_QTY, (merged.get(id) ?? 0) + qty));
  }
  if (merged.size === 0) return json({ error: "The items in your bag are no longer available." }, 400);

  // Gift options travel as cart attributes + the order note, visible to the
  // merchant on the Shopify order.
  const wrap = body.gift?.wrap === true;
  const message =
    typeof body.gift?.message === "string"
      ? body.gift.message.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 240)
      : "";
  const attributes = [{ key: "Gift wrap", value: wrap ? "Yes" : "No" }];
  if (message) attributes.push({ key: "Gift message", value: message });

  // Ad identity for the server-side Purchase event (the orders/paid webhook
  // reads these back). "_"-prefixed attributes are hidden from the shopper.
  const fbp = request.cookies.get("_fbp")?.value;
  const fbc = request.cookies.get("_fbc")?.value;
  if (fbp && /^fb\.\d\.\d{10,13}\.\d{5,20}$/.test(fbp)) attributes.push({ key: "_fbp", value: fbp });
  if (fbc && /^fb\.\d\.\d{10,13}\.[\w-]{10,500}$/.test(fbc)) attributes.push({ key: "_fbc", value: fbc });
  // GA4: the browser's client + session id, so the server-side purchase joins the visit that led to it.
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.replace(/^G-/, "");
  const gaClient = gaClientIdFromCookie(request.cookies.get("_ga")?.value);
  const gaSession = gaId ? gaSessionIdFromCookie(request.cookies.get(`_ga_${gaId}`)?.value) : null;
  if (gaClient) attributes.push({ key: "_ga_cid", value: gaClient });
  if (gaSession) attributes.push({ key: "_ga_sid", value: gaSession });
  if (typeof body.externalId === "string" && /^[a-f0-9]{64}$/.test(body.externalId)) {
    attributes.push({ key: "_eid", value: body.externalId });
  }

  try {
    const cart = await createCheckout(
      [...merged].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity })),
      { attributes, note: message ? `Gift message: ${message}` : undefined },
    );
    const url = new URL(cart.checkoutUrl);
    if (url.protocol !== "https:") throw new Error("Unexpected checkout URL");
    return json({ checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error("[cart/checkout] cartCreate failed:", (error as Error).message);
    return json({ error: "We couldn't start checkout. Please try again." }, 502);
  }
}
