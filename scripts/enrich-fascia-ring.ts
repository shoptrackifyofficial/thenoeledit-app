/**
 * Import + content script for the fascia ring massager (supplier title
 * "Multifunctional Full-Body Fascia Ring Exercise Vibration Fitness Massager For Fat Burning&Shaping Weight Loss Body Shaping").
 *
 *   npx tsx --env-file=.env scripts/enrich-fascia-ring.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-fascia-ring.ts --apply    # write to Shopify
 *
 * Writes (only with --apply):
 *   - title, handle, SEO title + meta description, clean description HTML
 *   - custom.noel_story (json), custom.perks, custom.gift_for, custom.sale_ends_at
 *   - the supplier DESCRIPTION pictures (not the gallery photos), copied to Shopify Files and used as feature sections
 *   - prices, once only (supplier + 2.99 + 30, round99, compare-at x2; the `noel-priced` tag stops a re-run adding the markup again)
 *   - tags noel-edit, category:for-her, noel-priced; published to the "TheNoelEdit Headless" channel
 * Idempotent: safe to re-run. Run `npm run shopify:sync` afterwards.
 *
 * Deliberately left out: the supplier pictures that promise fat burning or "10 minutes = 2 hours of yoga",
 * and the supplier copy about calorie burn. The page sells it as a body massager, not a weight-loss device.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const ID = "gid://shopify/Product/15492437344483";
const HEADLESS_CHANNEL = "gid://shopify/Publication/225905705187";
const APPLY = process.argv.includes("--apply");
const OFFER_DAYS = 4;
const CUSTOMERS_COUNT = 219200;

const HANDLE = "fascia-ring-vibration-massager";
const TITLE =
  "Multifunctional Full-Body Fascia Ring Vibration Body Fitness Massager For Fat Burning & Shaping"; // the store owner's own title: do not shorten
const SHORT_NAME = "Fascia Ring Vibration Massager"; // for the bag and the floating buy bar
const BRAND = "The Noel Edit";
const SEO_TITLE = `Fascia Ring Vibration Massager | ${BRAND}`; // as edited in Shopify
const SEO_DESC =
  "Rechargeable fascia ring body massager with 5 vibration levels. Hold it or strap it on for waist, arms, legs and back. Free shipping on every order.";

/** Supplier description pictures (AliExpress CDN), in the order they appear in the supplier description. */
const SRC = {
  hero: "Se699007fb54743b282dd3848d7933bba3", // pink ring + belt + model wearing it
  black: "Sd83ff167629846e6a335ce9b726cfc4fM", // black ring + belt + model wearing it
  handheld: "Sc002c3deeb79494ea0ea29a62bd331c5s", // "Handheld body massager": 5 speed levels, comfort grip, waist & arm use
  arm: "S316ef0f741d947b3957765af459e2db7g", // pink ring used on the upper arm
  thigh: "S00215e6e82b743ed80f73d5624a42102U", // black ring used on the thigh
  zones: "S3cf8f597737f4ab5a95d4ebeb1f3557ah", // six zones: abdomen, shoulder ridge, back, hand, buttocks, legs
  twoWays: "S665c2c7f2aab4d62a9521eb2c7a6821dR", // handheld type vs wearable waist-belt type
  levels: "S5ab64e19789544899ad143d23730ef71m", // "5 levels of intensity adjustment"
  battery: "Sfc80eb0850fd4e7c9131341ad4dc221f2", // Type-C fast charging, battery cut-away
} as const;
type Key = keyof typeof SRC;
const srcUrl = (k: Key) =>
  `https://ae-pic-a1.aliexpress-media.com/kf/${SRC[k]}.jpg`;
const fileName = (k: Key) => `fascia-ring-${k}`;

const DESCRIPTION_HTML = [
  "<p>One compact ring, two ways to use it. Hold it by the comfort grip and glide the five massage nodes over your arms, thighs and calves, or slip the adjustable belt through and wear it hands-free around your waist, back or hips. Five vibration levels let you start gentle after a long day of sitting and go deeper after a workout. Rechargeable over USB-C, small enough for the gym bag.</p>",
  "<h3>Why you will love it</h3>",
  "<ul>",
  "<li><strong>Handheld or wearable.</strong> Use the grip for arms and legs, or strap it on with the belt for waist, back and abdomen.</li>",
  "<li><strong>5 intensity levels.</strong> One button switches freely between gentle and deep vibration.</li>",
  "<li><strong>Powerful motor.</strong> Up to 20,800 RPM for a strong, even vibration.</li>",
  "<li><strong>Comfort grip.</strong> A shaped handle keeps your hand relaxed during longer sessions.</li>",
  "<li><strong>Cordless.</strong> Built-in rechargeable battery, charged through any USB-C port.</li>",
  "</ul>",
  "<h3>Specifications</h3>",
  "<ul>",
  "<li>Size: 13 x 13 cm</li>",
  "<li>Vibration: 5 intensity levels, motor up to 20,800 RPM</li>",
  "<li>Power: built-in rechargeable battery, USB-C charging</li>",
  "<li>Use: handheld, or worn with the adjustable belt</li>",
  "</ul>",
  "<h3>In the box</h3>",
  "<ul><li>Fascia ring massager x 1</li><li>Adjustable waist belt x 1</li><li>USB-C charging cable x 1</li></ul>",
  "<p><em>A wellness product, not a medical device. Do not use on broken skin or while asleep. If you are pregnant, have a pacemaker or a medical condition, check with your doctor first.</em></p>",
].join("\n");

const INFO = [
  { label: "Vibration levels", value: "5, switched with a single button" },
  { label: "Motor", value: "Up to 20,800 RPM" },
  {
    label: "Use",
    value: "Handheld with the comfort grip, or worn with the adjustable belt",
  },
  {
    label: "Use on",
    value: "Waist and abdomen, back, shoulders, arms, thighs, calves and hips",
  },
  { label: "Battery", value: "Built-in and rechargeable, charged by USB-C" },
  { label: "Product size", value: "13 x 13 cm (5.12 x 5.12 in)" },
  { label: "Massage nodes", value: "5 rounded nodes on one edge of the ring" },
  { label: "Display", value: "Small screen showing the current level" },
  {
    label: "In the box",
    value: "Fascia ring massager, adjustable waist belt, USB-C charging cable",
  },
  {
    label: "Care & safety",
    value:
      "A wellness product, not a medical device. Do not use on broken skin or while asleep. If you are pregnant, have a pacemaker or a medical condition, check with your doctor first",
  },
];

const PERKS = [
  "5 vibration levels, one button",
  "Handheld or wearable with the belt",
  "Rechargeable over USB-C",
  "Compact 13 x 13 cm ring",
  "Waist, arms, legs and back",
];
const GIFT_FOR =
  "Anyone who sits a lot or loves a workout: gym-goers, desk workers, new year fitness starters and self-care fans";

/* ── pricing (mirrors import-vendor-products.ts) ─────────────────────── */
const round2 = (n: number) => Math.round(n * 100) / 100;
const round99 = (n: number) => round2(Math.max(1, Math.round(n)) - 0.01);
const newPrice = (supplier: number) => round99(supplier + 2.99 + 30);

type Fetched = {
  product: {
    id: string;
    handle: string;
    title: string;
    tags: string[];
    customersCount: { value: string } | null;
    variants: {
      nodes: {
        id: string;
        title: string;
        price: string;
        compareAtPrice: string | null;
      }[];
    };
  };
};

async function fetchProduct(): Promise<Fetched["product"]> {
  const d = await adminRequest<Fetched>(
    `query($id: ID!) { product(id: $id) { id handle title tags customersCount: metafield(namespace: "custom", key: "customers_count") { value } variants(first: 50) { nodes { id title price compareAtPrice } } } }`,
    { id: ID },
  );
  return d.product;
}

/** A description picture hosted as a Shopify File (not gallery media), uploaded once and found again by its file name. */
async function hostedImage(k: Key, preview: boolean): Promise<string | null> {
  const stem = fileName(k);
  const find = async () => {
    const r = await adminRequest<{
      files: {
        nodes: { fileStatus?: string; image?: { url: string } | null }[];
      };
    }>(
      `query($q: String!) { files(first: 5, query: $q) { nodes { ... on MediaImage { fileStatus image { url } } } } }`,
      { q: `filename:${stem}*` },
    );
    const hit = r.files.nodes.find(
      (n) => n.fileStatus === "READY" && n.image?.url,
    );
    return hit ? hit.image!.url.split("?")[0]! : null;
  };
  const existing = await find();
  if (existing || preview) return existing;

  const created = await adminRequest<{
    fileCreate: { files: { id: string }[]; userErrors: { message: string }[] };
  }>(
    `mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } userErrors { message } } }`,
    {
      files: [
        {
          originalSource: srcUrl(k),
          filename: `${stem}.jpg`,
          contentType: "IMAGE",
          alt: "Fascia ring massager",
        },
      ],
    },
    { retries: 1 },
  );
  const cerr = created.fileCreate.userErrors[0]?.message;
  if (cerr) throw new Error(`fileCreate ${k}: ${cerr}`);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const url = await find();
    if (url) return url;
  }
  throw new Error(`Timed out waiting for Shopify to process ${k}`);
}

async function main() {
  const product = await fetchProduct();
  const img = async (k: Key) => (await hostedImage(k, !APPLY)) ?? "";

  const candidates = [
    {
      eyebrow: "Two ways to use it",
      title: "Hold it, or strap it on",
      text: "Grip the ring to work along arms and legs, or run the adjustable belt through it and wear it hands-free around your waist or back.",
      image: await img("twoWays"),
      imageAlt:
        "Fascia ring used handheld on the arm, and worn on a belt at the waist",
    },
    {
      eyebrow: "Comfort grip",
      title: "Handheld and easy on the wrist",
      text: "A shaped handle sits naturally in your hand, with five rounded nodes that glide over the skin without any strain.",
      image: await img("handheld"),
      imageAlt:
        "Handheld body massager in black and pink with 5 speed levels, comfort grip and waist and arm use",
    },
    {
      eyebrow: "Arms",
      title: "Deep vibration for sore arms",
      text: "Glide the nodes along your upper arm for a steady, soothing vibration after carrying, lifting or a long day at a desk.",
      image: await img("arm"),
      imageAlt:
        "A woman using the pink fascia ring on her upper arm, with vibration ripples",
    },
    {
      eyebrow: "Legs",
      title: "Thighs and calves, covered",
      text: "Work the ring over thighs and calves after a run or a long day on your feet. The level shows on the small screen.",
      image: await img("thigh"),
      imageAlt:
        "A hand holding the black fascia ring against a thigh, with vibration ripples",
    },
    {
      eyebrow: "Everywhere you need it",
      title: "One ring, six places",
      text: "Abdomen, shoulder ridge, back, hands, buttocks and legs: hold it or belt it on wherever you feel tight.",
      image: await img("zones"),
      imageAlt:
        "Six ways to use the ring: abdomen, shoulder ridge, back, hand, buttocks and legs",
    },
    {
      eyebrow: "Your pace",
      title: "5 levels, one button",
      text: "Tap once to step through five vibration levels, from gentle wind-down to a deeper session. The screen shows where you are.",
      image: await img("levels"),
      imageAlt:
        "The pink fascia ring with its level display, button and USB-C port, labelled 5 levels of intensity adjustment",
    },
    {
      eyebrow: "Cordless",
      title: "Charge over USB-C, go anywhere",
      text: "A built-in rechargeable battery means no cable while you use it. Top it up from any USB-C port and toss it in your gym bag.",
      image: await img("battery"),
      imageAlt:
        "Cut-away of the black fascia ring showing its battery, with a USB-C cable charging it",
    },
  ];
  const features = candidates.filter((f) => Boolean(f.image));
  for (const f of candidates)
    if (!f.image)
      console.warn(
        `! skipped feature "${f.title}": picture not hosted yet (run with --apply)`,
      );
  const howImage = (await img("hero")) || null;

  const story = {
    version: 2,
    shortName: SHORT_NAME,
    delivery: {
      minDays: 5,
      maxDays: 11,
      note: "Counted from the day you order",
    },
    optionLabels: { Color: "Colour", Pack: "Pack" },
    valueLabels: {},
    // Pack cards: 2 Pack keeps the default "Most gifted" tag, 3 Pack is buy 2, get 1 free (see fascia-ring-packs.ts).
    packTags: { "3": "Buy 2 Get 1 Free" },
    // One-tap extra in the bag while this product is in it, priced at its own Shopify sale price.
    bump: {
      handle: "heated-neck-shoulder-massager",
      headline: "Add the heated 5-finger body massager",
      text: "Cordless, with 3 kneading modes and 2 heat settings for your neck, shoulders, arms and legs.",
    },
    how: {
      eyebrow: "How to use",
      title: "Hold it, or belt it on",
      accent: "belt it on",
      intro: "No app, no setup. Charge it, press the button and go.",
      image: howImage,
      imageAlt:
        "The fascia ring with its grey belt, and a woman wearing it at the waist",
      steps: [
        {
          title: "Charge it",
          text: "Plug in the USB-C cable until the battery is full.",
        },
        {
          title: "Press the button",
          text: "Hold to switch on, then tap to step through the 5 levels. The screen shows your level.",
        },
        {
          title: "Hold it or belt it",
          text: "Grip the handle for arms and legs, or thread the belt through the ring and fasten it round your waist or back.",
        },
        {
          title: "Glide and relax",
          text: "Move the nodes slowly over the area. Switch off when you are done.",
        },
      ],
    },
    videos: [],
    features,
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "A gift for a stronger new year",
      accent: "stronger",
      occasions: [
        "Christmas",
        "Birthdays",
        "New year fitness",
        "Self-care night",
        "Secret Santa",
      ],
      recipients: [
        "Her",
        "Gym-goers",
        "Desk workers",
        "Mum",
        "Anyone who needs to unwind",
      ],
      holidays: [
        "Christmas",
        "New Year's Day",
        "Valentine's Day",
        "Mother's Day",
      ],
    },
  };

  const d = new Date(Date.now() + OFFER_DAYS * 86400_000);
  d.setUTCHours(23, 59, 0, 0);
  const offerEnds = d.toISOString().replace(/\.\d+Z$/, "Z");

  const priced = product.tags.includes("noel-priced");
  const updates = product.variants.nodes.map((v) => {
    const price = newPrice(Number(v.price));
    return {
      id: v.id,
      title: v.title,
      from: Number(v.price),
      price,
      compareAtPrice: round2(price * 2),
    };
  });

  if (SEO_TITLE.length > 60)
    throw new Error(`SEO title ${SEO_TITLE.length} chars (max 60)`);
  if (SEO_DESC.length > 155)
    throw new Error(`Meta description ${SEO_DESC.length} chars (max 155)`);

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          title: TITLE,
          handle: HANDLE,
          seo: { title: SEO_TITLE, description: SEO_DESC },
          story,
          perks: PERKS,
          giftFor: GIFT_FOR,
          offerEnds,
        },
        null,
        2,
      ),
    );
    console.log(`\nSEO title ${SEO_TITLE.length}c, meta ${SEO_DESC.length}c`);
    console.log(priced ? "Prices: already set (noel-priced)" : "Prices:");
    if (!priced)
      for (const u of updates)
        console.log(
          `  ${u.title.padEnd(20)} $${u.from} -> $${u.price}  (compare-at $${u.compareAtPrice})`,
        );
    console.log(
      "\nPreview only. Re-run with --apply to write this to Shopify.",
    );
    return;
  }

  // 1. title, handle, SEO, description
  const u = await adminRequest<{
    productUpdate: { userErrors: { message: string }[] };
  }>(
    `mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { message } } }`,
    {
      p: {
        id: ID,
        title: TITLE,
        handle: HANDLE,
        redirectNewHandle: false,
        descriptionHtml: DESCRIPTION_HTML,
        seo: { title: SEO_TITLE, description: SEO_DESC },
      },
    },
    { retries: 1 },
  );
  if (u.productUpdate.userErrors.length)
    throw new Error(`product: ${JSON.stringify(u.productUpdate.userErrors)}`);

  // 2. prices (once)
  if (!priced) {
    const r = await adminRequest<{
      productVariantsBulkUpdate: { userErrors: { message: string }[] };
    }>(
      `mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$id, variants:$v){ userErrors{ message } } }`,
      {
        id: ID,
        v: updates.map((x) => ({
          id: x.id,
          price: x.price.toFixed(2),
          compareAtPrice: x.compareAtPrice.toFixed(2),
        })),
      },
      { retries: 1 },
    );
    if (r.productVariantsBulkUpdate.userErrors.length)
      throw new Error(
        `prices: ${JSON.stringify(r.productVariantsBulkUpdate.userErrors)}`,
      );
  }

  // 3. metafields
  const mf = await adminRequest<{
    metafieldsSet: { userErrors: { message: string }[] };
  }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    {
      m: [
        {
          ownerId: ID,
          namespace: "custom",
          key: "noel_story",
          type: "json",
          value: JSON.stringify(story),
        },
        {
          ownerId: ID,
          namespace: "custom",
          key: "perks",
          type: "list.single_line_text_field",
          value: JSON.stringify(PERKS),
        },
        {
          ownerId: ID,
          namespace: "custom",
          key: "gift_for",
          type: "single_line_text_field",
          value: GIFT_FOR,
        },
        {
          ownerId: ID,
          namespace: "custom",
          key: "sale_ends_at",
          type: "date_time",
          value: offerEnds,
        },
        // "Trusted by N customers worldwide" on the product page: only seeded when empty, so edits in Shopify admin stay.
        ...(product.customersCount
          ? []
          : [
              {
                ownerId: ID,
                namespace: "custom",
                key: "customers_count",
                type: "number_integer",
                value: String(CUSTOMERS_COUNT),
              },
            ]),
      ],
    },
    { retries: 1 },
  );
  if (mf.metafieldsSet.userErrors.length)
    throw new Error(
      `metafields: ${JSON.stringify(mf.metafieldsSet.userErrors)}`,
    );

  // 4. tags
  const t = await adminRequest<{
    tagsAdd: { userErrors: { message: string }[] };
  }>(
    `mutation($id: ID!, $t: [String!]!) { tagsAdd(id: $id, tags: $t) { userErrors { message } } }`,
    {
      id: ID,
      t: ["noel-edit", "category:for-her", ...(priced ? [] : ["noel-priced"])],
    },
    { retries: 1 },
  );
  if (t.tagsAdd.userErrors.length)
    throw new Error(`tags: ${JSON.stringify(t.tagsAdd.userErrors)}`);

  // 5. sales channel
  const pub = await adminRequest<{
    publishablePublish: { userErrors: { message: string }[] };
  }>(
    `mutation($id: ID!, $in: [PublicationInput!]!) { publishablePublish(id: $id, input: $in) { userErrors { message } } }`,
    { id: ID, in: [{ publicationId: HEADLESS_CHANNEL }] },
    { retries: 1 },
  );
  if (pub.publishablePublish.userErrors.length)
    throw new Error(
      `publish: ${JSON.stringify(pub.publishablePublish.userErrors)}`,
    );

  console.log(
    `Done. /products/${HANDLE} written (${features.length} features, ${INFO.length} spec rows). Offer ends ${offerEnds}.`,
  );
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
