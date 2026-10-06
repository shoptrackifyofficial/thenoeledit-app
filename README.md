# The Noel Edit

A headless Christmas gift-sale storefront: Next.js 15 (App Router) + Shopify. Backend pattern follows `reference/` (Admin API → synced catalog → static/ISR pages, Storefront API cart → Shopify Checkout).

## Commands

```bash
npm run dev                          # dev server
npm run build && npm start           # production build
npm run typecheck
npm run shopify:sync                 # pull products from the Shopify Admin API
node scripts/make-demo-catalog.mjs   # regenerate the placeholder catalog
```

## Adding products

1. In Shopify, set each product's vendor to `TheNoelEdit` and make it Active. The sync fetches exactly `vendor:"TheNoelEdit" status:active` and nothing else (override with `SHOPIFY_PRODUCT_VENDOR` or `SHOPIFY_PRODUCT_QUERY`).
2. Give it a category: a tag `category:for-her` (any slug), or a Product type listed in `src/content/categories.ts`. Unknown product types become categories automatically.
3. Optional metafields (namespace `custom`):
   - `perks` — list of short benefit lines (shown as bullets on the PDP)
   - `gift_for` — "Who it's for" line
   - "Offer ends at" (key `sale_ends_at`) — date/time; the offer deadline shown in the "Offer ends in" timer on the product page and in the bag
4. Pack bundles: name an option `Pack` with values like `1 Pack`, `2 Pack`, `3 Pack` and the PDP shows photo pack cards with per-unit prices.
5. Sale price = Shopify `price`; struck-through price = `compare at price`.
6. Run `npm run shopify:sync` (or `POST /api/admin/sync` with `Authorization: Bearer $ADMIN_API_KEY`).

Until a sync finds vendor products, the site serves `data/demo-catalog.json` (placeholder products, checkout disabled).

## Where to change things

| What | File |
|---|---|
| Sale end date, hero image/video, delivery cut-offs, promises | `src/content/site.ts` |
| Categories (title, blurb, image, product-type mapping) | `src/content/categories.ts` |
| FAQ copy (also FAQPage schema + llms.txt) | `src/content/faqs.ts` |
| Help pages (shipping, returns, faq, contact) | `src/app/pages/[slug]/page.tsx` |
| Colours, fonts, motion | `src/app/globals.css`, `src/app/fonts.ts` |

Hero video: set `site.hero.video` to an mp4 URL; the image stays as poster/LCP.

## Architecture

```
src/lib/shopify/     Admin token (client credentials), GraphQL client, catalog sync, Storefront cart
src/lib/catalog/     catalog read model (fs in dev, private Vercel Blob in prod), categories
src/lib/commerce/    product/card views, menu + bag data
src/lib/seo/         JSON-LD (Organization, WebSite, Product/ProductGroup, Breadcrumb, ItemList, FAQ)
src/app/             routes: /, /shop, /shop/[category], /products/[handle], /cart, /search,
                     /pages/[slug], /api/bag, /api/cart/checkout, /api/admin/sync,
                     sitemap.xml, robots.txt, llms.txt, manifest
```

- Pages are static/ISR (1h) off the synced catalog; `revalidateTag("catalog")` refreshes everything.
- Only the header, gallery, purchase panel, shop filters, search and bag hydrate.
- Bag lives in localStorage (variant ids only); prices come from `/api/bag` and Shopify re-prices at checkout. Gift wrap + message travel as cart attributes and the order note.
- Newsletter → Shopify `customerCreate` with email-marketing consent (needs `write_customers` scope).
- Webhooks are not wired yet. When ready, have `products/*` webhooks call `syncCatalog()` + `revalidateTag("catalog")` (see `src/app/api/admin/sync/route.ts`).

## Bundle offers (Buy 1 / 2 / 3 → 50% / 56% / 65% off)

The percentages in `custom.noel_story` (`bundle.discounts: [50, 56, 65]`, `bundle.codePrefix: "XMAS"`) are off an **original** price worked back from your Shopify price: `original = price ÷ (1 − 50%)`. With a $49.99 price the original is $99.98 and:

| Bundle | Shows | Shopper pays | Code needed |
|---|---|---|---|
| Buy 1 | ~~$99.98~~ 50% off | $49.99 | none — your Shopify price already is the offer |
| Buy 2 | ~~$199.96~~ 56% off | $87.98 ($43.99 each) | `XMAS56` = **12% off** your price |
| Buy 3 | ~~$299.94~~ 65% off | $104.98 ($34.99 each) | `XMAS65` = **30% off** your price |

Shopify charges its own price per camera, so the extra reduction for Buy 2 / Buy 3 is a Shopify discount code. The code *names* are the ones shoppers see (XMAS56, XMAS65); the *values* are the ratio `(1 − tier%) ÷ (1 − first%)`, computed in `src/lib/commerce/tiers.ts` and printed by the check below. Create them in Shopify admin → Discounts → **Amount off products** → *Percentage*, applies to the camera, minimum quantity 2 (XMAS56) and 3 (XMAS65), combinations off. Then run `npm run shopify:check-discounts` — it must print ✔ for every row. Until then checkout refuses with "This offer is being set up" rather than charge more than the page shows. The code values are ratios, so they stay right when you change the Shopify price; if you change the percentages, re-run the check and update the codes.

## Ribbons (any colours, any quantity)

The satin-ribbon product uses `multi` in its `custom.noel_story` (see `scripts/enrich-phomemo.ts`): every colour gets its own quantity, and the same 50 / 56 / 65% ladder applies to the **total ribbons** (1 / 2 / 3+). Same maths as the camera bundle, so create two more Shopify discount codes on the **ribbon product**: `RIBBON56` = **12% off**, minimum quantity 2, and `RIBBON65` = **30% off**, minimum quantity 3 (Amount off products, combinations on with other product discounts). Until they exist, checkout with 2+ ribbons answers "This offer is being set up". The printer's page offers the same ribbon picker as an optional extra (`story.addon`), and its ribbons share the same ladder in the bag.

## Before launch

- Set `NEXT_PUBLIC_SITE_URL` to the real domain (drives canonicals, sitemap, JSON-LD).
- Replace placeholder images (Unsplash) in `site.ts`, `categories.ts` and the home "wrapped" section.
- Check returns/delivery wording against your Shopify policies.
- Production: link a private Vercel Blob store (`BLOB_READ_WRITE_TOKEN`) so syncs persist.
- Add a consent banner before enabling GA/Meta/TikTok/Clarity for EU/UK traffic.
