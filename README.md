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

1. In Shopify, tag each product `noel-edit` (or change `SHOPIFY_PRODUCT_QUERY`).
2. Give it a category: a tag `category:for-her` (any slug), or a Product type listed in `src/content/categories.ts`. Unknown product types become categories automatically.
3. Optional metafields (namespace `custom`):
   - `perks` — list of short benefit lines (shown as bullets on the PDP)
   - `gift_for` — "Who it's for" line
   - `sale_ends_at` — date/time; overrides the site-wide countdown
4. Pack bundles: name an option `Pack` with values like `1 Pack`, `2 Pack`, `3 Pack` and the PDP shows photo pack cards with per-unit prices.
5. Sale price = Shopify `price`; struck-through price = `compare at price`.
6. Run `npm run shopify:sync` (or `POST /api/admin/sync` with `Authorization: Bearer $ADMIN_API_KEY`).

Until a sync finds tagged products, the site serves `data/demo-catalog.json` (placeholder products, checkout disabled).

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

## Before launch

- Set `NEXT_PUBLIC_SITE_URL` to the real domain (drives canonicals, sitemap, JSON-LD).
- Replace placeholder images (Unsplash) in `site.ts`, `categories.ts` and the home "wrapped" section.
- Check returns/delivery wording against your Shopify policies.
- Production: link a private Vercel Blob store (`BLOB_READ_WRITE_TOKEN`) so syncs persist.
- Add a consent banner before enabling GA/Meta/TikTok/Clarity for EU/UK traffic.
