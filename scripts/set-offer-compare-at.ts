/**
 * Writes Shopify compare-at prices for products whose strike-through "original" is
 * otherwise worked out in code (bundle offers: story.bundle / story.multi discounts).
 *
 *   compareAt = price ÷ (1 − first% )      e.g. $59.99 at 50% → $119.98
 *
 * After this runs, Shopify is the single source of truth: edit a compare-at price in
 * the admin and the storefront follows (the code fallback only fills blanks).
 *
 *   npx tsx scripts/set-offer-compare-at.ts            # dry run
 *   npx tsx scripts/set-offer-compare-at.ts --apply    # write to Shopify (fills blanks only)
 *   ... --apply --overwrite                            # also replace compare-at prices already set
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { adminRequest } from "../src/lib/shopify/admin";
import { originalPrice } from "../src/lib/commerce/tiers";

const APPLY = process.argv.includes("--apply");
const OVERWRITE = process.argv.includes("--overwrite");

type Doc = {
  products: Record<
    string,
    {
      id: string;
      title: string;
      story?: { bundle?: { discounts: number[] }; multi?: { discounts: number[] } };
      variants: { id: string; title: string; price: number; compareAtPrice: number | null }[];
    }
  >;
};

async function main() {
  const doc: Doc = JSON.parse(readFileSync(join(process.cwd(), "data", "catalog.json"), "utf8"));
  let changes = 0;

  for (const [handle, p] of Object.entries(doc.products)) {
    const pct = p.story?.bundle?.discounts[0] ?? p.story?.multi?.discounts[0] ?? 0;
    if (pct <= 0) continue;

    const updates = p.variants
      .map((v) => ({ id: v.id, title: v.title, price: v.price, from: v.compareAtPrice, compareAtPrice: originalPrice(v.price, pct) }))
      .filter((u) => u.from == null || (OVERWRITE && Math.abs(u.from - u.compareAtPrice) > 0.005));
    if (!updates.length) {
      console.log(`${handle}: compare-at already set in Shopify - left as is`);
      continue;
    }

    console.log(`${handle}: ${pct}% off`);
    for (const u of updates) console.log(`  ${u.title.padEnd(28)} $${u.price}  compare-at ${u.from ?? "none"} -> ${u.compareAtPrice.toFixed(2)}`);
    changes += updates.length;
    if (!APPLY) continue;

    const r = await adminRequest<{ productVariantsBulkUpdate: { userErrors: { field: string[]; message: string }[] } }>(
      `mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$id, variants:$v){ userErrors{ field message } } }`,
      { id: p.id, v: updates.map((u) => ({ id: u.id, compareAtPrice: u.compareAtPrice.toFixed(2) })) },
      { retries: 1 },
    );
    if (r.productVariantsBulkUpdate.userErrors.length) throw new Error(`${handle}: ${JSON.stringify(r.productVariantsBulkUpdate.userErrors)}`);
  }

  console.log(APPLY ? `\nUpdated ${changes} variants.` : `\nDry run: ${changes} variants would change. Re-run with --apply.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
