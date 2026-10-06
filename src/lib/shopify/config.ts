/**
 * Shopify configuration, loaded from environment variables.
 *
 * Every Shopify call is made server-side — no token ever reaches the browser.
 * Missing credentials degrade gracefully: features report "not configured"
 * instead of throwing at build time, and the catalog falls back to its seed.
 */

export type ShopifyConfig = {
  storeDomain: string;
  apiVersion: string;
  storefrontToken: string;
  /** Legacy static custom-app token (`shpat_…`) — alternative to the client-credentials pair. */
  adminToken: string | null;
  adminClientId: string | null;
  adminClientSecret: string | null;
  customerAccountShopId: string;
  /** Shopify product vendor that marks a product as ours (the store is shared). */
  productVendor: string;
  /**
   * Admin product search that decides which products belong to this store
   * front. Default: every active product whose vendor is `productVendor`.
   */
  productQuery: string;
};

/** Vendor name every storefront product carries in Shopify. */
export const DEFAULT_PRODUCT_VENDOR = "TheNoelEdit";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function shopifyConfig(): ShopifyConfig {
  const productVendor = env("SHOPIFY_PRODUCT_VENDOR", DEFAULT_PRODUCT_VENDOR);
  return {
    storeDomain: env("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    apiVersion: env("SHOPIFY_API_VERSION", "2025-10"),
    storefrontToken: env("SHOPIFY_STOREFRONT_API_TOKEN"),
    adminToken: env("SHOPIFY_ADMIN_API_TOKEN") || null,
    adminClientId: env("SHOPIFY_ADMIN_CLIENT_ID") || null,
    adminClientSecret: env("SHOPIFY_ADMIN_CLIENT_SECRET") || null,
    customerAccountShopId: env("SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID"),
    productVendor,
    productQuery: env("SHOPIFY_PRODUCT_QUERY", `vendor:"${productVendor.replace(/"/g, "")}" status:active`),
  };
}

export function isStorefrontConfigured(cfg: ShopifyConfig = shopifyConfig()): boolean {
  return Boolean(cfg.storeDomain && cfg.storefrontToken);
}

export function isAdminConfigured(cfg: ShopifyConfig = shopifyConfig()): boolean {
  return Boolean(cfg.storeDomain && (cfg.adminToken || (cfg.adminClientId && cfg.adminClientSecret)));
}

export function storefrontEndpoint(cfg: ShopifyConfig = shopifyConfig()): string {
  return `https://${cfg.storeDomain}/api/${cfg.apiVersion}/graphql.json`;
}

export function adminEndpoint(cfg: ShopifyConfig = shopifyConfig()): string {
  return `https://${cfg.storeDomain}/admin/api/${cfg.apiVersion}/graphql.json`;
}

/** Shopify-hosted customer account (orders, addresses) — no OAuth plumbing needed here. */
export function customerAccountUrl(cfg: ShopifyConfig = shopifyConfig()): string | null {
  return cfg.customerAccountShopId ? `https://shopify.com/${cfg.customerAccountShopId}/account` : null;
}
