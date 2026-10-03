/**
 * Shopify Admin API access-token resolution — ported from the Trackify
 * reference.
 *
 * 2026 Dev Dashboard apps have no copyable token: the app exchanges its Client
 * ID + Secret for a 24h Admin access token (client-credentials grant) and
 * caches it in-process until shortly before expiry, refreshing lazily. A
 * legacy static custom-app token (`shpat_…`) is still accepted as a fallback.
 */

import { shopifyConfig } from "@/lib/shopify/config";

type AdminAuthSource = "static-token" | "client-credentials" | "unconfigured";

const REFRESH_MARGIN_MS = 10 * 60 * 1000; // refresh 10 min before expiry
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // Shopify issues ~86 399s tokens

let cachedToken: { token: string; expiresAt: number } | null = null;

export function adminAuthSource(): AdminAuthSource {
  const cfg = shopifyConfig();
  if (cfg.adminToken) return "static-token";
  if (cfg.adminClientId && cfg.adminClientSecret) return "client-credentials";
  return "unconfigured";
}

async function exchangeClientCredentials(): Promise<string> {
  const cfg = shopifyConfig();
  const response = await fetch(
    `https://${cfg.storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: cfg.adminClientId!,
        client_secret: cfg.adminClientSecret!,
      }),
      cache: "no-store",
    },
  );
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ??
        data.error ??
        `Admin token request failed (HTTP ${response.status})`,
    );
  }
  return data.access_token;
}

/**
 * A live Admin API access token. The client-credentials path generates it on
 * demand and caches it in-process (per server instance) until 10 min before
 * expiry — no token is ever passed in from outside.
 */
export async function getAdminToken(): Promise<string> {
  const source = adminAuthSource();
  if (source === "static-token") return shopifyConfig().adminToken!;
  if (source === "client-credentials") {
    if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
      return cachedToken.token;
    }
    const token = await exchangeClientCredentials();
    cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return token;
  }
  throw new Error(
    "Shopify Admin API is not configured. Set SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET " +
      "in .env (or a legacy SHOPIFY_ADMIN_API_TOKEN).",
  );
}
