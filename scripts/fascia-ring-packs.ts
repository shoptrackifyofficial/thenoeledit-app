/**
 * Packs for the fascia ring massager, done the way HimVolt's arm trainer does it (no pack variants).
 *
 *   npx tsx --env-file=.env scripts/fascia-ring-packs.ts            # preview only
 *   npx tsx --env-file=.env scripts/fascia-ring-packs.ts --apply    # write to Shopify
 *
 * A "3 Pack" is quantity 3 of the SAME colour variant, so the supplier mapping stays one variant per colour and
 * the supplier ships N units. The pack prices come from two AUTOMATIC discounts scoped to this product:
 *   - "Fascia Ring - Pack 2 Save $8.99":  $8.99 off, once, when 2+ are in the cart
 *   - "Fascia Ring - Buy 2 Get 1 Free":   buy 2, get 1 of the product free (repeats per set of 3)
 * Shopify gives the shopper whichever is better. The storefront mirrors them from `story.packs`
 * (written by enrich-fascia-ring.ts) with src/lib/commerce/packs.ts: change both together.
 *
 * What --apply does (idempotent):
 *   1. hosts the 2 / 3 pack photos from assets-src/fascia-ring/ as Shopify Files (not gallery photos)
 *   2. removes the "Pack" option and its 2 Pack / 3 Pack variants (the 1 Pack variants stay, so the supplier mapping is untouched)
 *   3. removes the pack photos that were attached to the old variants from the gallery
 *   4. clears the compare-at price on the colour variants (a single has no struck-through price)
 *   5. creates the two automatic discounts, when the Admin token has the discounts scope; otherwise it says so and
 *      the discounts are created in Shopify admin (or through the Shopify connector) with exactly the settings above
 */
import { readFileSync, statSync } from "node:fs";

import { adminRequest } from "../src/lib/shopify/admin";

const ID = "gid://shopify/Product/15492437344483";
const APPLY = process.argv.includes("--apply");
const DIR = "assets-src/fascia-ring";
const COLOURS: Record<string, string> = { Pink: "pink", Black: "black" };
const SAVING = "8.99"; // 2 Pack: about 10% off two singles
const TITLE_SAVE = `Fascia Ring - Pack 2 Save $${SAVING}`;
const TITLE_BXGY = "Fascia Ring - Buy 2 Get 1 Free";

const bundleFile = (n: number, colour: string) => `fascia-ring-bundle-${n}-${COLOURS[colour]}`;

type P = {
  options: { id: string; name: string; values: string[] }[];
  variants: { nodes: { id: string; title: string; price: string; compareAtPrice: string | null; selectedOptions: { name: string; value: string }[] }[] };
  media: { nodes: { id: string; alt: string | null }[] };
};
const read = async () =>
  (
    await adminRequest<{ product: P }>(
      `query($id: ID!) { product(id: $id) { options { id name values }
        variants(first: 50) { nodes { id title price compareAtPrice selectedOptions { name value } } }
        media(first: 100) { nodes { id alt } } } }`,
      { id: ID },
    )
  ).product;

const errs = (label: string, list: { message: string }[] | undefined) => {
  if (list?.length) throw new Error(`${label}: ${JSON.stringify(list)}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function findFile(stem: string): Promise<string | null> {
  const r = await adminRequest<{ files: { nodes: { fileStatus?: string; image?: { url: string } | null }[] } }>(
    `query($q: String!) { files(first: 5, query: $q) { nodes { ... on MediaImage { fileStatus image { url } } } } }`,
    { q: `filename:${stem}*` },
  );
  const hit = r.files.nodes.find((n) => n.fileStatus === "READY" && n.image?.url);
  return hit ? hit.image!.url.split("?")[0]! : null;
}

async function hostPhoto(n: number, colour: string): Promise<string> {
  const stem = bundleFile(n, colour);
  const have = await findFile(stem);
  if (have) return have;
  const path = `${DIR}/pack${n}-${COLOURS[colour]}.jpg`;
  const filename = `${stem}.jpg`;
  const staged = await adminRequest<{
    stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] };
  }>(
    `mutation($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`,
    { input: [{ filename, mimeType: "image/jpeg", resource: "IMAGE", fileSize: String(statSync(path).size), httpMethod: "POST" }] },
  );
  errs("stagedUploadsCreate", staged.stagedUploadsCreate.userErrors);
  const t = staged.stagedUploadsCreate.stagedTargets[0]!;
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([readFileSync(path)], { type: "image/jpeg" }), filename);
  const up = await fetch(t.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload ${filename}: ${up.status}`);
  const c = await adminRequest<{ fileCreate: { userErrors: { message: string }[] } }>(
    `mutation($f: [FileCreateInput!]!) { fileCreate(files: $f) { userErrors { message } } }`,
    { f: [{ originalSource: t.resourceUrl, filename, contentType: "IMAGE", alt: `Fascia ring ${n} pack, ${COLOURS[colour]}` }] },
  );
  errs("fileCreate", c.fileCreate.userErrors);
  for (let i = 0; i < 40; i++) {
    await wait(1500);
    const url = await findFile(stem);
    if (url) return url;
  }
  throw new Error(`Timed out waiting for ${filename}`);
}

/** true / false, or null when the Admin token has no discounts scope. */
async function discountExists(title: string): Promise<boolean | null> {
  try {
    const r = await adminRequest<{ discountNodes: { nodes: { id: string }[] } }>(`query($q: String!) { discountNodes(first: 3, query: $q) { nodes { id } } }`, { q: `title:'${title}'` });
    return r.discountNodes.nodes.length > 0;
  } catch (e) {
    if (/read_discounts|access scope|Access denied/i.test(e instanceof Error ? e.message : String(e))) return null;
    throw e;
  }
}
const state = (v: boolean | null) => (v === null ? "cannot check: token has no discounts scope" : v ? "exists" : "to create");

async function main() {
  const p = await read();
  const pack = p.options.find((o) => o.name === "Pack");
  const packMedia = p.media.nodes.filter((m) => /^[23] Pack, /.test(m.alt ?? ""));
  console.log(`Pack option: ${pack ? "present, will be removed" : "already gone"}; ${packMedia.length} old pack photos in the gallery`);
  console.log(`Discounts: "${TITLE_SAVE}" (${state(await discountExists(TITLE_SAVE))}), "${TITLE_BXGY}" (${state(await discountExists(TITLE_BXGY))})`);
  if (!APPLY) return console.log("\nPreview only. Re-run with --apply.");

  // 1. Pack photos as Files
  for (const colour of Object.keys(COLOURS)) for (const n of [2, 3]) console.log(`  photo ${bundleFile(n, colour)}: ${await hostPhoto(n, colour)}`);

  // 2. Drop the 2 Pack / 3 Pack variants, then the Pack option itself
  if (pack) {
    const drop = p.variants.nodes.filter((v) => v.selectedOptions.some((o) => o.name === "Pack" && o.value !== pack.values[0]));
    if (drop.length) {
      const r = await adminRequest<{ productVariantsBulkDelete: { userErrors: { message: string }[] } }>(
        `mutation($id: ID!, $v: [ID!]!) { productVariantsBulkDelete(productId: $id, variantsIds: $v) { userErrors { message } } }`,
        { id: ID, v: drop.map((v) => v.id) },
        { retries: 1 },
      );
      errs("variants delete", r.productVariantsBulkDelete.userErrors);
    }
    const o = await adminRequest<{ productOptionsDelete: { userErrors: { message: string }[] } }>(
      `mutation($id: ID!, $o: [ID!]!) { productOptionsDelete(productId: $id, options: $o) { userErrors { message } } }`,
      { id: ID, o: [pack.id] },
      { retries: 1 },
    );
    errs("option delete", o.productOptionsDelete.userErrors);
  }

  // 3. Old pack photos out of the gallery
  if (packMedia.length) {
    const d = await adminRequest<{ fileDelete: { userErrors: { message: string }[] } }>(
      `mutation($f: [ID!]!) { fileDelete(fileIds: $f) { userErrors { message } } }`,
      { f: packMedia.map((m) => m.id) },
      { retries: 1 },
    );
    errs("media delete", d.fileDelete.userErrors);
  }

  // 4. No compare-at price on the colour variants
  const after = await read();
  const c = await adminRequest<{ productVariantsBulkUpdate: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $id, variants: $v) { userErrors { message } } }`,
    { id: ID, v: after.variants.nodes.map((v) => ({ id: v.id, compareAtPrice: null })) },
    { retries: 1 },
  );
  errs("compare-at", c.productVariantsBulkUpdate.userErrors);

  // 5. The two automatic discounts, scoped to this product and combining only with shipping discounts
  const startsAt = new Date().toISOString();
  const combinesWith = { shippingDiscounts: true, orderDiscounts: false, productDiscounts: false };
  const scope = { products: { productsToAdd: [ID] } };
  const saveExists = await discountExists(TITLE_SAVE);
  const bxgyExists = await discountExists(TITLE_BXGY);
  if (saveExists === null) console.log("! No discounts scope on the Admin token: create the two automatic discounts in Shopify admin (settings in the header above).");
  if (saveExists === false) {
    const r = await adminRequest<{ discountAutomaticBasicCreate: { userErrors: { message: string }[] } }>(
      `mutation($d: DiscountAutomaticBasicInput!) { discountAutomaticBasicCreate(automaticBasicDiscount: $d) { userErrors { message } } }`,
      { d: { title: TITLE_SAVE, startsAt, combinesWith, minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: "2" } }, customerGets: { value: { discountAmount: { amount: SAVING, appliesOnEachItem: false } }, items: scope } } },
    );
    errs("discount (save)", r.discountAutomaticBasicCreate.userErrors);
  }
  if (bxgyExists === false) {
    const r = await adminRequest<{ discountAutomaticBxgyCreate: { userErrors: { message: string }[] } }>(
      `mutation($d: DiscountAutomaticBxgyInput!) { discountAutomaticBxgyCreate(automaticBxgyDiscount: $d) { userErrors { message } } }`,
      { d: { title: TITLE_BXGY, startsAt, combinesWith, customerBuys: { value: { quantity: "2" }, items: scope }, customerGets: { value: { discountOnQuantity: { quantity: "1", effect: { percentage: 1 } } }, items: scope } } },
    );
    errs("discount (bxgy)", r.discountAutomaticBxgyCreate.userErrors);
  }

  const fin = await read();
  for (const v of fin.variants.nodes) console.log(`  ${v.title.padEnd(8)} $${v.price} (compare-at ${v.compareAtPrice ?? "none"})`);
  console.log("Done. Run enrich-fascia-ring.ts --apply, then `npm run shopify:sync`.");
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
