import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shared checks for Shopify webhooks. Webhooks created through the Admin API
 * (see scripts/register-webhooks.ts) are signed with the app's client secret,
 * so SHOPIFY_WEBHOOK_SECRET should equal SHOPIFY_ADMIN_CLIENT_SECRET; the
 * latter is used when the former is unset.
 */
export function verifyShopifyWebhook(raw: string, signature: string | null): boolean {
  const secret = (process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_ADMIN_CLIENT_SECRET || "").trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** True when the request names a different shop than ours (the store is shared, the secret is not). */
export function wrongShop(headers: Headers): boolean {
  const shop = headers.get("x-shopify-shop-domain");
  const ours = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  return Boolean(shop && ours && shop.toLowerCase() !== ours.toLowerCase());
}

/** Shopify can deliver one event more than once; remember recent webhook ids (per server instance). */
const seen = new Set<string>();
export function isDuplicateWebhook(id: string | null): boolean {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 2000) seen.delete(seen.values().next().value!);
  return false;
}
