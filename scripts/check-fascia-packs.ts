/**
 * Checks that Shopify's automatic pack discounts give the prices the product page shows: builds a throw-away
 * Storefront cart (nothing is ordered) for 1..4 units of each colour and compares Shopify's total with
 * packTotal() from src/lib/commerce/packs.ts.
 *
 *   npx tsx --env-file=.env scripts/check-fascia-packs.ts
 */
import { readFileSync } from "node:fs";

import { packTotal } from "../src/lib/commerce/packs";
import { graphqlRequest } from "../src/lib/shopify/client";
import { shopifyConfig, storefrontEndpoint } from "../src/lib/shopify/config";

const CART = `
mutation C($input: CartInput!) {
  cartCreate(input: $input) { cart { cost { totalAmount { amount } subtotalAmount { amount } } } userErrors { message } }
}`;

async function main() {
  shopifyConfig();
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as { products: Record<string, any> };
  const product = Object.values(catalog.products).find((p) => p.id.endsWith("15492437344483"));
  if (!product?.story?.packs?.length) return console.log("No packs on the product.");
  let bad = 0;
  for (const variant of product.variants) {
    for (let n = 1; n <= 4; n++) {
      const data = await graphqlRequest<any>({
        endpoint: storefrontEndpoint(),
        query: CART,
        variables: { input: { lines: [{ merchandiseId: variant.id, quantity: n }], buyerIdentity: { countryCode: "US" } } },
      });
      const shopify = Number(data.cartCreate.cart?.cost.totalAmount.amount);
      const page = packTotal(product.story.packs, variant.price, n);
      const ok = Math.abs(shopify - page) < 0.015;
      if (!ok) bad++;
      console.log(`${variant.title.padEnd(6)} x${n}  Shopify $${shopify.toFixed(2)}  page $${page.toFixed(2)}  ${ok ? "ok" : "MISMATCH"}`);
    }
  }
  if (bad) process.exitCode = 1;
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
