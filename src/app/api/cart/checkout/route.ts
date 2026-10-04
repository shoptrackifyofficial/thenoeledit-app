import { NextResponse, type NextRequest } from "next/server";

import { getProducts, isDemoCatalog, variantIndex } from "@/lib/catalog";
import { site } from "@/content/site";
import { checkoutCode } from "@/lib/commerce/tiers";
import { resolveEffectiveCountry } from "@/lib/localization/country";
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
 * Trust model: the client sends only variant ids + quantities
 * (+ an anonymous ad id). Every id must be a variant in the synced catalog (the store is
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
  let body: { lines?: unknown; externalId?: unknown };
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

  const attributes: { key: string; value: string }[] = [];

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

  // Bundle step: shoppers pay Shopify's price less the step's share (see lib/commerce/tiers.ts), which
  // Shopify applies through a discount code. The code is chosen here from the validated quantities —
  // never from the browser.
  const products = await getProducts();
  let tier: { code: string } | null = null;
  for (const p of products) {
    const cfg = p.story?.bundle;
    if (!cfg || !cfg.discounts.length || !cfg.codePrefix) continue;
    const units = p.variants.reduce((n, v) => n + (merged.get(v.id) ?? 0), 0);
    const code = units > 0 ? checkoutCode(cfg, units) : null;
    if (code) {
      tier = { code };
      break;
    }
  }

  // The same country the on-page prices were fetched for (the visitor's own choice, else the
  // edge-detected one), so Shopify prices the cart in the market and currency the bag showed.
  // With no country (e.g. localhost) the cart is pinned to the shop's own market.
  const detected = await resolveEffectiveCountry();
  const country = detected && /^[A-Z]{2}$/.test(detected) ? detected : site.market;

  try {
    const cart = await createCheckout(
      [...merged].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity })),
      { attributes, country, discountCodes: tier ? [tier.code] : undefined },
    );
    // The page shows the bundle price, so never send the shopper to a checkout that would charge more.
    if (tier && !cart.discountCodes.some((d) => d.code.toUpperCase() === tier.code.toUpperCase() && d.applicable)) {
      console.error(`[cart/checkout] discount code ${tier.code} is not applicable — create it in Shopify (see README).`);
      return json({ error: "This offer is being set up. Please try again shortly." }, 409);
    }
    const url = new URL(cart.checkoutUrl);
    if (url.protocol !== "https:") throw new Error("Unexpected checkout URL");
    return json({ checkoutUrl: cart.checkoutUrl });
  } catch (error) {
    console.error("[cart/checkout] cartCreate failed:", (error as Error).message);
    return json({ error: "We couldn't start checkout. Please try again." }, 502);
  }
}
