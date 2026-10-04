/**
 * Writes data/demo-catalog.json with placeholder products so the storefront renders
 * before the first Shopify sync. `npm run shopify:sync` replaces it.
 *
 *   node scripts/make-demo-catalog.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";

const img = (id, alt) => ({
  type: "image",
  url: `https://images.unsplash.com/photo-${id}?fit=crop&crop=entropy&ar=1:1`,
  width: 1200,
  height: 1200,
  alt,
  variantId: null,
});

const life = {
  gifts: "1608755728617-aefab37d2edd",
  tree: "1543258103-a62bdc069871",
  flatlay: "1512389142860-9c449e58a543",
  bows: "1607344645866-009c320b63e0",
  kraft: "1512909006721-3d6018887383",
  red: "1513885535751-8b9238bd345a",
  bokeh: "1512474932049-78ac69ede12c",
  fire: "1482517967863-00e15c9b44be",
  pink: "1549465220-1a8b9238cd48",
};

let seq = 1000;
const gid = (t) => `gid://shopify/${t}/${++seq}`;

function product({ handle, title, type, options = [], variants, media, perks, giftFor, desc, tags = [] }) {
  const vs = variants.map(([values, price, compareAt, available = true]) => ({
    id: gid("ProductVariant"),
    title: values.length ? values.join(" / ") : "Default Title",
    sku: null,
    price,
    compareAtPrice: compareAt > price ? compareAt : null,
    availableForSale: available,
    options: options.length
      ? Object.fromEntries(options.map(([name], i) => [name, values[i]]))
      : { Title: "Default Title" },
    image: null,
  }));
  const created = new Date(Date.UTC(2026, 9, 1 + (seq % 28))).toISOString();
  return {
    id: gid("Product"),
    handle,
    title,
    vendor: "The Noel Edit",
    productType: type,
    tags: ["noel-edit", ...tags],
    status: "ACTIVE",
    createdAt: created,
    updatedAt: created,
    descriptionHtml: desc,
    seo: { title: null, description: null },
    options: options.length
      ? options.map(([name, values]) => ({ name, values }))
      : [{ name: "Title", values: ["Default Title"] }],
    availableForSale: vs.some((v) => v.availableForSale),
    variants: vs,
    media,
    perks,
    offerEndsAt: null,
    giftFor,
  };
}

const products = [
  product({
    handle: "pearl-drop-necklace", title: "Pearl Drop Necklace", type: "Jewelry", tags: ["bestseller"],
    options: [["Finish", ["Silver", "Gold"]]],
    variants: [[["Silver"], 89, 129], [["Gold"], 99, 139]],
    media: [img("1515562141207-7a88fb7ce338", "Freshwater pearl necklace in an open gift box"), img(life.bows, "Gold ribbon bows on black gift wrap"), img(life.flatlay, "Winter greenery flat lay")],
    perks: ["Freshwater pearls on a fine chain", "Arrives in a velvet keepsake box", "Adjustable 16–18 in length", "Hypoallergenic clasp"],
    giftFor: "Mums, partners, bridesmaids and anyone who loves a classic",
    desc: "<p>A single freshwater pearl on a whisper-fine chain — the kind of piece she will wear every day long after the tree comes down.</p><ul><li>Freshwater pearl, 8–9 mm</li><li>Sterling silver or 18k gold vermeil</li><li>Presented in a velvet keepsake box</li></ul>",
  }),
  product({
    handle: "botanical-glow-serum", title: "Botanical Glow Serum", type: "Skincare", tags: ["bestseller"],
    options: [["Pack", ["1 Pack", "2 Pack", "3 Pack"]]],
    variants: [[["1 Pack"], 34, 48], [["2 Pack"], 59, 96], [["3 Pack"], 79, 144]],
    media: [img("1608571423902-eed4a5ad8108", "Amber glass serum bottle on a wooden stand"), img(life.pink, "Gift box tied with gold ribbon"), img(life.bokeh, "Christmas tree baubles")],
    perks: ["Lightweight daily face oil", "Glass dropper bottle, 30 ml", "Gift-ready box with ribbon", "Fragrance-free formula"],
    giftFor: "Skincare lovers and self-care Sundays",
    desc: "<p>A silky botanical oil that sinks in fast and leaves skin looking rested — the self-care gift that feels like a spa weekend in a bottle.</p><p>Buy two or three and tick off the whole list.</p>",
  }),
  product({
    handle: "winter-wrap-scarf", title: "Winter Wrap Scarf", type: "Accessories for her", tags: ["category:for-her"],
    options: [["Colour", ["Oat", "Pine", "Berry"]]],
    variants: [[["Oat"], 39, 65], [["Pine"], 39, 65], [["Berry"], 39, 65, false]],
    media: [img("1520903920243-00d872a2d1c9", "Woman in a checked wool scarf holding a latte"), img(life.tree, "Decorated tree in warm light")],
    perks: ["Brushed, cashmere-soft weave", "Oversized 200 × 70 cm", "Fringed edges", "Folded in tissue with a ribbon"],
    giftFor: "Anyone who is always cold",
    desc: "<p>An oversized, brushed-soft wrap that doubles as a blanket on the walk home from carols.</p>",
  }),
  product({
    handle: "minimal-steel-watch", title: "Minimal Steel Watch", type: "Watches", tags: ["bestseller"],
    options: [["Strap", ["White", "Black"]]],
    variants: [[["White"], 119, 179], [["Black"], 119, 179]],
    media: [img("1523275335684-37898b6baf30", "Minimal watch with white strap"), img(life.gifts, "Wrapped gifts in low light")],
    perks: ["Sapphire-coated glass", "5 ATM water resistance", "Quick-release strap", "2-year warranty"],
    giftFor: "Dads, partners and the man who says he wants nothing",
    desc: "<p>A clean, quiet dial for everyday wear. Swap the strap in seconds — no tools needed.</p>",
  }),
  product({
    handle: "studio-wireless-headphones", title: "Studio Wireless Headphones", type: "Tech",
    variants: [[[], 149, 229]],
    media: [img("1505740420928-5e560c06d30e", "Black wireless headphones on a yellow background"), img(life.red, "Red gift box with white twine")],
    perks: ["Active noise cancelling", "40-hour battery", "Fold-flat travel case", "USB-C fast charge"],
    giftFor: "Commuters, gamers and music lovers",
    desc: "<p>Rich, room-filling sound with noise cancelling that quiets the busiest Boxing Day sale.</p>",
  }),
  product({
    handle: "classic-sunglasses", title: "Classic Sunglasses", type: "Accessories for him",
    variants: [[[], 59, 95]],
    media: [img("1572635196237-14b3f281503f", "Black classic sunglasses"), img(life.kraft, "Kraft paper gift held out")],
    perks: ["Polarised UV400 lenses", "Acetate frame", "Hard case included"],
    giftFor: "Ski trips and winter sun",
    desc: "<p>The shape that never dates — polarised for the low winter sun.</p>",
  }),
  product({
    handle: "cuddle-bear-plush", title: "Cuddle Bear Plush", type: "Toys", tags: ["bestseller"],
    options: [["Size", ["Small", "Large"]]],
    variants: [[["Small"], 24, 35], [["Large"], 39, 55]],
    media: [img("1559454403-b8fb88521f11", "Cream teddy bear beside a knitted blanket"), img(life.tree, "Christmas tree")],
    perks: ["Super-soft recycled plush", "Safety-tested for 0+", "Machine washable"],
    giftFor: "Babies, toddlers and big kids at heart",
    desc: "<p>A huggable bear made for first Christmases and every night after.</p>",
  }),
  product({
    handle: "wind-up-robot", title: "Retro Wind-Up Robot", type: "Toys",
    variants: [[[], 19, 29]],
    media: [img("1563396983906-b3795482a59a", "Green retro tin wind-up robot"), img(life.bokeh, "Bauble bokeh")],
    perks: ["Tin-plate classic", "Walks and swings its arms", "No batteries needed"],
    giftFor: "Collectors and curious kids (8+)",
    desc: "<p>Wind it up and watch it march across the table — a nostalgic stocking star.</p>",
  }),
  product({
    handle: "builder-bricks-set", title: "Builder Bricks Set", type: "Toys",
    variants: [[[], 45, 69]],
    media: [img("1587654780291-39c9404d746b", "Colourful building bricks"), img(life.gifts, "Wrapped gifts")],
    perks: ["600 mixed bricks", "Compatible with major brands", "Storage tub with lid"],
    giftFor: "Little builders aged 4+",
    desc: "<p>Six hundred bricks and zero instructions — just imagination, all the way to New Year.</p>",
  }),
  product({
    handle: "velvet-fir-candle", title: "Velvet Fir Candle", type: "Candles", tags: ["bestseller"],
    options: [["Pack", ["1 Pack", "2 Pack", "3 Pack"]]],
    variants: [[["1 Pack"], 28, 38], [["2 Pack"], 49, 76], [["3 Pack"], 69, 114]],
    media: [img("1603006905003-be475563bc59", "Lit candle in glass beside fairy lights"), img(life.fire, "Stockings by a fireplace"), img(life.tree, "Christmas tree")],
    perks: ["Fir needle, clove & cedar", "45-hour soy wax burn", "Cotton wick", "Reusable glass vessel"],
    giftFor: "Hosts, neighbours and new homeowners",
    desc: "<p>The smell of a freshly cut tree, bottled. Light it once and the whole room feels like Christmas Eve.</p>",
  }),
  product({
    handle: "fireside-ceramic-mug", title: "Fireside Ceramic Mug", type: "Homeware",
    options: [["Pack", ["1 Pack", "2 Pack", "4 Pack"]]],
    variants: [[["1 Pack"], 22, 30], [["2 Pack"], 39, 60], [["4 Pack"], 72, 120]],
    media: [img("1514228742587-6b1558fcca3d", "White ceramic mug"), img("1542990253-0d0f5be5f0ed", "Hot chocolate poured into a mug")],
    perks: ["Hand-glazed stoneware", "Holds 350 ml", "Dishwasher & microwave safe"],
    giftFor: "Coffee, tea and cocoa people",
    desc: "<p>A heavy, hand-glazed mug that keeps cocoa warm through a whole Christmas film.</p>",
  }),
  product({
    handle: "luxe-wrapping-kit", title: "Luxe Gift Wrapping Kit", type: "Decor",
    variants: [[[], 18, 26]],
    media: [img(life.bows, "Gold satin bows on black wrapping"), img(life.kraft, "Kraft wrapped present")],
    perks: ["3 rolls of matte paper", "Satin ribbon & 12 bows", "Gift tags included"],
    giftFor: "The family's official wrapper",
    desc: "<p>Everything for presents that look too good to open.</p>",
  }),
  product({
    handle: "gingerbread-cookie-tin", title: "Gingerbread Cookie Tin", type: "Treats", tags: ["bestseller"],
    variants: [[[], 22, 30]],
    media: [img("1558961363-fa8fdf82db35", "Basket of chocolate chip cookies"), img(life.flatlay, "Festive flat lay")],
    perks: ["Baked in small batches", "24 cookies per tin", "Keepsake tin"],
    giftFor: "Teachers, colleagues and Secret Santa",
    desc: "<p>Spiced, buttery and baked in small batches — packed in a tin worth keeping.</p>",
  }),
  product({
    handle: "truffle-selection-box", title: "Truffle Selection Box", type: "Confectionery",
    options: [["Size", ["12 pieces", "24 pieces"]]],
    variants: [[["12 pieces"], 29, 40], [["24 pieces"], 49, 70]],
    media: [img("1481391319762-47dff72954d9", "Box of assorted chocolate truffles"), img(life.red, "Red gift")],
    perks: ["Hand-finished truffles", "Six festive flavours", "Ribbon-tied box"],
    giftFor: "Chocolate lovers (that's everyone)",
    desc: "<p>Salted caramel, mulled spice, hazelnut praline and more — six flavours of pure indulgence.</p>",
  }),
  product({
    handle: "hot-cocoa-kit", title: "Hot Cocoa Kit", type: "Gourmet",
    options: [["Pack", ["1 Pack", "2 Pack", "3 Pack"]]],
    variants: [[["1 Pack"], 26, 34], [["2 Pack"], 45, 68], [["3 Pack"], 62, 102]],
    media: [img("1542990253-0d0f5be5f0ed", "Hot chocolate being poured"), img(life.fire, "Fireplace")],
    perks: ["Single-origin cocoa", "Marshmallows & peppermint stirrer", "Makes 8 mugs"],
    giftFor: "Snow days and movie nights",
    desc: "<p>Proper, rich drinking chocolate with all the trimmings.</p>",
  }),
  product({
    handle: "pocket-poetry-book", title: "Pocket Poetry Book", type: "Books",
    variants: [[[], 14, 20]],
    media: [img("1544947950-fa07a98d237f", "Poetry book on a wooden table"), img(life.kraft, "Kraft gift")],
    perks: ["Cloth-bound hardback", "Ribbon bookmark", "Fits a stocking"],
    giftFor: "Readers and romantics",
    desc: "<p>A small, beautiful book of verse for quiet mornings after the big day.</p>",
  }),
  product({
    handle: "evergreen-steel-bottle", title: "Evergreen Steel Bottle", type: "Drinkware",
    options: [["Colour", ["Pine", "Snow"]]],
    variants: [[["Pine"], 27, 40], [["Snow"], 27, 40]],
    media: [img("1602143407151-7111542de6e8", "Green insulated steel bottle"), img(life.flatlay, "Greenery")],
    perks: ["Keeps drinks cold 24h / hot 12h", "500 ml, leak-proof", "Powder-coated finish"],
    giftFor: "Gym-goers and New Year's resolutions",
    desc: "<p>Double-walled, powder-coated and ready for every January resolution.</p>",
  }),
  product({
    handle: "mystery-gift-box", title: "Mystery Gift Box", type: "Stocking fillers",
    variants: [[[], 30, 50]],
    media: [img(life.kraft, "Kraft-wrapped gift tied with red and white twine"), img(life.pink, "Pink gift with gold ribbon")],
    perks: ["Three curated surprises", "Wrapped and ready to give", "Includes a gift receipt"],
    giftFor: "Secret Santa and last-minute heroes",
    desc: "<p>Three hand-picked surprises, wrapped and ready — the easiest gift on the list.</p>",
  }),
];

const doc = {
  version: 1,
  syncedAt: new Date().toISOString(),
  demo: true,
  shop: { domain: "demo", name: "The Noel Edit", currencyCode: "USD" },
  products: Object.fromEntries(products.map((p) => [p.handle, p])),
};

mkdirSync("data", { recursive: true });
writeFileSync("data/demo-catalog.json", `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${products.length} demo products to data/demo-catalog.json`);
