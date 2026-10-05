/**
 * Imports every Shopify product whose vendor is "TheNoelEdit" into the storefront:
 *
 *   npx tsx --env-file=.env scripts/import-vendor-products.ts            # preview only (writes nothing)
 *   npx tsx --env-file=.env scripts/import-vendor-products.ts --apply    # write to Shopify
 *
 * Products already tagged `noel-edit` are skipped (they were imported earlier).
 * For each new product, with --apply, it:
 *   - re-prices every variant:  price = round99( supplier price + 2.99 + 30 ),  compare-at = price x 2 (a 50% saving)
 *     (round99 = nearest whole dollar, minus 1 cent: 30 -> 29.99, 35 -> 34.99). Done once only: the tag
 *     `noel-priced` stops a re-run from adding the markup again.
 *   - writes custom.noel_story (short name, option labels, spec rows read from the supplier description,
 *     photo sections, "great for" chips), custom.perks, custom.gift_for and the offer deadline custom.sale_ends_at
 *   - tags it `noel-edit` + its category (`category:for-her` / `category:cosy-home`)
 *   - publishes it to the "TheNoelEdit Headless" sales channel
 * Idempotent apart from pricing (guarded). Pass --redo-content to rewrite the content of already imported
 * products from this file without touching prices.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const APPLY = process.argv.includes("--apply");
const HEADLESS_CHANNEL = "gid://shopify/Publication/225905705187";
const VENDOR = "TheNoelEdit";
/** Offer deadline: end of the day, this many days from now. */
const OFFER_DAYS = 4;

type Feature = { img: number; eyebrow: string; title: string; text: string };
type Cfg = {
  cat: "for-her" | "cosy-home";
  short: string;
  perks: string[];
  giftFor: string;
  /** Shopify option name -> label shoppers see. */
  labels?: Record<string, string>;
  /** Shopify option value -> label shoppers see. */
  values?: Record<string, string>;
  /** Spec labels to leave out (e.g. a length list when only one length is sold). */
  drop?: string[];
  /** Spec rows taken from the free-text part of the description. */
  extra?: { label: string; value: string }[];
  features: Feature[];
  occasions?: string[];
  recipients?: string[];
};

const OCCASIONS = ["Christmas", "Birthday", "Party", "Everyday wear", "Anniversary"];
const RECIPIENTS = ["Her", "Girlfriend or wife", "Mum", "Friends", "Daughter"];
const CARE = "Fashion jewellery: avoid sweat, bathing and sleeping in it, and keep it away from water and hard objects to keep the finish";

/** Keyed by the numeric Shopify product id. */
const CONFIG: Record<string, Cfg> = {
  "15407147778275": {
    cat: "for-her",
    short: "Pearl cross pendant necklace",
    perks: ["Imitation pearl beads with a silver-tone cross", "38 cm long", "Zinc alloy with an iron chain", "Gift-ready for Christmas"],
    giftFor: "Anyone who loves a bold pearl-and-cross look",
    extra: [
      { label: "Length", value: "38 cm" },
      { label: "Weight", value: "17 g" },
      { label: "Finish", value: "Silver-plated" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 4, eyebrow: "Worn", title: "A statement at the collar", text: "Imitation pearls with a detailed silver-tone cross, sitting at the collarbone." },
      { img: 2, eyebrow: "Gift it", title: "Ready for a jewellery box", text: "Arrives in an OPP bag, so pop it into a gift box or card for Christmas." },
      { img: 1, eyebrow: "Details", title: "Cross pendant, pearl beads", text: "Zinc alloy and an iron chain, 38 cm in total, with a lightweight 17 g feel." },
    ],
  },
  "15407147811043": {
    cat: "cosy-home",
    short: "LED vine branch lights",
    perks: ["Warm white glow (2700K)", "Remote control", "Waterproof (IP65), indoors or out", "Powered by USB or solar"],
    giftFor: "Anyone who loves a warm, glowing room: bedrooms, mantels, parties and porches",
    drop: ["Length"],
    extra: [
      { label: "Lights", value: "96 LEDs on a 1.8 m branch" },
      { label: "Colour", value: "Warm white, 2700K" },
      { label: "Package", value: "Vine branch light with USB cable and remote" },
    ],
    occasions: ["Christmas", "Bedroom decor", "Weddings", "Parties", "Porch and garden"],
    recipients: ["Home decorators", "Teens", "Hosts", "Friends", "Anyone who loves cosy lighting"],
    features: [
      { img: 1, eyebrow: "Warm glow", title: "A branch of soft light", text: "LED bulbs give an energy-efficient 2700K warm white that makes any wall or mantel feel cosy." },
      { img: 2, eyebrow: "Hang it anywhere", title: "Waterproof, indoors or out", text: "IP65 waterproofing means it can go on a porch or patio as well as a bedroom. A hook makes it easy to hang." },
      { img: 5, eyebrow: "Easy control", title: "Remote control and solar option", text: "Adjust the lights from the sofa with the remote. Runs on USB, or on solar for outdoor spots." },
    ],
  },
  "15407147843811": {
    cat: "cosy-home",
    short: "Smart LED curtain lights",
    perks: ["400 colour-changing RGB LEDs", "Controlled from your phone app", "1 m x 1 m curtain", "Waterproof (IP65)"],
    giftFor: "Anyone who wants a room, window or wall that lights up for Christmas",
    extra: [
      { label: "Size", value: "1 m x 1 m" },
      { label: "Lights", value: "400 LED beads, RGB colour changing" },
      { label: "Control", value: "Phone app (APP smart curtain light)" },
    ],
    occasions: ["Christmas", "Bedroom and living room decor", "Parties", "Windows and walls", "Outdoor displays"],
    recipients: ["Teens", "Gamers", "Families", "Decor lovers", "Hosts"],
    features: [
      { img: 1, eyebrow: "Christmas cheer", title: "Light up any room", text: "Hang the curtain on a wall or window for festive colour in any room." },
      { img: 2, eyebrow: "Make it yours", title: "DIY modes in the app", text: "Design your own text and patterns from the app, or pick a ready-made one." },
      { img: 4, eyebrow: "Scenes", title: "100+ dynamic scene modes", text: "Cycle through animated scenes and holiday patterns, all from your phone." },
    ],
  },
  "15407147876579": {
    cat: "for-her",
    short: "Y-shaped pendant necklace",
    perks: ["Y-shaped drop with a clear stone", "Adjustable 45 + 5 cm chain", "Gold or silver colour", "Light at about 2.3 g"],
    giftFor: "Her: a delicate everyday necklace for birthdays, anniversaries and Christmas",
    labels: { "Gem Color": "Colour" },
    values: { "silver color": "Silver", "gold color": "Gold" },
    extra: [
      { label: "Weight", value: "About 2.3 g" },
      { label: "Care", value: CARE },
    ],
    occasions: ["Christmas", "Birthday", "Bridal", "Mother's Day", "Anniversary", "Daily wear"],
    recipients: ["Girlfriend", "Wife", "Mother", "Friends", "Bride"],
    features: [
      { img: 0, eyebrow: "Everyday", title: "Delicate and easy to wear", text: "A slim chain with a Y-shaped drop that sits neatly at the neckline." },
      { img: 2, eyebrow: "Dress up or down", title: "From daywear to dinner", text: "Subtle enough for every day, with enough sparkle for a night out." },
      { img: 5, eyebrow: "Two colours", title: "Gold or silver colour", text: "Choose the finish that suits her jewellery: gold-plated brass or silver colour." },
    ],
  },
  "15407147909347": {
    cat: "for-her",
    short: "Cross pendant necklace",
    perks: ["Dainty cross with clear stones", "Adjustable 45 + 5 cm chain", "Gold or silver colour, 4 designs each", "Gift-ready"],
    giftFor: "Her: a meaningful cross necklace for Christmas, birthdays and special days",
    labels: { "Gem Color": "Style" },
    values: {
      "gold color1": "Gold 1", "gold color2": "Gold 2", "gold color3": "Gold 3", "gold color4": "Gold 4",
      "silver color1": "Silver 1", "silver color2": "Silver 2", "silver color3": "Silver 3", "silver color4": "Silver 4",
    },
    extra: [
      { label: "Weight", value: "About 2.3 to 4 g, depending on the style" },
      { label: "Stone size", value: "3.5 mm / 3 mm" },
      { label: "Care", value: CARE },
    ],
    occasions: ["Christmas", "Birthday", "Bridal", "Mother's Day", "Anniversary", "Daily wear"],
    recipients: ["Girlfriend", "Wife", "Mother", "Friends", "Bride"],
    features: [
      { img: 0, eyebrow: "Meaningful", title: "A dainty cross to keep", text: "A cross pendant set with small clear stones, in a gold-plated or silver finish." },
      { img: 4, eyebrow: "Worn", title: "Sits right at the collarbone", text: "A 45 cm chain with a 5 cm extender, so the length is yours to adjust." },
      { img: 1, eyebrow: "Eight styles", title: "Four designs in gold and silver", text: "Pick from four pendant designs, each in gold or silver colour." },
    ],
  },
  "15407147942115": {
    cat: "for-her",
    short: "Water drop pendant necklace",
    perks: ["Sparkling wing-shaped pendant with a water drop", "Four drop colours", "925 stamp, silver chain", "Gift-ready for Christmas"],
    giftFor: "Her: a sparkling statement necklace for parties, Christmas and birthdays",
    labels: { "Gem Color": "Drop colour" },
    values: { "green diamond": "Green", "Red Diamond": "Red", "Blue Diamond": "Blue", "White Diamond": "White" },
    extra: [{ label: "Care", value: CARE }],
    occasions: ["Christmas", "Party", "Birthday", "Anniversary", "Evening wear"],
    features: [
      { img: 2, eyebrow: "Worn", title: "A sparkle at the neckline", text: "A winged pendant with a teardrop that catches the light." },
      { img: 4, eyebrow: "Pick your colour", title: "Green, red, blue or white", text: "Choose the drop colour: green, red, blue or clear white." },
      { img: 9, eyebrow: "Details", title: "Fine chain, bold pendant", text: "A 925-stamped silver chain with an O-link design." },
    ],
  },
  "15407147974883": {
    cat: "for-her",
    short: "Flower jewellery set",
    perks: ["Sparkling flower design", "Choose the necklace, earrings or ring", "40 + 5 cm chain", "A Christmas, New Year or birthday gift"],
    giftFor: "Friends, girlfriends, mums and wives: a sparkling flower to open on Christmas morning",
    labels: { "Gem Color": "Piece" },
    values: { ring: "Ring", earring: "Earrings", necklace: "Necklace" },
    extra: [
      { label: "Pendant size", value: "10 x 20 mm" },
      { label: "Weight", value: "About 1.26 g" },
      { label: "Care", value: CARE },
    ],
    occasions: ["Christmas", "New Year", "Birthday", "Wedding"],
    recipients: ["Friends", "Girlfriend", "Mother", "Wife", "Classmates"],
    features: [
      { img: 0, eyebrow: "The set", title: "Necklace, earrings and ring", text: "A matching flower design across a pendant necklace, stud earrings and a ring." },
      { img: 2, eyebrow: "On the hand", title: "A sparkling flower ring", text: "A cluster of clear stones set in the shape of a flower." },
      { img: 3, eyebrow: "Studs", title: "Earrings with extra sparkle", text: "Matching flower studs catch the light from every angle." },
    ],
  },
  "15407148007651": {
    cat: "for-her",
    short: "Round stone pendant necklace",
    perks: ["Classic 4-prong round stone pendant", "925 stamp, silver chain", "About 3 g", "Gift-ready for Christmas"],
    giftFor: "Her: a simple, sparkling solitaire-style necklace",
    extra: [
      { label: "Weight", value: "About 3 g" },
      { label: "Care", value: CARE },
    ],
    occasions: ["Christmas", "Party", "Birthday", "Anniversary"],
    features: [
      { img: 3, eyebrow: "Worn", title: "Simple and sparkling", text: "A single round stone in a 4-prong setting on a fine chain." },
      { img: 1, eyebrow: "Details", title: "A pendant with a pavé bail", text: "The pendant hangs from a small stone-set bail." },
      { img: 2, eyebrow: "Everyday", title: "Light enough to wear daily", text: "At about 3 g it is comfortable all day." },
    ],
  },
  "15407148040419": {
    cat: "for-her",
    short: "Solitaire pendant necklace",
    perks: ["Round brilliant-style stone pendant", "Fine silver-colour chain", "Classic six-prong setting", "Gift-ready for Christmas"],
    giftFor: "Her: a classic sparkling pendant for weddings, parties and Christmas",
    extra: [{ label: "Care", value: CARE }],
    occasions: ["Christmas", "Wedding", "Party", "Anniversary"],
    features: [
      { img: 10, eyebrow: "Worn", title: "A classic that goes with everything", text: "A round stone on a fine chain, easy to wear every day or for a special evening." },
      { img: 1, eyebrow: "Sparkle", title: "Catches the light", text: "A round-cut stone set in prongs so it can sparkle from every angle." },
      { img: 4, eyebrow: "Gift it", title: "A Christmas present she will wear", text: "Simple, timeless and easy to wrap." },
    ],
  },
  "15407148073187": {
    cat: "for-her",
    short: "Pearl heart pendant necklace",
    perks: ["Faux pearl beads with a heart pendant", "Delicate chain, gold-tone finish", "Dress up or down", "Gift-ready"],
    giftFor: "Anyone who loves a dainty pearl look",
    extra: [{ label: "Care", value: CARE }],
    features: [
      { img: 0, eyebrow: "Worn", title: "A touch of charm", text: "Faux pearls and a heart pendant add a soft, feminine detail to any outfit." },
      { img: 2, eyebrow: "Details", title: "Heart pendant, beaded chain", text: "A gold-tone finish and a dainty chain for a stylish, light feel." },
      { img: 11, eyebrow: "Gift it", title: "Lovely in a jewellery box", text: "A sweet present for dinner dates, parties and everyday." },
    ],
  },
  "15407148105955": {
    cat: "for-her",
    short: "Pearl choker necklace",
    perks: ["Imitation pearl choker with a heart pendant", "About 38 cm", "Alloy and imitation pearl", "Arrives in an envelope bag"],
    giftFor: "Anyone who loves a classic pearl choker",
    extra: [
      { label: "Length", value: "About 38 cm in total" },
      { label: "Weight", value: "10 + 5 g" },
      { label: "Package", value: "1 necklace in an envelope bag" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 0, eyebrow: "Worn", title: "A pearl choker with a modern twist", text: "Uneven pearls and a heart clasp give a relaxed, trendy look." },
      { img: 2, eyebrow: "Details", title: "A heart pendant detail", text: "A small silver-tone heart finishes the choker." },
      { img: 3, eyebrow: "Gift it", title: "A sweet present", text: "Light, pretty and simple to give." },
    ],
  },
  "15407148138723": {
    cat: "for-her",
    short: "Chunky chain pearl necklace",
    perks: ["Chunky gold-colour chain with a large pearl", "Silver or gold colour", "Retro, punk-inspired style", "Weighs about 24 g"],
    giftFor: "Anyone who loves a bold, vintage-style chain",
    labels: { "Metal Color": "Colour" },
    values: { "Silver Color": "Silver", "Gold Color": "Gold" },
    extra: [
      { label: "Weight", value: "24 g" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 0, eyebrow: "Worn", title: "Bold at the collar", text: "A chunky chain with a large imitation pearl for a standout look." },
      { img: 3, eyebrow: "Details", title: "Short chain, big presence", text: "An aluminium link chain with inlaid pearls and an adjustable closure." },
      { img: 4, eyebrow: "Close up", title: "Texture and shine", text: "Gold-colour links with imitation pearls, or the silver-colour version." },
    ],
  },
  "15407148171491": {
    cat: "for-her",
    short: "Pearl bow choker set",
    perks: ["Grey faux pearl choker with a bow pendant", "Matching earrings available", "Vintage style", "Gift-ready"],
    giftFor: "Anyone who loves a pretty bow and pearls",
    labels: { "Metal Color": "Piece" },
    values: { necklace: "Necklace", "necklace 1": "Necklace 2", earrings: "Earrings" },
    extra: [
      { label: "Pendant size", value: "1 to 5 cm" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 0, eyebrow: "Worn", title: "A soft, grey pearl look", text: "Round faux pearls with a delicate bow pendant." },
      { img: 4, eyebrow: "Styled", title: "Pretty with a halter or tee", text: "A choker length that suits open necklines." },
      { img: 6, eyebrow: "The set", title: "Add the earrings", text: "Pearl-and-bow earrings are available to match." },
    ],
  },
  "15407148204259": {
    cat: "for-her",
    short: "Heart pendant clavicle necklace",
    perks: ["Heart pendant with sparkling stones", "Stainless steel chain, lobster clasp", "33 styles to choose from", "45 cm chain"],
    giftFor: "Anyone who loves a sparkly heart necklace",
    labels: { "Metal Color": "Style" },
    extra: [
      { label: "Length", value: "45 cm" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 1, eyebrow: "Gift idea", title: "Lovely in a gift box", text: "Photographed in a gift box. A box is not included, so pop it into your own to give." },
      { img: 3, eyebrow: "Worn", title: "A heart at the collarbone", text: "A sparkling heart pendant on a slim chain." },
      { img: 2, eyebrow: "Details", title: "Gold-colour heart with stones", text: "A snake chain with a lobster claw clasp, in stainless steel." },
    ],
  },
  "15407148269795": {
    cat: "for-her",
    short: "Freshwater pearl necklace",
    perks: ["Freshwater pearls", "Stainless steel, PVD gold plated", "Lobster claw clasp", "Choose from several styles"],
    giftFor: "Anyone who loves a minimalist pearl necklace",
    labels: { "Metal Color": "Style" },
    extra: [{ label: "Care", value: CARE }],
    features: [
      { img: 1, eyebrow: "Layer it", title: "Pearls on a thin chain", text: "Freshwater pearls on a minimalist chain, lovely worn alone or layered." },
      { img: 2, eyebrow: "Details", title: "PVD gold-plated stainless steel", text: "A PVD gold-plated finish on stainless steel, with a lobster claw clasp." },
      { img: 6, eyebrow: "Worn", title: "Everyday elegance", text: "A fine chain that sits softly at the neckline." },
    ],
  },
  "15407148302563": {
    cat: "for-her",
    short: "Pearl beaded necklace",
    perks: ["Round faux pearl beads", "Zircon set round buckle clasp", "Necklace or bracelet", "White or grey pearls"],
    giftFor: "Anyone who loves a classic pearl necklace",
    labels: { "Metal Color": "Style" },
    extra: [
      { label: "Pendant size", value: "1.4 cm" },
      { label: "Care", value: CARE },
    ],
    features: [
      { img: 1, eyebrow: "Worn", title: "Classic pearls, modern clasp", text: "A strand of round faux pearls with a round zircon-set buckle." },
      { img: 4, eyebrow: "Gift idea", title: "Lovely in a case", text: "Photographed in a case. A case is not included, so use your own when you give it." },
      { img: 3, eyebrow: "Details", title: "White or grey", text: "Choose white or grey pearls, as a necklace or bracelet." },
    ],
  },
  "15407148335331": {
    cat: "for-her",
    short: "Gold cuff bracelet",
    perks: ["Open cuff, one size fits most", "Gold-colour stainless steel", "Textured bump pattern", "Many styles to choose from"],
    giftFor: "Anyone who loves a bold gold cuff",
    labels: { "Metal Color": "Style" },
    extra: [{ label: "Care", value: CARE }],
    features: [
      { img: 2, eyebrow: "Worn", title: "A statement cuff", text: "A wide gold-colour cuff with a hammered, textured finish." },
      { img: 3, eyebrow: "Details", title: "Bump pattern, open back", text: "An open cuff that slips on and adjusts to the wrist." },
      { img: 9, eyebrow: "Also in", title: "Gold and silver colour", text: "Several styles are available, in gold and silver colour." },
    ],
  },
  "15407148368099": {
    cat: "for-her",
    short: "Sun adjustable ring",
    perks: ["Sun design with an imitation moonstone centre", "Adjustable size", "Brass with cubic zirconia", "About 2.7 g"],
    giftFor: "Anyone who loves a sunny, delicate ring",
    labels: { "Main Stone Color": "Style" },
    extra: [
      { label: "Size", value: "Adjustable" },
      { label: "Weight", value: "About 2.7 g" },
      { label: "Package", value: "1 ring in an OPP bag" },
      { label: "Care", value: "Fashion jewellery, not pure gold or silver. Stop wearing if you notice a reaction. Take it off for bathing and washing, and keep it away from sweat" },
    ],
    features: [
      { img: 3, eyebrow: "Details", title: "A little sun on your finger", text: "A sun motif with a soft imitation-moonstone centre and a small zircon." },
      { img: 8, eyebrow: "Gift it", title: "Lovely in a ring box", text: "Easy to wrap for birthdays and Christmas." },
      { img: 6, eyebrow: "Adjustable", title: "One size fits most", text: "An open band that adjusts to your finger." },
    ],
  },
  "15407148400867": {
    cat: "for-her",
    short: "Crystal drop necklace and earrings set",
    perks: ["Necklace and earrings set", "Cubic zirconia in pink, yellow and green", "Copper base", "A dressy gift for parties and weddings"],
    giftFor: "Her: a colourful statement set for parties, weddings and evening wear",
    extra: [{ label: "Care", value: CARE }],
    occasions: ["Christmas", "Wedding", "Party", "Evening wear", "Anniversary"],
    features: [
      { img: 1, eyebrow: "Worn", title: "Colour at the neckline", text: "A necklace of pink, yellow and green drops, with matching earrings." },
      { img: 2, eyebrow: "The set", title: "Necklace and earrings together", text: "Both pieces in one set, ready to wear and ready to give." },
      { img: 4, eyebrow: "Earrings", title: "Drop earrings with a flower detail", text: "Cubic zirconia drops that catch the light." },
    ],
  },
};

/* ── helpers ──────────────────────────────────────────────────────────── */

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Nearest whole dollar, minus a cent: 35.4 -> 34.99, 30.0 -> 29.99. */
const round99 = (n: number) => round2(Math.max(1, Math.round(n)) - 0.01);
const newPrice = (supplier: number) => round99(supplier + 2.99 + 30);

const text = (html: string) =>
  html
    .replace(/<img[^>]*>/g, " ")
    .replace(/<\/(p|li|h\d|div|tr|br)>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ");

/** Supplier spec key -> the label shoppers see (anything not listed is dropped: brand, model, certificates, supplier codes). */
const KEEP: Record<string, string> = {
  Material: "Material",
  "Metals Type": "Metal",
  "Setting Material": "Setting",
  "Main Stone": "Main stone",
  Stone: "Stone",
  "Side Stone": "Side stone",
  "Chain Type": "Chain",
  "Clasp Type": "Clasp",
  "Chain Length": "Length",
  Length: "Length",
  "Pendant Size": "Pendant size",
  "Item Weight": "Weight",
  "Shape\\pattern": "Shape",
  Style: "Style",
  Occasion: "Occasion",
  "Pearl Type": "Pearl type",
  "Pearl Shape": "Pearl shape",
  Plating: "Plating",
  Electroplate: "Plating",
  "Necklace Type": "Type",
  "Bracelets Type": "Type",
  "Rings Type": "Type",
  "Jewelry Sets Type": "Set",
  "Metal Stamp": "Metal stamp",
  "Inlay material": "Inlay",
  "Setting Type": "Setting",
  Gender: "Suitable for",
  Application: "Use",
  "Color Temperature(CCT)": "Colour temperature",
  "Control Method": "Control",
  Feature: "Features",
  "IP Rating": "Waterproof rating",
  "Input Voltage(V)": "Voltage",
  "Lamp Luminous Flux(lm)": "Brightness (lumens)",
  "Lifespan (Hours)": "Lifespan (hours)",
  "Light Source": "Light source",
  "Power Source": "Power",
  "Warranty(Year)": "Warranty (years)",
  "Lamp color": "Light colour",
  "Number of lamp beads": "LED beads",
  "Product power": "Power",
  "Product specification": "Size",
  "Waterproof grade": "Waterproof rating",
  Foldable: "Foldable",
};
const EMPTY = /^(none|null|n\/a|no|-+|as pic(ture)?s?|please refer.*|g|mm|0)$/i;

function specRows(html: string, drop: string[] = []): { label: string; value: string }[] {
  const dropped = new Set(drop);
  const rows: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const line of text(html).split("\n")) {
    const m = line.match(/^\s*([A-Za-z][^:：]{1,40}?)\s*[:：]\s*(.+?)\s*$/);
    if (!m) continue;
    const label = KEEP[m[1]!.trim()];
    if (!label || dropped.has(label)) continue;
    let value = m[2]!
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    value = [...new Set(value)];
    let v = value.join(", ").replace(/\bColor\b/g, "Colour").replace(/\bcolor\b/g, "colour");
    if (!v || EMPTY.test(v)) continue;
    if (label === "Weight" && !/\d/.test(v)) continue;
    if (label === "Type") v = v.replace(/ Necklaces$/i, "").replace(/s$/i, "");
    const key = `${label}:${v}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, value: v });
  }
  return rows;
}

type Product = {
  id: string;
  handle: string;
  title: string;
  tags: string[];
  descriptionHtml: string;
  options: { name: string; values: string[] }[];
  variants: { nodes: { id: string; title: string; price: string; compareAtPrice: string | null }[] };
  media: { nodes: { image?: { url: string } }[] };
};

async function fetchProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let after: string | null = null;
  for (;;) {
    const d: any = await adminRequest(
      `query($after:String){ products(first:50, after:$after, query:"vendor:${VENDOR}"){ pageInfo{hasNextPage endCursor} nodes{ id handle title tags descriptionHtml
        options{name values} variants(first:100){ nodes{ id title price compareAtPrice } }
        media(first:60){ nodes{ ... on MediaImage{ image{url} } } } } } }`,
      { after },
    );
    out.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  return out;
}

function build(p: Product, cfg: Cfg) {
  const images = p.media.nodes.map((m) => m.image?.url?.split("?")[0]).filter((u): u is string => Boolean(u));
  const features = cfg.features
    .map((f) => ({ eyebrow: f.eyebrow, title: f.title, text: f.text, image: images[f.img] ?? "", imageAlt: f.title }))
    .filter((f) => f.image);
  // A hand-written row replaces the auto-read row with the same label (e.g. a cleaner "Weight").
  const own = new Set((cfg.extra ?? []).map((r) => r.label));
  const info = [...specRows(p.descriptionHtml, cfg.drop).filter((r) => !own.has(r.label)), ...(cfg.extra ?? [])].slice(0, 24);
  const story = {
    version: 2,
    shortName: cfg.short,
    ...(cfg.labels ? { optionLabels: cfg.labels } : {}),
    ...(cfg.values ? { valueLabels: cfg.values } : {}),
    videos: [],
    features,
    info,
    details: {
      eyebrow: "At a glance",
      title: "Made to be gifted",
      accent: "gifted",
      occasions: cfg.occasions ?? OCCASIONS,
      recipients: cfg.recipients ?? RECIPIENTS,
      holidays: ["Christmas", "New Year's Day", "Valentine's Day", "Mother's Day"],
    },
  };
  return { story, info, features };
}

async function main() {
  const all = await fetchProducts();
  const redo = process.argv.includes("--redo-content");
  const d = new Date(Date.now() + OFFER_DAYS * 86400_000);
  d.setUTCHours(23, 59, 0, 0);
  const offerEnds = d.toISOString().replace(/\.\d+Z$/, "Z");

  const todo = all.filter((p) => redo || !p.tags.includes("noel-edit"));
  const skipped = all.length - todo.length;
  console.log(`${all.length} products with vendor ${VENDOR}; ${skipped} already imported (skipped); ${todo.length} to do. Offer ends ${offerEnds}\n`);

  for (const p of todo) {
    const numeric = p.id.split("/").pop()!;
    const cfg = CONFIG[numeric];
    if (!cfg) {
      console.log(`!! no content written yet for ${numeric} (${p.title.slice(0, 50)}) - skipped`);
      continue;
    }
    const { story, info, features } = build(p, cfg);
    const priced = p.tags.includes("noel-priced");
    const updates = p.variants.nodes.map((v) => {
      const price = newPrice(Number(v.price));
      return { id: v.id, title: v.title, from: Number(v.price), price, compareAtPrice: round2(price * 2) };
    });
    const lo = Math.min(...updates.map((u) => u.price));
    const hi = Math.max(...updates.map((u) => u.price));
    console.log(
      `${numeric}  ${cfg.cat.padEnd(9)} ${priced ? "(already priced)" : `$${Math.min(...updates.map((u) => u.from))}->$${lo}${hi !== lo ? "-" + hi : ""} (was $2x compare ${round2(lo * 2)})`}  specs:${info.length} features:${features.length}  "${cfg.short}"`,
    );
    if (!APPLY) continue;

    // 1. prices (once)
    if (!priced) {
      const r: any = await adminRequest(
        `mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$id, variants:$v){ userErrors{ field message } } }`,
        { id: p.id, v: updates.map((u) => ({ id: u.id, price: u.price.toFixed(2), compareAtPrice: u.compareAtPrice.toFixed(2) })) },
        { retries: 1 },
      );
      if (r.productVariantsBulkUpdate.userErrors.length) throw new Error(`${numeric} prices: ${JSON.stringify(r.productVariantsBulkUpdate.userErrors)}`);
    }

    // 2. metafields
    const mf: any = await adminRequest(
      `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`,
      {
        m: [
          { ownerId: p.id, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(story) },
          { ownerId: p.id, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(cfg.perks) },
          { ownerId: p.id, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: cfg.giftFor },
          { ownerId: p.id, namespace: "custom", key: "sale_ends_at", type: "date_time", value: offerEnds },
        ],
      },
      { retries: 1 },
    );
    if (mf.metafieldsSet.userErrors.length) throw new Error(`${numeric} metafields: ${JSON.stringify(mf.metafieldsSet.userErrors)}`);

    // 3. tags
    const tags = ["noel-edit", `category:${cfg.cat}`, ...(priced ? [] : ["noel-priced"])];
    const t: any = await adminRequest(`mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id,tags:$t){ userErrors{ message } } }`, { id: p.id, t: tags }, { retries: 1 });
    if (t.tagsAdd.userErrors.length) throw new Error(`${numeric} tags: ${JSON.stringify(t.tagsAdd.userErrors)}`);

    // 4. sales channel
    const pub: any = await adminRequest(
      `mutation($id:ID!,$in:[PublicationInput!]!){ publishablePublish(id:$id,input:$in){ userErrors{ message } } }`,
      { id: p.id, in: [{ publicationId: HEADLESS_CHANNEL }] },
      { retries: 1 },
    );
    if (pub.publishablePublish.userErrors.length) throw new Error(`${numeric} publish: ${JSON.stringify(pub.publishablePublish.userErrors)}`);
    console.log("   written.");
  }
  if (!APPLY) console.log("\nPreview only. Re-run with --apply to write this to Shopify.");
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
