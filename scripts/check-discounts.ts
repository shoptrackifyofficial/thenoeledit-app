/**
 * npm run shopify:check-discounts — builds a throw-away Shopify cart for 1, 2
 * and 3 cameras with the tier code and reports whether Shopify accepts the code
 * and what the cart would cost. Creating a cart places no order and is
 * harmless. Use it after creating XMAS50 / XMAS56 / XMAS65 in Shopify admin.
 */
import { readFileSync } from "node:fs";

import { graphqlRequest } from "../src/lib/shopify/client";
import { shopifyConfig, storefrontEndpoint } from "../src/lib/shopify/config";
import { tierCode } from "../src/lib/commerce/tiers";

type Product = { title: string; variants: { id: string }[]; story?: { bundle?: { discounts: number[]; codePrefix: string } | null } | null };
const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8")) as { products: Record<string, Product> };

const CART = `mutation($input: CartInput!) { cartCreate(input: $input) { cart { discountCodes { code applicable } cost { subtotalAmount { amount currencyCode } totalAmount { amount } } } userErrors { message } } }`;

async function cartWith(variant: string, qty: number, code: string) {
  const data = await graphqlRequest<{
    cartCreate: { cart: { discountCodes: { code: string; applicable: boolean }[]; cost: { subtotalAmount: { amount: string; currencyCode: string }; totalAmount: { amount: string } } } | null; userErrors: { message: string }[] };
  }>({
    endpoint: storefrontEndpoint(),
    query: CART,
    variables: { input: { lines: [{ merchandiseId: variant, quantity: qty }], discountCodes: [code], buyerIdentity: { countryCode: "US" } } },
    storefrontToken: shopifyConfig().storefrontToken,
  });
  if (!data.cartCreate.cart) throw new Error(data.cartCreate.userErrors[0]?.message ?? "cartCreate failed");
  return data.cartCreate.cart;
}

(async () => {
  const product = Object.values(catalog.products).find((p) => p.story?.bundle?.discounts.length);
  if (!product) return console.log("No product with bundle discounts in data/catalog.json (run npm run shopify:sync).");
  const cfg = product.story!.bundle!;
  const variant = product.variants[0]!.id;
  console.log(`${product.title.slice(0, 60)}…\n`);
  for (let qty = 1; qty <= cfg.discounts.length; qty++) {
    const code = tierCode(cfg, qty)!;
    const cart = await cartWith(variant, qty, code);
    const found = cart.discountCodes.find((d) => d.code.toUpperCase() === code.toUpperCase());
    const money = `${cart.cost.subtotalAmount.currencyCode} subtotal ${cart.cost.subtotalAmount.amount} → total ${cart.cost.totalAmount.amount}`;
    console.log(`  ${qty} × → ${code.padEnd(8)} ${found?.applicable ? "✔ applies" : "✖ NOT applicable (create it in Shopify)"}   ${money}`);
  }
})().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
