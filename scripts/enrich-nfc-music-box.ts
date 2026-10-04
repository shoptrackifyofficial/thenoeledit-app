/**
 * Content script for the "Christmas Mini NFC Music Box" fridge magnet.
 *
 *   npx tsx --env-file=.env scripts/enrich-nfc-music-box.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-nfc-music-box.ts --apply    # write to Shopify
 *
 * Writes (only with --apply):
 *   - custom.noel_story (json), custom.perks, custom.gift_for
 *   - tags: noel-edit, category:cosy-home
 *   - publishes the product to the "TheNoelEdit Headless" sales channel
 * Delivery for this product is 7-15 working days (high demand), set in story.delivery.
 * Images are the product's own Shopify-hosted media. Idempotent: safe to re-run.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const PRODUCT_ID = "gid://shopify/Product/15406270939363";
const HEADLESS_CHANNEL = "gid://shopify/Publication/225905705187";
const APPLY = process.argv.includes("--apply");

/** Media picked by the start of the supplier file name (indexes in the gallery noted for reference). */
const IMG = {
  gift: "S31827fa5a3b045fcaf148e9f1", // 0  "Perfect Gift" hero
  songs: "Sc6309f8540a8485a98d6294cf", // 4  "9 Classic Songs Built In"
  family: "S3a7347ac5ff04e138dea8d77b", // 11 family dancing by the fridge
  features: "S795415dd862645deac0a83eee", // 12 music installed / easy start / 256MB / add your own
  tap: "S5c077fec832849f29bb7b1880", // 13 "Tap to Play with NFC"
  glow: "S339028140afd476f9db2a62317c16c5et", // 22 glowing player in a kitchen
  fridge: "Sc550c60f908d45269a6073d36", // 2  player on the fridge
} as const;

const INFO = [
  { label: "Playback", value: "NFC tap-to-play: place a record disc on the player and tap the sensor to play" },
  { label: "Songs", value: "9 classic Christmas songs built in" },
  { label: "Memory", value: "256 MB memory card stores more songs, so you can add your own music any time" },
  { label: "Light", value: "Soft glowing ambient night light, lovely in a dark kitchen or hallway" },
  { label: "Dimensions", value: "Player 11 cm x 12.8 cm; record discs 5 cm" },
  { label: "Mounting", value: "Magnet back: sticks to the fridge, easy to move" },
  { label: "Designs", value: "7 designs, including Merry Christmas, Christmas Classics, Winter Village and a Halloween Boo Box" },
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
    shortName: "NFC music box magnet",
    optionLabels: { Color: "Design" },
    // Shopify's A1..A7 are supplier codes; these are the names shoppers see (matched to each variant's photo).
    valueLabels: {
      A1: "Jingle Vinyl",
      A2: "Merry Christmas",
      A3: "Christmas Classics",
      A4: "Fridge Glow",
      A5: "Look a Lot Like Christmas",
      A6: "Winter Village",
      A7: "Boo Box (Halloween)",
    },
    // High demand: longer than the site default.
    delivery: { minDays: 7, maxDays: 15, note: "Longer than usual due to high demand" },
    how: {
      eyebrow: "How it works",
      title: "Place a disc, hear the music",
      accent: "hear the music",
      intro: "A tiny record player for your fridge. Tap a disc on the player and the carol starts.",
      image: pick(files, IMG.tap),
      imageAlt: "Tap to play with NFC: place a disc, tap the sensor, play music",
      steps: [
        { title: "Stick it on", text: "The magnet back holds the player on your fridge or any metal surface." },
        { title: "Place a disc", text: "Choose one of the little record discs and place it on the player." },
        { title: "Tap to play", text: "The NFC sensor reads the disc and the music starts. Nine Christmas songs are built in." },
        { title: "Add your own", text: "A 256 MB memory card holds more songs, so you can add your own music any time." },
      ],
    },
    videos: [],
    features: [
      {
        eyebrow: "Ready out of the box",
        title: "9 classic songs built in",
        text: "Every tap plays a joyful holiday tune. Music is already installed, so there is nothing to set up.",
        image: pick(files, IMG.songs),
        imageAlt: "The music box player beside nine record discs, with the words 9 Classic Songs Built In",
      },
      {
        eyebrow: "Make it yours",
        title: "Add your own music",
        text: "A 256 MB memory card stores more songs. Easy to start, simple to use, and no phone scrolling needed.",
        image: pick(files, IMG.features),
        imageAlt: "Highlights: music already installed, easy start, 256 MB memory card, add your own music",
      },
      {
        eyebrow: "For the one who lives in the kitchen",
        title: "A soft glow and a carol at the fridge",
        text: "She is at the stove and the sink more than anywhere. Give her a little music to cook to and a warm night light for late evenings in the kitchen.",
        image: pick(files, IMG.glow),
        imageAlt: "The glowing music player on a fridge in a decorated kitchen",
      },
      {
        eyebrow: "Family time",
        title: "Joy at the fridge door",
        text: "A small gift that gets everyone dancing and singing in the kitchen, from kids to grandparents.",
        image: pick(files, IMG.family),
        imageAlt: "A family dancing by the fridge while the music box plays",
      },
    ],
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "Made to be gifted",
      accent: "gifted",
      occasions: ["Christmas", "Stocking filler", "Secret Santa", "Housewarming", "Kitchen decor", "Thank-you gift"],
      recipients: ["Mum or grandma who loves to cook", "Home cooks and bakers", "Teens", "Music lovers", "Families"],
      holidays: ["Christmas", "New Year's Day", "Halloween (Boo Box design)"],
    },
  };

  const perks = [
    "Best gift for women who live in the kitchen",
    "9 Christmas songs built in, tap to play",
    "Soft glowing night light",
    "Magnet back, sticks to your fridge",
  ];
  const giftFor = "The best gift for the woman who spends most of her time in the kitchen: carols at the fridge, a glow after dark";

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
