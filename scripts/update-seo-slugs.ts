/**
 * Sets the search-result title (SEO title), meta description and a short URL
 * handle (slug) on every storefront product, in Shopify.
 *
 *   npx tsx --env-file=.env scripts/update-seo-slugs.ts            # preview only
 *   npx tsx --env-file=.env scripts/update-seo-slugs.ts --apply    # write to Shopify
 *
 * The old long URLs are NOT redirected (redirectNewHandle: false), as requested, so any
 * link to an old handle stops working. Products with no `handle` below keep the handle
 * they already have (shortened by hand in Shopify). Run `npm run shopify:sync` afterwards.
 */
import { adminRequest } from "../src/lib/shopify/admin";

const APPLY = process.argv.includes("--apply");
const BRAND = "The Noel Edit";
const SHIP = "Free shipping on every order.";

/** Keyed by numeric Shopify product id. `handle` omitted = keep the current one. */
const SEO: Record<string, { handle?: string; title: string; desc: string }> = {
  "15405838401763": {
    handle: "latte-art-camera-coffee-stencil-printer",
    title: "Latte Art Camera & Stencil Printer",
    desc: `Print designs onto your coffee foam in one press. Choose 1, 2 or 3 cameras and 4 or 12 stencils. A gift for coffee lovers. ${SHIP}`,
  },
  "15406027964643": {
    title: "Satin Ribbon for Phomemo P15 & A30",
    desc: `Printable 12 mm satin ribbon cartridges for the Phomemo P15 and A30, 5 m each, in 15 colours. Mix and match any amount. ${SHIP}`,
  },
  "15406039531747": {
    title: "Phomemo P15 Bluetooth Label Maker",
    desc: `Print names, gift labels and jar labels from your phone with the rechargeable Phomemo P15. Ribbon sold separately. ${SHIP}`,
  },
  "15406270939363": {
    title: "NFC Music Box Fridge Magnet, Christmas Gift",
    desc: `A mini record player for the fridge: tap a disc to play 9 Christmas songs, with a soft night-light glow. A kitchen gift. ${SHIP}`,
  },
  "15406274805987": {
    title: "Highland Cow Advent Calendar 2026, 24 Doors",
    desc: `24 doors, 24 Highland cow figures: a Christmas countdown that doubles as desk decor. Foldable, about 26 x 18 cm. ${SHIP}`,
  },
  "15407147778275": {
    handle: "pearl-cross-pendant-necklace",
    title: "Pearl Cross Pendant Necklace",
    desc: `Imitation-pearl necklace with a silver-tone cross, 38 cm, zinc alloy with an iron chain. A bold Christmas gift for her. ${SHIP}`,
  },
  "15407147811043": {
    handle: "led-vine-branch-string-lights",
    title: "LED Vine Branch Lights, USB & Solar",
    desc: `Warm white 96-LED vine branch lights with a remote. IP65 waterproof, powered by USB or solar. Cosy Christmas decor. ${SHIP}`,
  },
  "15407147843811": {
    handle: "smart-led-curtain-lights",
    title: "Smart LED Curtain Lights, App Controlled",
    desc: `400 colour-changing LED curtain lights, 1 x 1 m, controlled from your phone. IP65 waterproof. Christmas room decor. ${SHIP}`,
  },
  "15407147876579": {
    handle: "y-shaped-pendant-necklace",
    title: "Y-Shaped Pendant Necklace in Gold or Silver",
    desc: `Delicate Y-shaped drop necklace with a clear stone and a 45 + 5 cm adjustable chain, in gold-plated brass or silver colour. ${SHIP}`,
  },
  "15407147909347": {
    handle: "cross-pendant-necklace",
    title: "Dainty Cross Pendant Necklace, 8 Styles",
    desc: `Cross pendant with small clear stones on a 45 + 5 cm chain, in four designs, gold or silver colour. A gift for her. ${SHIP}`,
  },
  "15407147942115": {
    handle: "water-drop-pendant-necklace",
    title: "Water Drop Pendant Necklace, 4 Colours",
    desc: `Sparkling winged pendant with a teardrop in green, red, blue or white, on a 925-stamped silver chain. A party gift. ${SHIP}`,
  },
  "15407147974883": {
    handle: "flower-pendant-jewellery-set",
    title: "Flower Pendant Necklace, Earrings & Ring",
    desc: `A sparkling flower design as a pendant necklace, stud earrings or a ring. 40 + 5 cm chain. A Christmas gift for her. ${SHIP}`,
  },
  "15407148007651": {
    handle: "round-stone-pendant-necklace",
    title: "Round Stone Pendant Necklace, 4-Prong",
    desc: `A simple round stone pendant in a 4-prong setting on a fine chain, about 3 g, 925 stamped. A sparkling everyday gift. ${SHIP}`,
  },
  "15407148040419": {
    handle: "solitaire-pendant-necklace",
    title: "Solitaire Pendant Necklace",
    desc: `A classic round stone pendant on a fine silver-colour chain. Easy to wear every day or for a special evening. ${SHIP}`,
  },
  "15407148073187": {
    handle: "pearl-heart-pendant-necklace",
    title: "Pearl Heart Pendant Necklace",
    desc: `Faux pearl beads with a heart pendant on a delicate chain, gold-tone finish. A dainty gift to dress up or down. ${SHIP}`,
  },
  "15407148105955": {
    handle: "pearl-choker-necklace",
    title: "Pearl Choker Necklace with Heart Pendant",
    desc: `Imitation-pearl choker with a heart detail, about 38 cm, alloy and imitation pearl, in an envelope bag. A sweet gift for her. ${SHIP}`,
  },
  "15407148138723": {
    handle: "chunky-chain-pearl-necklace",
    title: "Chunky Chain Pearl Necklace, Gold or Silver",
    desc: `A chunky link chain with a large imitation pearl, in gold or silver colour. Bold and retro-inspired, about 24 g. ${SHIP}`,
  },
  "15407148171491": {
    handle: "pearl-bow-choker-necklace",
    title: "Pearl Bow Choker Necklace & Earrings",
    desc: `Grey faux-pearl choker with a delicate bow pendant, with matching earrings available. A pretty vintage-style gift. ${SHIP}`,
  },
  "15407148204259": {
    handle: "heart-pendant-clavicle-necklace",
    title: "Heart Pendant Clavicle Necklace, 33 Styles",
    desc: `Sparkling heart pendant on a stainless steel chain with a lobster clasp, 45 cm. Choose from 33 styles. ${SHIP}`,
  },
  "15407148269795": {
    handle: "freshwater-pearl-necklace",
    title: "Freshwater Pearl Necklace, Gold Plated",
    desc: `Minimalist freshwater pearl necklace on a thin PVD gold-plated stainless steel chain. Wear it alone or layered. ${SHIP}`,
  },
  "15407148302563": {
    handle: "pearl-beaded-necklace",
    title: "Pearl Beaded Necklace with Round Clasp",
    desc: `Round faux-pearl beads with a zircon-set buckle clasp, in white or grey, as a necklace or a bracelet. A classic gift. ${SHIP}`,
  },
  "15407148335331": {
    handle: "gold-cuff-bracelet",
    title: "Gold Cuff Bracelet, Textured Open Bangle",
    desc: `Wide open cuff bracelet in gold-colour stainless steel with a textured bump pattern. Adjusts to the wrist. ${SHIP}`,
  },
  "15407148368099": {
    handle: "sun-adjustable-ring",
    title: "Sun Adjustable Ring, Gold or Silver",
    desc: `An adjustable sun ring with an imitation moonstone centre, brass and cubic zirconia, about 2.7 g. A sweet gift for her. ${SHIP}`,
  },
  "15407148400867": {
    handle: "crystal-drop-necklace-earrings-set",
    title: "Crystal Drop Necklace & Earrings Set",
    desc: `Necklace and earrings set with pink, yellow and green cubic zirconia drops on a copper base. A dressy gift for parties. ${SHIP}`,
  },
};

async function main() {
  const all: any[] = [];
  let after: string | null = null;
  for (;;) {
    const d: any = await adminRequest(
      `query($a:String){ products(first:50, after:$a, query:"vendor:TheNoelEdit"){ pageInfo{hasNextPage endCursor} nodes{ id handle title } } }`,
      { a: after },
    );
    all.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }

  const seen = new Set<string>(all.map((p) => p.handle));
  let todo = 0;
  const problems: string[] = [];
  for (const p of all) {
    const id = p.id.split("/").pop()!;
    const cfg = SEO[id];
    if (!cfg) {
      console.log(`!! ${id} has no entry: ${p.title.slice(0, 50)}`);
      continue;
    }
    const fullTitle = `${cfg.title} | ${BRAND}`;
    if (fullTitle.length > 60) problems.push(`${id}: SEO title ${fullTitle.length} chars (max 60)`);
    if (cfg.desc.length > 155) problems.push(`${id}: meta description ${cfg.desc.length} chars (max 155)`);
    const handle = cfg.handle ?? p.handle;
    if (handle !== p.handle && seen.has(handle)) throw new Error(`Handle already used: ${handle}`);
    seen.add(handle);
    console.log(`${id}  ${String(fullTitle.length).padStart(2)}c/${String(cfg.desc.length).padStart(3)}c  ${p.handle.length > 40 ? p.handle.slice(0, 22) + "…" : p.handle}  ->  ${handle}`);
    todo++;
    if (!APPLY || problems.length) continue;
    const r: any = await adminRequest(
      `mutation($input:ProductInput!){ productUpdate(input:$input){ product{ handle } userErrors{ field message } } }`,
      { input: { id: p.id, handle, redirectNewHandle: false, seo: { title: fullTitle, description: cfg.desc } } },
      { retries: 1 },
    );
    if (r.productUpdate.userErrors.length) throw new Error(`${id}: ${JSON.stringify(r.productUpdate.userErrors)}`);
  }
  if (problems.length) throw new Error(`Some entries were not written (too long):\n  ${problems.join("\n  ")}`);
  console.log(`\n${todo} products ${APPLY ? "updated" : "would be updated"}.${APPLY ? "" : " Re-run with --apply to write this to Shopify."}`);
}

main().catch((e) => {
  console.error("x", e instanceof Error ? e.message : e);
  process.exit(1);
});
