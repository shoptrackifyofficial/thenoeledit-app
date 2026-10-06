import shipped from "../../../data/catalog.json";
import { CATALOG_PATH, readJsonFile } from "@/lib/catalog/storage";
import type { CatalogDocument } from "@/lib/catalog/types";

/**
 * The catalog document the site serves, and the base every sync merges into.
 *
 * Two copies exist:
 *  - the bundled one: data/catalog.json imported into the build, so it ships with
 *    every deploy (refresh it with `npm run shopify:sync`, then commit it);
 *  - the live one: private Vercel Blob in production (a deployed function can't
 *    write files), written ONLY by a sync that changed something: the
 *    products/* webhook or POST /api/admin/sync. In dev it is data/catalog.json itself.
 *
 * The one with the newer `syncedAt` wins. A deploy carrying a fresher JSON takes
 * over from a stale Blob at once, and a webhook that ran after the build keeps
 * winning over the bundled file. No server-only import: the sync scripts load
 * this module too.
 */

/** The catalog shipped with this build. */
export const bundledCatalog = shipped as unknown as CatalogDocument;

const syncedTime = (doc: CatalogDocument): number => Date.parse(doc.syncedAt ?? "");
const hasProducts = (doc: CatalogDocument | null): doc is CatalogDocument =>
  Boolean(doc?.products && Object.keys(doc.products).length > 0);

/**
 * Throws when the live copy can't be read, so a sync never merges onto stale
 * data and overwrites a newer Blob. Readers catch it and serve `bundledCatalog`.
 */
export async function readLiveCatalog(): Promise<CatalogDocument> {
  const live = await readJsonFile<CatalogDocument>(CATALOG_PATH);
  if (!hasProducts(live)) return bundledCatalog;
  if (!hasProducts(bundledCatalog)) return live;
  // Ties and undated documents keep the live copy (NaN comparisons are false).
  return syncedTime(bundledCatalog) > syncedTime(live) ? bundledCatalog : live;
}
