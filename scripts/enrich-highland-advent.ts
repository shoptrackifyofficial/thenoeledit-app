/**
 * Content script for the "2026 Highland Cow Magic Advent Calendar".
 *
 *   npx tsx --env-file=.env scripts/enrich-highland-advent.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-highland-advent.ts --apply    # write to Shopify
 *
 * Writes (only with --apply): custom.noel_story, custom.perks, custom.gift_for,
 * tags (noel-edit, category:cosy-home) and publishes to the "TheNoelEdit Headless" channel.
 * Images are the product's own Shopify-hosted media (clean shots, no supplier watermark).
 * Idempotent: safe to re-run.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const PRODUCT_ID = "gid://shopify/Product/15406274805987";
const HEADLESS_CHANNEL = "gid://shopify/Publication/225905705187";
const APPLY = process.argv.includes("--apply");

/** Media picked by the start of the supplier file name (gallery index noted). */
const IMG = {
  hero: "S6d5c5d0125c5407a9bb", // the box, its 24 doors and the 24 cows (also the variant image)
  room: "Sb0794b0414834e67b0b", // living room with the tree (9)
  snow: "S549a83d23c154a4cb1c", // snowy cabin scene (10)
  cows: "S74582e98989f41b3844", // all 24 figures laid out (7)
  size: "S3c4c4199001042358b0", // dimensions (12)
} as const;

const INFO = [
  { label: "Contents", value: "1 advent calendar box with 24 numbered doors, one Highland cow figure behind each" },
  { label: "Dimensions", value: "Box about 26 cm x 18 cm x 3 cm (10.2 x 7.1 x 1.2 in). Allow 2-3% for manual measuring" },
  { label: "Material", value: "Plastic" },
  { label: "Foldable", value: "Yes" },
  { label: "Colour", value: "As shown in the pictures; screens may differ slightly" },
  { label: "Occasion", value: "Christmas countdown, birthday parties, holiday gifting, home and desk decor" },
];

async function mediaByName(): Promise<Map<string, string>> {
  const d = await adminRequest<{ product: { media: { nodes: { image?: { url: string } }[] } } }>(
    `query($id: ID!) { product(id: $id) { media(first: 60) { nodes { ... on MediaImage { image { url } } } } } }`,
    { id: PRODUCT_ID },
  );
  const out = new Map<string, string>();
  for (const n of d.product.media.nodes) {
    if (!n.image?.url) continue;
    const clean = n.image.url.split("?")[0]!;
    out.set(clean.split("/").pop()!, clean);
  }
  return out;
}

function pick(files: Map<string, string>, prefix: string): string {
  for (const [name, url] of files) if (name.startsWith(prefix)) return url;
  throw new Error(`Image ${prefix} not found on the product`);
}

async function main() {
  const files = await mediaByName();

  const story = {
    version: 2,
    shortName: "Highland Cow Advent Calendar",
    how: {
      eyebrow: "How it works",
      title: "One little cow a day",
      accent: "One little cow",
      intro: "A countdown that starts on 1 December and ends on Christmas Eve, with a surprise every morning.",
      image: pick(files, IMG.snow),
      imageAlt: "The Highland Cow Magic advent calendar box on a snowy shelf in front of a row of cow figures",
      steps: [
        { title: "Set it out", text: "Pop the calendar on a shelf, desk or mantel. It is foldable, so it also stores flat." },
        { title: "Open a door", text: "Each of the 24 numbered doors hides one Highland cow figure. Open today's number." },
        { title: "Collect the herd", text: "Stand the cow on the display steps and watch the row grow day by day." },
        { title: "Celebrate", text: "Reach number 24 on Christmas Eve and the whole herd is on show." },
      ],
    },
    videos: [],
    features: [
      {
        eyebrow: "24 days, 24 cows, 24 surprises",
        title: "A fresh little character every day",
        text: "Each door opens on a different Highland cow in its own outfit and pose. From readers to rocking guitarists, there is a new one to meet every day.",
        image: pick(files, IMG.hero),
        imageAlt: "The advent calendar box with its 24 doors and 24 Highland cow figures lined up on steps",
      },
      {
        eyebrow: "Family countdown",
        title: "Make December feel like Christmas",
        text: "Opening one small door a day builds the excitement and gives the whole family a moment to share each morning.",
        image: pick(files, IMG.room),
        imageAlt: "The advent calendar on a coffee table beside a lit Christmas tree with a few cow figures on display",
      },
      {
        eyebrow: "Collect and display",
        title: "Decor you keep after Christmas",
        text: "The finished set is a cheerful desk or shelf display. Take the figures out and arrange them any way you like.",
        image: pick(files, IMG.cows),
        imageAlt: "All 24 Highland cow figures laid out beside the advent calendar box",
      },
    ],
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "Made to be gifted",
      accent: "gifted",
      occasions: ["Christmas countdown", "Stocking filler", "Secret Santa", "Birthday party", "Home & desk decor"],
      recipients: ["Highland cow fans", "Kids and teens", "Families", "Collectors", "Colleagues and friends"],
      holidays: ["Christmas", "New Year's Day"],
    },
  };

  const perks = [
    "24 doors, 24 Highland cow figures",
    "A countdown from 1 December to Christmas Eve",
    "Foldable, so it stores flat",
    "Doubles as a desk or shelf display",
  ];
  const giftFor = "Highland cow fans, families, kids and anyone who loves a festive countdown";

  if (!APPLY) {
    console.log(JSON.stringify({ story, perks, giftFor }, null, 2));
    console.log("\nPreview only. Re-run with --apply to write this to Shopify.");
    return;
  }

  const set = await adminRequest<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
    {
      m: [
        { ownerId: PRODUCT_ID, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(story) },
        { ownerId: PRODUCT_ID, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(perks) },
        { ownerId: PRODUCT_ID, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: giftFor },
      ],
    },
  );
  if (set.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(set.metafieldsSet.userErrors));

  const tag = await adminRequest<{ tagsAdd: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`,
    { id: PRODUCT_ID, tags: ["noel-edit", "category:cosy-home"] },
  );
  if (tag.tagsAdd.userErrors.length) throw new Error(JSON.stringify(tag.tagsAdd.userErrors));

  const pub = await adminRequest<{ publishablePublish: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $in: [PublicationInput!]!) { publishablePublish(id: $id, input: $in) { userErrors { message } } }`,
    { id: PRODUCT_ID, in: [{ publicationId: HEADLESS_CHANNEL }] },
  );
  if (pub.publishablePublish.userErrors.length) throw new Error(JSON.stringify(pub.publishablePublish.userErrors));
  console.log("Done. Story, perks, tags and the TheNoelEdit Headless channel are set.");
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error("x", m);
  process.exit(1);
});
