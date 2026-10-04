import "server-only";

import { graphqlRequest } from "@/lib/shopify/client";
import { isStorefrontConfigured, shopifyConfig, storefrontEndpoint } from "@/lib/shopify/config";

/**
 * Country / currency list and live localized variant prices. No exchange-rate
 * maths happens in this app: both calls return exactly what Shopify's
 * Storefront API reports through `@inContext(country:)` (Shopify Markets).
 */

export type LocalizationCountry = {
  isoCode: string;
  name: string;
  currency: { isoCode: string; symbol: string };
};

export type Localization = {
  defaultCountry: LocalizationCountry;
  availableCountries: LocalizationCountry[];
};

export type LocalizedVariantPrice = {
  amount: string;
  currencyCode: string;
  compareAtAmount: string | null;
};

const LOCALIZATION_QUERY = `
query Localization($country: CountryCode) @inContext(country: $country) {
  localization {
    country { isoCode name currency { isoCode symbol } }
    availableCountries { isoCode name currency { isoCode symbol } }
  }
}`;

const VARIANT_PRICES_QUERY = `
query VariantPrices($ids: [ID!]!, $country: CountryCode) @inContext(country: $country) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
    }
  }
}`;

function token() {
  if (!isStorefrontConfigured()) throw new Error("Shopify storefront is not configured on this site.");
  return shopifyConfig().storefrontToken;
}

export async function getLocalization(country?: string | null): Promise<Localization> {
  const data = await graphqlRequest<{
    localization: { country: LocalizationCountry; availableCountries: LocalizationCountry[] };
  }>({
    endpoint: storefrontEndpoint(),
    query: LOCALIZATION_QUERY,
    variables: { country: country ?? null },
    storefrontToken: token(),
  });
  return { defaultCountry: data.localization.country, availableCountries: data.localization.availableCountries };
}

export async function getLocalizedVariantPrices(variantIds: string[], country: string): Promise<Map<string, LocalizedVariantPrice>> {
  if (variantIds.length === 0) return new Map();
  const data = await graphqlRequest<{
    nodes: ({
      id: string;
      price?: { amount: string; currencyCode: string };
      compareAtPrice?: { amount: string; currencyCode: string } | null;
    } | null)[];
  }>({
    endpoint: storefrontEndpoint(),
    query: VARIANT_PRICES_QUERY,
    variables: { ids: variantIds, country },
    storefrontToken: token(),
  });
  const prices = new Map<string, LocalizedVariantPrice>();
  for (const node of data.nodes) {
    if (!node?.price) continue;
    prices.set(node.id, {
      amount: node.price.amount,
      currencyCode: node.price.currencyCode,
      compareAtAmount: node.compareAtPrice?.amount ?? null,
    });
  }
  return prices;
}
