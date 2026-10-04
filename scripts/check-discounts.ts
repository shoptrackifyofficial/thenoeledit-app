/**
 * npm run shopify:check-discounts — checks that the bundle discount codes exist
 * and give the price the product page shows. For 1, 2 and 3 cameras it builds a
 * throw-away Storefront cart (nothing is ordered) with the code checkout would
 * send, and prints the code, whether Shopify accepts it, the total and the total
 * the page shows. See src/lib/commerce/tiers.ts and the README.
 */
import { readFileSync } from "node:fs";

import { checkoutCode, round2, tierOff, tierPrice } from "../src/lib/commerce/tiers";
import { graphqlRequest } from "../src/lib/shopify/client";
import { shopifyConfig, storefrontEndpoint } from "../src/lib/shopify/config";

const CART = `
mutation C($input: CartInput!) {
  cartCreate(input: $input) {
    cart { cost { totalAmount { amount currencyCode } } discountCodes { code applicable } }
    userErrors { message }
  }
}`;

async function main() {
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as { products: Record<string, any> };
  const product = Object.values(catalog.products).find((p) => p.story?.bundle?.discounts?.length);
  if (!product) return console.log("No product has bundle discounts.");
  const cfg = { discounts: product.story.bundle.discounts as number[], codePrefix: product.story.bundle.codePrefix as string };
  const variant = product.variants[0];
  console.log(`${product.title}\nvariant price ${variant.price}, tiers ${cfg.discounts.join("/")}%\n`);

  let bad = 0;
  for (let n = 1; n <= cfg.discounts.length; n++) {
    const code = checkoutCode(cfg, n);
    const expected = tierPrice(round2(variant.price * n), cfg, n);
    const data = await graphqlRequest<any>({
      endpoint: storefrontEndpoint(),
      query: CART,
      variables: {
        input: {
          lines: [{ merchandiseId: variant.id, quantity: n }],
          buyerIdentity: { countryCode: "US" },
          ...(code ? { discountCodes: [code] } : {}),
        },
      },
      storefrontToken: shopifyConfig().storefrontToken,
    });
    const cart = data.cartCreate?.cart;
    const applicable = code ? Boolean(cart?.discountCodes?.some((d: any) => d.applicable)) : true;
    const total = Number(cart?.cost?.totalAmount?.amount);
    const ok = applicable && Math.abs(total - expected) < 0.02;
    if (!ok) bad++;
    console.log(
      `${ok ? "✔" : "✖"} ${n} camera${n > 1 ? "s" : ""}: code ${code ?? "(none needed)"}${code ? ` (must be ${tierOff(cfg, n)}% off)` : ""} ` +
        `→ ${applicable ? "accepted" : "NOT accepted"}, Shopify total ${total} ${cart?.cost?.totalAmount?.currencyCode ?? ""}, page shows ${expected}`,
    );
  }
  console.log(bad ? "\nCreate or fix the codes marked ✖ (README → Bundle offers)." : "\nAll bundle prices match.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
