/**
 * npm run shopify:sync — pulls every product matching SHOPIFY_PRODUCT_QUERY
 * (default `vendor:"TheNoelEdit" status:active`) from the Shopify Admin API into
 * data/catalog.json (or private Vercel Blob when BLOB_READ_WRITE_TOKEN is set).
 */
import { syncCatalog } from "../src/lib/shopify/sync";

syncCatalog()
  .then((r) => {
    console.log(`Synced ${r.products} product(s) for query "${r.query}" at ${r.syncedAt}${r.changed ? "" : " (no change, nothing written)"}.`);
    if (r.changed) console.log("Catalog changed: commit data/catalog.json so the next deploy ships it.");
    if (r.products === 0) {
      console.log("No products matched, so the site keeps serving the bundled demo catalog.");
      console.log("Set the vendor of your products to TheNoelEdit in Shopify (or set SHOPIFY_PRODUCT_QUERY), then re-run.");
    }
  })
  .catch((error) => {
    console.error("Sync failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
