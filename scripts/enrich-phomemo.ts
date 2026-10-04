/**
 * Content script for the Phomemo P15 label printer and its satin-ribbon add-on.
 *
 *   npx tsx --env-file=.env scripts/enrich-phomemo.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-phomemo.ts --apply    # write to Shopify
 *
 * Writes (only with --apply):
 *   - Printer: custom.noel_story (json), custom.perks, custom.gift_for; tags noel-edit, category:cosy-home
 *   - Ribbon:  its own product (custom.noel_story with `multi`: any colours, any quantity, the 50/56/65%
 *     offer on total ribbons), tags noel-edit, category:stocking-fillers. The printer's page also offers it
 *     as an optional extra (story.addon).
 * Idempotent: safe to re-run. Images are the product's own Shopify-hosted media.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const PRINTER_ID = "gid://shopify/Product/15406039531747";
const RIBBON_ID = "gid://shopify/Product/15406027964643";
const APPLY = process.argv.includes("--apply");

/** The printer's media, picked by the start of the supplier file name. */
const IMG = {
  gift: "Sae577218d9744755a10726eb01b27ae2R", // red P15 beside a wrapped present and ribbon
  box: "S1c09d7a156c94ae6b5f9a0b395714ce49.webp", // gift-box lifestyle shot
  easy: "S76e579f9a47b4b97be3768f786808dc3X.webp", // "Easy to use for all ages"
  red: "S665e768ef7664b6099971c79ad9d8ecab", // clean red shot
} as const;

const INFO = [
  { label: "Connection", value: "Bluetooth to iOS and Android through the free Print Master app" },
  { label: "Charging", value: "Rechargeable: battery included, charges over USB-C" },
  { label: "Resolution", value: "203 dpi thermal printing" },
  { label: "Labels", value: "Auto-detects the label type and size. 10+ specialty types: magnetic, glitter, luminous, iron-on fabric, patterned" },
  { label: "Library", value: "200+ fonts, plus symbols, templates, borders and icons. Add text, QR codes, barcodes and images" },
  { label: "Durability", value: "Water- and oil-resistant labels" },
  { label: "Ribbon", value: "Optional compatible satin ribbon, 12 mm x 5 m per cartridge (non-adhesive, third-party compatible, not original Phomemo)" },
  { label: "In the box", value: "P15 label maker, starter label set, USB cable, user manual. Satin ribbon is not included (sold separately)" },
  { label: "Certification", value: "CE, FCC, RoHS" },
];

async function mediaByName(productId: string): Promise<Map<string, string>> {
  const d = await adminRequest<{ product: { media: { nodes: { image?: { url: string } }[] } } }>(
    `query($id: ID!) { product(id: $id) { media(first: 60) { nodes { ... on MediaImage { image { url } } } } } }`,
    { id: productId },
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
  const files = await mediaByName(PRINTER_ID);
  const ribbonHandle = (
    await adminRequest<{ product: { handle: string } }>(`query($id: ID!) { product(id: $id) { handle } }`, { id: RIBBON_ID })
  ).product.handle;

  const story = {
    version: 2,
    shortName: "P15 label printer",
    box: {
      included: ["P15 label maker", "Starter label set", "USB cable", "User manual"],
      separate: ["Satin ribbon cartridges"],
    },
    optionLabels: { color: "Colour" },
    valueLabels: { "Green P15": "Mint green", "Red P15": "Retro red", "yellow P15": "Cream" },
    addon: {
      handle: ribbonHandle,
      name: "Satin ribbon",
      intro: "Print a name, date or message on 12 mm satin ribbon, then tie it on. Any colours, any amount.",
    },
    how: {
      eyebrow: "How it works",
      title: "From phone to label in four taps",
      accent: "four taps",
      intro: "No computer, no manual. Design on your phone and the P15 prints it.",
      image: pick(files, IMG.red),
      imageAlt: "The retro red Phomemo P15 label maker",
      steps: [
        { title: "Get the app", text: "Download the free Print Master app for iOS or Android." },
        { title: "Connect by Bluetooth", text: "Switch the P15 on and pair it from the app. No cables." },
        { title: "Design your label", text: "Pick a template, font, border or icon, or add a QR code, barcode or photo." },
        { title: "Press print", text: "The P15 detects the label type and size for you. Peel, stick or tie it on." },
      ],
    },
    videos: [],
    features: [
      {
        eyebrow: "Wrap it",
        title: "Label every gift like a pro",
        text: "Print a name on satin ribbon and tie it around the present. It turns a wrapped gift into a personal one.",
        image: pick(files, IMG.gift),
        imageAlt: "The red P15 beside a wrapped present and a length of red ribbon",
      },
      {
        eyebrow: "Retro looks, modern smarts",
        title: "A typewriter on your desk",
        text: "A retro-style body with Bluetooth, an app full of fonts and templates, and labels that shrug off water and oil.",
        image: pick(files, IMG.box),
        imageAlt: "The P15 label maker in a navy gift box beside a reel of ribbon",
      },
      {
        eyebrow: "Easy for all ages",
        title: "Design on your phone",
        text: "200+ fonts, symbols and templates, plus QR codes and barcodes. Works with phone, tablet or PC.",
        image: pick(files, IMG.easy),
        imageAlt: "The P15 beside a phone showing the Print Master app",
      },
    ],
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "Made to be gifted",
      accent: "gifted",
      occasions: ["Gift wrapping", "Birthdays", "Weddings", "Home organising", "Craft & DIY", "Back to school"],
      recipients: ["Crafters", "Students & teachers", "Home organisers", "Small-shop owners", "Anyone who loves a tidy label"],
      holidays: ["Christmas", "Valentine's Day", "Mother's Day", "Birthdays", "Back to school"],
    },
  };
  const perks = [
    "Prints from your phone over Bluetooth",
    "200+ fonts, plus QR codes and barcodes",
    "Rechargeable: battery included, USB-C",
    "Satin ribbon for gift wrapping sold separately",
  ];
  const giftFor = "Crafters, gift-wrappers, organisers, students and anyone who loves a neat label";
  const rf = await mediaByName(RIBBON_ID);
  const ribbonStory = {
    version: 2,
    shortName: "Satin ribbon",
    optionLabels: { Color: "Ribbon colour" },
    // Any colours, any quantity: the offer (shown 50% / 56% / 65% off) follows the total number of ribbons.
    multi: { option: "Color", noun: "ribbon", discounts: [50, 56, 65], codePrefix: "RIBBON" },
    how: {
      eyebrow: "How it works",
      title: "Pop in, print, tie on",
      accent: "print",
      intro: "A plug-and-play cartridge for your Phomemo P15 or A30. No fiddling, no fraying.",
      image: pick(rf, "S1c0991c100df45d99e0fe1281c5af994s.webp"),
      imageAlt: "The satin ribbon cartridge beside a Phomemo label maker and wrapped gifts",
      steps: [
        { title: "Drop in the cartridge", text: "Plug-and-play design. Swap cartridges in seconds, with smooth feeding and no jams." },
        { title: "Design in the app", text: "Open Print Master and edit your text, symbols and patterns." },
        { title: "Print", text: "Clear thermal-transfer lettering on soft satin that is slow to fade." },
        { title: "Cut and tie", text: "Edges are anti-fray and cut cleanly. Tie it onto gifts, bouquets and favours." },
      ],
    },
    details: {
      eyebrow: "Ideas",
      title: "Ribbon for every occasion",
      accent: "every occasion",
      occasions: ["Gift wrapping", "Wedding bouquets", "Holiday parties", "Flower packaging", "Handmade crafts", "Bakery gift tags", "Anniversary favours"],
      recipients: ["Gift-wrappers", "Wedding planners", "Florists", "Bakers", "Crafters"],
      holidays: ["Christmas", "Valentine's Day", "Mother's Day", "Weddings", "Birthdays"],
    },
    features: [
      {
        eyebrow: "Made for gifting",
        title: "Your words, on satin",
        text: "Print a name, a date or a message straight onto soft satin ribbon, then tie it round a present, a bouquet or a favour.",
        image: pick(rf, "S4a670df78a0f4f548a76f46495c63a7aZ.webp"),
        imageAlt: "A satin ribbon printed with the name Sophia coming out of a label maker",
      },
      {
        eyebrow: "Table settings",
        title: "Place cards that wow",
        text: "Print one ribbon per guest for napkins, glasses and wedding tables. Anti-fray edges and a clean cut.",
        image: pick(rf, "Sdb63aebf56db4b84956a815a444f5d8eD.webp"),
        imageAlt: "Printed gold satin ribbon bows tied on a candlelit dinner table",
      },
      {
        eyebrow: "Plug and play",
        title: "5 m of ribbon per cartridge",
        text: "Drop the cartridge into your Phomemo P15 or A30 and print. Includes 12 mm wide satin, 5 m long.",
        image: pick(rf, "S99a17ce34fb04ab8a220b7b560e40a88g.webp"),
        imageAlt: "A satin ribbon cartridge with the ribbon length and width marked",
      },
    ],
    info: [
      { label: "Compatibility", value: "Phomemo P15 and A30 thermal-transfer label makers (model A30)" },
      { label: "Material", value: "Soft satin fabric with anti-fray edges; clean cut with no burrs" },
      { label: "Size & length", value: "12 mm wide, 5 m per cartridge" },
      { label: "Printing", value: "Thermal-transfer print in gold or black ink on satin; clear, long-lasting text" },
      { label: "Ribbon", value: "Non-adhesive decorative ribbon (not a sticker). Third-party compatible, not original Phomemo" },
      { label: "Colours", value: "15 colour and ink combinations, including gold and black prints" },
    ],
  };
  const ribbonPerks = ["Fits the Phomemo P15 and A30", "12 mm satin, 5 m per cartridge", "15 colours, mix and match", "Anti-fray edges, clean cut"];
  const ribbonGiftFor = "Gift-wrappers, wedding planners, crafters and anyone who loves a personal finishing touch";

  if (!APPLY) {
    console.log(JSON.stringify({ story, perks, giftFor, ribbonStory }, null, 2));
    console.log("\nPreview only. Re-run with --apply to write this to Shopify.");
    return;
  }

  const set = await adminRequest<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
    {
      m: [
        { ownerId: PRINTER_ID, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(story) },
        { ownerId: PRINTER_ID, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(perks) },
        { ownerId: PRINTER_ID, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: giftFor },
        { ownerId: RIBBON_ID, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(ribbonStory) },
        { ownerId: RIBBON_ID, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(ribbonPerks) },
        { ownerId: RIBBON_ID, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: ribbonGiftFor },
      ],
    },
  );
  if (set.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(set.metafieldsSet.userErrors));

  for (const [id, tags] of [
    [PRINTER_ID, ["noel-edit", "category:cosy-home"]],
    [RIBBON_ID, ["noel-edit", "category:stocking-fillers"]],
  ] as const) {
    const r = await adminRequest<{ tagsAdd: { userErrors: { message: string }[] } }>(
      `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`,
      { id, tags: [...tags] },
    );
    if (r.tagsAdd.userErrors.length) throw new Error(JSON.stringify(r.tagsAdd.userErrors));
  }
  const rm = await adminRequest<{ tagsRemove: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { message } } }`,
    { id: RIBBON_ID, tags: ["noel-addon"] },
  );
  if (rm.tagsRemove.userErrors.length) throw new Error(JSON.stringify(rm.tagsRemove.userErrors));
  console.log("Done. Printer story + tags written; ribbon is now a normal product (handle: " + ribbonHandle + ").");
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error("x", m);
  process.exit(1);
});
