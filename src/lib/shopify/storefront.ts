import "server-only";

import { graphqlRequest } from "@/lib/shopify/client";
import { isStorefrontConfigured, shopifyConfig, storefrontEndpoint } from "@/lib/shopify/config";

/**
 * Storefront API cart creation. Shopify owns pricing, discounts and totals —
 * the browser only ever sends variant ids + quantities, and the cart is priced
 * by Shopify here before the shopper is handed to Shopify Checkout.
 */

export class CartServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartServiceError";
  }
}

const CART_CREATE = `
mutation CartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart { id checkoutUrl totalQuantity }
    userErrors { field message }
  }
}`;

export type CartLineInput = { merchandiseId: string; quantity: number };

export async function createCheckout(
  lines: CartLineInput[],
  options: { attributes?: { key: string; value: string }[]; note?: string } = {},
): Promise<{ id: string; checkoutUrl: string }> {
  if (!isStorefrontConfigured()) throw new CartServiceError("Storefront API is not configured.");
  const data = await graphqlRequest<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string } | null;
      userErrors?: { message?: string }[];
    };
  }>({
    endpoint: storefrontEndpoint(),
    query: CART_CREATE,
    variables: {
      input: {
        lines,
        ...(options.attributes?.length ? { attributes: options.attributes } : {}),
        ...(options.note ? { note: options.note } : {}),
      },
    },
    storefrontToken: shopifyConfig().storefrontToken,
    retries: 1,
  });
  const cart = data.cartCreate?.cart;
  if (!cart) {
    throw new CartServiceError(data.cartCreate?.userErrors?.[0]?.message ?? "We could not create your bag.");
  }
  return cart;
}
