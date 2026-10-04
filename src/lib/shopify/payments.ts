import "server-only";

import { unstable_cache } from "next/cache";

import { graphqlRequest } from "@/lib/shopify/client";
import { isStorefrontConfigured, shopifyConfig, storefrontEndpoint } from "@/lib/shopify/config";

/**
 * The payment methods the store actually accepts at checkout, straight from
 * Shopify (Settings → Payments), so the page never shows a logo checkout would
 * refuse. Wallets lead (Shop Pay, Apple Pay, Google Pay), then cards. Cached
 * for a day and tagged `payments`; on any failure the row is simply left out.
 * Ported from the reference store.
 */

/** `id` is a file name in `public/payments/` — Shopify's own icons (activemerchant/payment_icons, MIT). */
export type PaymentMethod = { id: string; label: string };

const WALLETS: Record<string, PaymentMethod> = {
  SHOPIFY_PAY: { id: "shopify_pay", label: "Shop Pay" },
  APPLE_PAY: { id: "apple_pay", label: "Apple Pay" },
  GOOGLE_PAY: { id: "google_pay", label: "Google Pay" },
};

const CARDS: Record<string, PaymentMethod> = {
  VISA: { id: "visa", label: "Visa" },
  MASTERCARD: { id: "master", label: "Mastercard" },
  AMERICAN_EXPRESS: { id: "american_express", label: "American Express" },
  DISCOVER: { id: "discover", label: "Discover" },
  DINERS_CLUB: { id: "diners_club", label: "Diners Club" },
};

const QUERY = /* GraphQL */ `
  query PaymentSettings {
    shop {
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
  }
`;

export const getPaymentMethods = unstable_cache(
  async (): Promise<PaymentMethod[]> => {
    if (!isStorefrontConfigured()) return [];
    try {
      const data = await graphqlRequest<{
        shop: { paymentSettings: { acceptedCardBrands: string[]; supportedDigitalWallets: string[] } };
      }>({
        endpoint: storefrontEndpoint(),
        query: QUERY,
        storefrontToken: shopifyConfig().storefrontToken,
      });
      const { acceptedCardBrands, supportedDigitalWallets } = data.shop.paymentSettings;
      // Ordered by our tables, not Shopify's response; unknown brands have no icon.
      return [
        ...Object.entries(WALLETS).filter(([key]) => supportedDigitalWallets.includes(key)),
        ...Object.entries(CARDS).filter(([key]) => acceptedCardBrands.includes(key)),
      ].map(([, method]) => method);
    } catch (error) {
      console.error("[payments] fetch failed:", error instanceof Error ? error.message : error);
      return [];
    }
  },
  ["shop-payment-methods-v1"],
  { tags: ["payments"], revalidate: 86_400 },
);
