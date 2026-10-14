/**
 * Import + content script for the shoulder & neck massager (supplier title "Neck Massager Device").
 *
 *   npx tsx --env-file=.env scripts/enrich-neck-massager.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-neck-massager.ts --apply    # write to Shopify
 *
 * Writes (only with --apply):
 *   - title, handle, SEO title + meta description, clean description HTML
 *   - custom.noel_story (json), custom.perks, custom.gift_for, custom.sale_ends_at
 *   - one extra gallery photo (the "worn at a desk" shot from the supplier description)
 *   - prices, once only (same rule as import-vendor-products.ts: supplier + 2.99 + 30, round99, compare-at x2;
 *     the `noel-priced` tag stops a re-run from adding the markup again)
 *   - tags noel-edit, category:cosy-home, noel-priced; published to the "TheNoelEdit Headless" channel
 * Idempotent: safe to re-run. Run `npm run shopify:sync` afterwards.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const ID = "gid://shopify/Product/15420596912355";
const HEADLESS_CHANNEL = "gid://shopify/Publication/225905705187";
const APPLY = process.argv.includes("--apply");
const OFFER_DAYS = 4;

const HANDLE = "heated-neck-shoulder-massager";
const TITLE = "Wireless Heated Neck & Shoulder Massager, Real-Hand Kneading";
const BRAND = "The Noel Edit";
const SEO_TITLE = `Wireless Heated Neck & Shoulder Massager | ${BRAND}`;
const SEO_DESC =
  "Cordless heated neck and shoulder massager with 3 kneading modes and 2 heat settings. For home or office, a gift for adults. Free shipping on every order.";

/** Supplier lifestyle shot (no text overlay) that is not in the Shopify gallery yet. */
const DESK_SRC = "https://oss.teemdrop.com/goods-admin/2026/05/09/bb7f2358-95e1-48d9-8f1f-e980f175efa3.jpg";
const DESK_ALT = "Neck massager worn on the shoulders while working at a laptop";

const DESCRIPTION_HTML = [
  "<p>A proper shoulder rub, on demand. This wireless, rechargeable neck and shoulder massager with heat rests on your shoulders and kneads with soft five-finger silicone hands, the way a real hand would, while a gentle heat settles in. Strap it on, press power and let it work through a long day at the office or a slow evening at home. A thoughtful gift for any adult who carries their day on their shoulders.</p>",
  "<h3>Why you will love it</h3>",
  "<ul>",
  "<li><strong>Real-hand kneading.</strong> Silicone fingers knead and press the way a person would, with a powerful motor behind them.</li>",
  "<li><strong>3 massage modes.</strong> Multi-kneading, pinch massage and deep massage, each with 3 adjustable intensity levels.</li>",
  "<li><strong>2 heat settings.</strong> Red-light heat pads in the palms add a warming, soothing touch.</li>",
  "<li><strong>Hands-free.</strong> An adjustable strap holds it in place, so your hands stay free to read, type or stir the cocoa.</li>",
  "<li><strong>Cordless.</strong> 2000 mAh rechargeable battery, charged by USB.</li>",
  "<li><strong>More than a neck massager.</strong> Move it to your arms and other areas for a quick treat.</li>",
  "</ul>",
  "<h3>Specifications</h3>",
  "<ul>",
  "<li>Power: 10 W, input 5 V / 2 A</li>",
  "<li>Battery: 2000 mAh, rechargeable</li>",
  "<li>Massage: 3 modes, 3 intensity levels</li>",
  "<li>Heat: 2 settings</li>",
  "<li>Size: 20 x 17 x 14.3 cm</li>",
  "<li>Weight: 760 g</li>",
  "<li>Finish: glossy or matte</li>",
  "</ul>",
  "<h3>In the box</h3>",
  "<ul><li>Shoulder and neck massager x 1</li><li>USB charging cable x 1</li></ul>",
  "<p><em>A wellness product, not a medical device. Do not use on broken skin or while asleep. If you are pregnant, have a pacemaker or a medical condition, check with your doctor first.</em></p>",
].join("\n");

const INFO = [
  { label: "Massage modes", value: "3: multi-kneading, pinch massage and deep massage" },
  { label: "Intensity", value: "3 adjustable levels" },
  { label: "Heat", value: "2 settings, with red-light heat pads in the palms" },
  { label: "Use on", value: "Shoulders and neck. Also works on the arms" },
  { label: "Controls", value: "Power button and heat button. Hold power for 3 seconds to start" },
  { label: "Battery", value: "2000 mAh, rechargeable over USB" },
  { label: "Power", value: "10 W" },
  { label: "Input", value: "5 V / 2 A" },
  { label: "Material", value: "Soft silicone hands and a textured body, with an adjustable strap" },
  { label: "Product size", value: "20 x 17 x 14.3 cm" },
  { label: "Weight", value: "760 g" },
  { label: "Colour", value: "Green" },
  { label: "Finish", value: "Glossy (unpainted) or matte (sprayed)" },
  { label: "In the box", value: "Shoulder and neck massager, USB charging cable" },
  {
    label: "Care & safety",
    value:
      "A wellness product, not a medical device. Do not use on broken skin or while asleep. If you are pregnant, have a pacemaker or a medical condition, check with your doctor first",
  },
];

const PERKS = [
  "Real-hand kneading with 3 massage modes",
  "2 heat settings for a warming, soothing feel",
  "Hands-free strap: wear it at home or at your desk",
  "Rechargeable 2000 mAh battery, charges by USB",
];
const GIFT_FOR = "Anyone who carries stress in their neck and shoulders: desk workers, parents, grandparents and gamers";

/* ── pricing (mirrors import-vendor-products.ts) ─────────────────────── */
const round2 = (n: number) => Math.round(n * 100) / 100;
const round99 = (n: number) => round2(Math.max(1, Math.round(n)) - 0.01);
const newPrice = (supplier: number) => round99(supplier + 2.99 + 30);

type Media = { id: string; alt: string | null; url: string | null };
type Fetched = {
  product: {
    id: string;
    handle: string;
    title: string;
    tags: string[];
    variants: { nodes: { id: string; title: string; price: string; compareAtPrice: string | null }[] };
    media: { nodes: { id: string; alt: string | null; image: { url: string } | null }[] };
  };
};

async function fetchProduct(): Promise<Fetched["product"]> {
  const d = await adminRequest<Fetched>(
    `query($id: ID!) { product(id: $id) { id handle title tags
      variants(first: 50) { nodes { id title price compareAtPrice } }
      media(first: 60) { nodes { id alt ... on MediaImage { image { url } } } } } }`,
    { id: ID },
  );
  return d.product;
}

const toMedia = (p: Fetched["product"]): Media[] => p.media.nodes.map((m) => ({ id: m.id, alt: m.alt, url: m.image?.url.split("?")[0] ?? null }));

/** The product's own photos by their position in the supplier gallery (stable: set by the supplier). */
function pickByFile(media: Media[], prefix: string): string | null {
  return media.find((m) => m.url?.split("/").pop()!.startsWith(prefix))?.url ?? null;
}

const FILE = {
  kneading: "18eb1831", // "Real kneading and massage" lifestyle banner
  controls: "0ca5b8d7", // collage: hands, red-light heat, buttons, silicone hand
  closeup: "cd44b8da", // clean close-up of the two palm heat pads on the shoulder
  product: "f4140fbb", // clean product cut-out
} as const;

async function ensureDeskPhoto(product: Fetched["product"]): Promise<string | null> {
  const have = toMedia(product).find((m) => (m.alt === DESK_ALT || m.url?.split("/").pop()!.startsWith("bb7f2358")) && m.url);
  if (have) return have.url;
  if (!APPLY) return null;
  const r = await adminRequest<{ productUpdate: { userErrors: { message: string }[] } }>(
    `mutation($p: ProductUpdateInput!, $m: [CreateMediaInput!]) { productUpdate(product: $p, media: $m) { userErrors { message } } }`,
    { p: { id: ID }, m: [{ originalSource: DESK_SRC, alt: DESK_ALT, mediaContentType: "IMAGE" }] },
    { retries: 1 },
  );
  if (r.productUpdate.userErrors.length) throw new Error(`media: ${JSON.stringify(r.productUpdate.userErrors)}`);
  for (let i = 0; i < 20; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    const m = toMedia(await fetchProduct()).find((x) => x.alt === DESK_ALT && x.url);
    if (m) return m.url;
  }
  throw new Error("The desk photo did not finish processing in Shopify; re-run to pick it up.");
}

async function main() {
  const product = await fetchProduct();
  const media = toMedia(product);
  const desk = await ensureDeskPhoto(product);
  const allMedia = desk ? toMedia(await fetchProduct()) : media;
  const img = (k: keyof typeof FILE) => pickByFile(allMedia, FILE[k]);

  const candidates = [
    {
      eyebrow: "Real kneading",
      title: "Hands that knead like hands",
      text: "Soft five-finger silicone hands press and knead either side of your neck, driven by a powerful motor that keeps going without jamming.",
      image: img("kneading") ?? "",
      imageAlt: "A woman relaxing with the massager's silicone hands kneading either side of her neck",
    },
    {
      eyebrow: "Warm and soothing",
      title: "Heat in the palms",
      text: "Red-light heat pads sit in the palms and warm the area as it kneads. Choose between 2 heat settings to suit the evening.",
      image: img("closeup") ?? "",
      imageAlt: "Close-up of the massager on a shoulder with the two glowing palm heat pads",
    },
    {
      eyebrow: "Easy controls",
      title: "Two buttons, nothing to learn",
      text: "One button for power, one for heat, with the charging port between them. Hold power for 3 seconds to start.",
      image: img("controls") ?? "",
      imageAlt: "Collage of the massager's heat pads, textured body, control buttons and silicone hand",
    },
    ...(desk
      ? [
          {
            eyebrow: "Hands-free",
            title: "Wear it while you work",
            text: "An adjustable strap holds it on your shoulders, so you can type, read or watch a film while it works. Cordless, with a 2000 mAh battery.",
            image: desk,
            imageAlt: DESK_ALT,
          },
        ]
      : []),
  ];
  // A photo taken out of the gallery in Shopify drops its section instead of leaving a broken image.
  const features = candidates.filter((f): f is typeof f & { image: string } => Boolean(f.image));
  for (const f of candidates) if (!f.image) console.warn(`! skipped feature "${f.title}": its photo is no longer on the product`);
  const howImage = img("product") ?? pickByFile(allMedia, "162856e7");

  const story = {
    version: 2,
    // The bag and sticky bar show this name, so it is the full product title (the story caps names at 60 characters).
    shortName: TITLE,
    delivery: { minDays: 5, maxDays: 11, note: "Counted from the day you order" },
    optionLabels: { Specifications: "Finish", Color: "Colour" },
    valueLabels: { "Bright surface no spray paint": "Glossy", "Matte surface spray paint version": "Matte" },
    how: {
      eyebrow: "How to use",
      title: "Strap on, press, unwind",
      accent: "unwind",
      intro: "No app, no setup. Put it on your shoulders and let it work.",
      image: howImage,
      imageAlt: "The green shoulder and neck massager with its silicone hands",
      steps: [
        { title: "Rest it on your shoulders", text: "Place the massager over your shoulders with the hands either side of your neck." },
        { title: "Fasten the strap", text: "Pull the buckle round to your back and clip it in. The strap length adjusts to fit." },
        { title: "Hold power for 3 seconds", text: "It starts up. Add warmth with the heat button whenever you like." },
        { title: "Release when done", text: "Press the buckle to release the strap after use, and recharge over USB." },
      ],
    },
    videos: [],
    features,
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "A gift that says unwind",
      accent: "unwind",
      occasions: ["Christmas", "Birthdays", "Anniversaries", "Work-from-home treat", "Self-care night"],
      recipients: ["Mum", "Dad", "Desk workers", "Gamers", "Grandparents", "Anyone who needs to unwind"],
      holidays: ["Christmas", "New Year's Day", "Valentine's Day", "Mother's Day", "Father's Day"],
    },
  };

  const d = new Date(Date.now() + OFFER_DAYS * 86400_000);
  d.setUTCHours(23, 59, 0, 0);
  const offerEnds = d.toISOString().replace(/\.\d+Z$/, "Z");

  const priced = product.tags.includes("noel-priced");
  const updates = product.variants.nodes.map((v) => {
    const price = newPrice(Number(v.price));
    return { id: v.id, title: v.title, from: Number(v.price), price, compareAtPrice: round2(price * 2) };
  });

  if (SEO_TITLE.length > 60) throw new Error(`SEO title ${SEO_TITLE.length} chars (max 60)`);
  if (SEO_DESC.length > 155) throw new Error(`Meta description ${SEO_DESC.length} chars (max 155)`);

  if (!APPLY) {
    console.log(JSON.stringify({ title: TITLE, handle: HANDLE, seo: { title: SEO_TITLE, description: SEO_DESC }, story, perks: PERKS, giftFor: GIFT_FOR, offerEnds }, null, 2));
    console.log(`\nSEO title ${SEO_TITLE.length}c, meta ${SEO_DESC.length}c`);
    console.log(priced ? "Prices: already set (noel-priced)" : "Prices:");
    if (!priced) for (const u of updates) console.log(`  ${u.title.padEnd(40)} $${u.from} -> $${u.price}  (compare-at $${u.compareAtPrice})`);
    console.log(`Desk photo: ${desk ? "already in gallery" : "will be added to the gallery with --apply (preview omits that feature)"}`);
    console.log("\nPreview only. Re-run with --apply to write this to Shopify.");
    return;
  }

  // 1. title, handle, SEO, description
  const u = await adminRequest<{ productUpdate: { userErrors: { message: string }[] } }>(
    `mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { message } } }`,
    { p: { id: ID, title: TITLE, handle: HANDLE, redirectNewHandle: false, descriptionHtml: DESCRIPTION_HTML, seo: { title: SEO_TITLE, description: SEO_DESC } } },
    { retries: 1 },
  );
  if (u.productUpdate.userErrors.length) throw new Error(`product: ${JSON.stringify(u.productUpdate.userErrors)}`);

  // 2. prices (once)
  if (!priced) {
    const r = await adminRequest<{ productVariantsBulkUpdate: { userErrors: { message: string }[] } }>(
      `mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$id, variants:$v){ userErrors{ message } } }`,
      { id: ID, v: updates.map((x) => ({ id: x.id, price: x.price.toFixed(2), compareAtPrice: x.compareAtPrice.toFixed(2) })) },
      { retries: 1 },
    );
    if (r.productVariantsBulkUpdate.userErrors.length) throw new Error(`prices: ${JSON.stringify(r.productVariantsBulkUpdate.userErrors)}`);
  }

  // 3. metafields
  const mf = await adminRequest<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    {
      m: [
        { ownerId: ID, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(story) },
        { ownerId: ID, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(PERKS) },
        { ownerId: ID, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: GIFT_FOR },
        { ownerId: ID, namespace: "custom", key: "sale_ends_at", type: "date_time", value: offerEnds },
      ],
    },
    { retries: 1 },
  );
  if (mf.metafieldsSet.userErrors.length) throw new Error(`metafields: ${JSON.stringify(mf.metafieldsSet.userErrors)}`);

  // 4. tags
  const t = await adminRequest<{ tagsAdd: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $t: [String!]!) { tagsAdd(id: $id, tags: $t) { userErrors { message } } }`,
    { id: ID, t: ["noel-edit", "category:cosy-home", ...(priced ? [] : ["noel-priced"])] },
    { retries: 1 },
  );
  if (t.tagsAdd.userErrors.length) throw new Error(`tags: ${JSON.stringify(t.tagsAdd.userErrors)}`);

  // 5. sales channel
  const pub = await adminRequest<{ publishablePublish: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $in: [PublicationInput!]!) { publishablePublish(id: $id, input: $in) { userErrors { message } } }`,
    { id: ID, in: [{ publicationId: HEADLESS_CHANNEL }] },
    { retries: 1 },
  );
  if (pub.publishablePublish.userErrors.length) throw new Error(`publish: ${JSON.stringify(pub.publishablePublish.userErrors)}`);

  console.log(`Done. /products/${HANDLE} written (${features.length} features, ${INFO.length} spec rows). Offer ends ${offerEnds}.`);
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
