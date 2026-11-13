/**
 * Adds the 1 / 2 / 3 pack choice to the fascia ring massager.
 *
 *   npx tsx --env-file=.env scripts/fascia-ring-packs.ts            # preview only
 *   npx tsx --env-file=.env scripts/fascia-ring-packs.ts --apply    # write to Shopify
 *
 *   - new option "Pack" (1 Pack / 2 Pack / 3 Pack) next to Color (A / B), so 6 variants
 *   - 2 Pack: 10% off two singles (rounded to .99); 3 Pack: the price of two ("buy 2, get 1 free")
 *   - compare-at: none on 1 Pack; 2 Pack and 3 Pack are worked out from the 1 Pack's actual price x the number of units
 *   - pack photos from assets-src/fascia-ring/ (made from the supplier's own product photos), uploaded as
 *     product media and attached to the matching variants, so the pack cards and the gallery show them
 * Idempotent: re-running skips what already exists. Run enrich-fascia-ring.ts and `npm run shopify:sync` afterwards.
 *
 * Fulfilment note: the supplier sells one unit per variant. Map the 2 / 3 Pack variants to 2 / 3 units in
 * the fulfilment app (DSers / CJ), or the customer would receive a single massager.
 */
import { readFileSync, statSync } from "node:fs";

import { adminRequest } from "../src/lib/shopify/admin";

const ID = "gid://shopify/Product/15492437344483";
const APPLY = process.argv.includes("--apply");
const PRICES_ONLY = process.argv.includes("--prices"); // only rewrite prices and compare-at prices
const REFRESH = process.argv.includes("--refresh-images"); // swap the pack photos already in Shopify for the files in DIR
const DIR = "assets-src/fascia-ring";

/** Colour value -> photo name used in the pack files. */
const COLOUR_FILE: Record<string, string> = { Pink: "pink", Black: "black", A: "pink", B: "black" };
const PACKS = ["1 Pack", "2 Pack", "3 Pack"] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round99 = (n: number) => round2(Math.max(1, Math.round(n)) - 0.01);

type V = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  inventoryPolicy: string;
  inventoryItem: { id: string; tracked: boolean };
  selectedOptions: { name: string; value: string }[];
  media: { nodes: { id: string }[] };
};
type P = {
  options: { name: string; values: string[] }[];
  variants: { nodes: V[] };
  media: { nodes: { id: string; alt: string | null; status: string }[] };
};

const READ = `query($id: ID!) { product(id: $id) {
  options { name values }
  variants(first: 50) { nodes { id title price compareAtPrice inventoryPolicy inventoryItem { id tracked }
    selectedOptions { name value } media(first: 1) { nodes { id } } } }
  media(first: 100) { nodes { id alt status } } } }`;
const read = async () => (await adminRequest<{ product: P }>(READ, { id: ID })).product;
const optVal = (v: V, name: string) => v.selectedOptions.find((o) => o.name === name)?.value ?? "";
const units = (v: V) => Number.parseInt(optVal(v, "Pack"), 10) || 1;

function target(single: V, n: number) {
  const price = Number(single.price);
  const p = n === 1 ? price : n === 2 ? round99(price * 2 * 0.9) : round2(price * 2);
  return { price: p, compareAt: n === 1 ? null : round2(price * n) };
}

const packAlt = (colour: string, n: number) => `${n} Pack, ${COLOUR_FILE[colour]}`;

async function uploadImage(path: string, filename: string): Promise<string> {
  const staged = await adminRequest<{
    stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] };
  }>(
    `mutation($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } } }`,
    { input: [{ filename, mimeType: "image/jpeg", resource: "IMAGE", fileSize: String(statSync(path).size), httpMethod: "POST" }] },
  );
  const err = staged.stagedUploadsCreate.userErrors[0]?.message;
  if (err) throw new Error(`stagedUploadsCreate: ${err}`);
  const t = staged.stagedUploadsCreate.stagedTargets[0]!;
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([readFileSync(path)], { type: "image/jpeg" }), filename);
  const up = await fetch(t.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload ${filename}: ${up.status}`);
  return t.resourceUrl;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function refreshImages() {
  const p = await read();
  const files: { id: string; originalSource: string }[] = [];
  for (const c of Object.keys(COLOUR_FILE).filter((k) => !["A", "B"].includes(k)))
    for (const n of [2, 3]) {
      const media = p.media.nodes.find((m) => m.alt === packAlt(c, n));
      if (!media) throw new Error(`No media "${packAlt(c, n)}" to refresh; run with --apply first.`);
      files.push({ id: media.id, originalSource: await uploadImage(`${DIR}/pack${n}-${COLOUR_FILE[c]}.jpg`, `fascia-ring-${n}pack-${COLOUR_FILE[c]}-v2.jpg`) });
    }
  const r = await adminRequest<{ fileUpdate: { userErrors: { message: string }[] } }>(
    `mutation($f: [FileUpdateInput!]!) { fileUpdate(files: $f) { userErrors { message } } }`,
    { f: files },
    { retries: 1 },
  );
  if (r.fileUpdate.userErrors.length) throw new Error(`fileUpdate: ${JSON.stringify(r.fileUpdate.userErrors)}`);
  console.log(`Replaced ${files.length} pack photos.`);
}

async function main() {
  if (REFRESH) return refreshImages();
  let p = await read();
  const hasPack = p.options.some((o) => o.name === "Pack");
  const colours = p.options.find((o) => o.name === "Color")?.values ?? [];
  console.log(`Option Pack: ${hasPack ? "already there" : "will be created"}; colours ${colours.join(", ")}`);
  for (const c of colours) if (!COLOUR_FILE[c]) throw new Error(`No pack photo mapped for colour ${c}`);

  if (!APPLY) {
    const singles = p.variants.nodes.filter((v) => units(v) === 1);
    for (const s of singles)
      for (const n of [1, 2, 3]) {
        const t = target(s, n);
        console.log(`  ${optVal(s, "Color")} / ${n} Pack: $${t.price} (compare-at ${t.compareAt == null ? "none" : "$" + t.compareAt})`);
      }
    console.log("\nPreview only. Re-run with --apply.");
    return;
  }

  // 1. The Pack option, with a variant for every colour x pack
  if (!hasPack) {
    const r = await adminRequest<{ productOptionsCreate: { userErrors: { message: string }[] } }>(
      `mutation($id: ID!, $o: [OptionCreateInput!]!) { productOptionsCreate(productId: $id, options: $o, variantStrategy: CREATE) { userErrors { message } } }`,
      { id: ID, o: [{ name: "Pack", values: PACKS.map((name) => ({ name })) }] },
      { retries: 1 },
    );
    if (r.productOptionsCreate.userErrors.length) throw new Error(`option: ${JSON.stringify(r.productOptionsCreate.userErrors)}`);
    p = await read();
  }

  // 2. Prices, and make the new variants sellable like the existing ones
  const variants = p.variants.nodes;
  const singleOf = (v: V) => variants.find((s) => units(s) === 1 && optVal(s, "Color") === optVal(v, "Color"))!;
  const updates = variants.map((v) => {
    const t = target(singleOf(v), units(v));
    return { id: v.id, price: t.price.toFixed(2), compareAtPrice: t.compareAt == null ? null : t.compareAt.toFixed(2), inventoryPolicy: "CONTINUE" };
  });
  const pr = await adminRequest<{ productVariantsBulkUpdate: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $id, variants: $v) { userErrors { message } } }`,
    { id: ID, v: updates },
    { retries: 1 },
  );
  if (pr.productVariantsBulkUpdate.userErrors.length) throw new Error(`prices: ${JSON.stringify(pr.productVariantsBulkUpdate.userErrors)}`);

  if (PRICES_ONLY) {
    p = await read();
    for (const v of p.variants.nodes) console.log(`  ${v.title.padEnd(14)} $${v.price} (compare-at ${v.compareAtPrice ? "$" + v.compareAtPrice : "none"})`);
    return;
  }

  // 3. Pack photos -> product media (once), then onto their variants
  const need = colours.flatMap((c) => [2, 3].map((n) => ({ c, n, alt: packAlt(c, n), file: `${DIR}/pack${n}-${COLOUR_FILE[c]}.jpg` }))).filter((x) => !p.media.nodes.some((m) => m.alt === x.alt));
  if (need.length) {
    const media = [];
    for (const x of need) media.push({ originalSource: await uploadImage(x.file, `fascia-ring-${x.n}pack-${COLOUR_FILE[x.c]}.jpg`), alt: x.alt, mediaContentType: "IMAGE" });
    const m = await adminRequest<{ productUpdate: { userErrors: { message: string }[] } }>(
      `mutation($p: ProductUpdateInput!, $m: [CreateMediaInput!]) { productUpdate(product: $p, media: $m) { userErrors { message } } }`,
      { p: { id: ID }, m: media },
      { retries: 1 },
    );
    if (m.productUpdate.userErrors.length) throw new Error(`media: ${JSON.stringify(m.productUpdate.userErrors)}`);
  }
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    p = await read();
    ready = colours.every((c) => [2, 3].every((n) => p.media.nodes.some((m) => m.alt === packAlt(c, n) && m.status === "READY")));
    if (!ready) await wait(2000);
  }
  if (!ready) throw new Error("Pack photos are still processing in Shopify; re-run to attach them.");

  const attach = p.variants.nodes
    .filter((v) => units(v) > 1)
    .map((v) => ({ variantId: v.id, mediaIds: [p.media.nodes.find((m) => m.alt === packAlt(optVal(v, "Color"), units(v)))!.id] }));
  const at = await adminRequest<{ productVariantAppendMedia: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $m: [ProductVariantAppendMediaInput!]!) { productVariantAppendMedia(productId: $id, variantMedia: $m) { userErrors { message } } }`,
    { id: ID, m: attach },
    { retries: 1 },
  );
  if (at.productVariantAppendMedia.userErrors.length) throw new Error(`variant media: ${JSON.stringify(at.productVariantAppendMedia.userErrors)}`);

  p = await read();
  for (const v of p.variants.nodes) console.log(`  ${v.title.padEnd(14)} $${v.price} (compare-at $${v.compareAtPrice}) ${v.media.nodes.length ? "photo" : "no photo"}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
