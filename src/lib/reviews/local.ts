import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { FeedFilter, FeedPage, Review, ReviewSummary } from "@/lib/judgeme/types";

/**
 * Review stores kept in the repo (`data/reviews/<store>/`), written by
 * `scripts/import-tiktok-reviews.ts` as a small `meta.json` plus one file per page of the feed
 * (`all-1.json`, `photo-2.json`, `5-3.json` …). The server reads only what a request needs: the
 * meta file for the rating line, and the single page file for the feed. The full set is never
 * loaded, and nothing but the page asked for is sent to the browser.
 *
 * Honesty: every review here is imported from TikTok Shop and tagged `source: "tiktok"`, so it is
 * never marked a verified buyer and never feeds search-engine rating markup. The summary is
 * worked out from exactly the reviews in the store.
 */

export type LocalOverview = {
  summary: ReviewSummary;
  photoCount: number;
  /** The few reviews the buy-box strip shows (five-star, with words). */
  featured: Review[];
};

type Meta = LocalOverview & { pages: Record<string, number> };

/** Product handle -> store folder under data/reviews. */
const STORES: Record<string, string> = {
  "heated-neck-shoulder-massager": "neck-massager",
};

const ROOT = path.join(process.cwd(), "data", "reviews");
const metaCache = new Map<string, Meta>();

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function metaFor(handle: string): Promise<{ store: string; meta: Meta } | null> {
  const store = STORES[handle];
  if (!store) return null;
  const cached = metaCache.get(store);
  if (cached) return { store, meta: cached };
  const meta = await readJson<Meta>(path.join(ROOT, store, "meta.json"));
  if (!meta || meta.summary.count === 0) return null;
  metaCache.set(store, meta);
  return { store, meta };
}

export function hasLocalReviews(handle: string): boolean {
  return handle in STORES;
}

export async function localOverview(handle: string): Promise<LocalOverview | null> {
  const found = await metaFor(handle);
  return found ? { summary: found.meta.summary, photoCount: found.meta.photoCount, featured: found.meta.featured } : null;
}

/** One page of the feed for a filter; a page past the end gives the last one, an empty filter an empty page. */
export async function localPage(handle: string, filter: FeedFilter, page: number): Promise<FeedPage | null> {
  const found = await metaFor(handle);
  if (!found) return null;
  const pages = found.meta.pages[String(filter)] ?? 0;
  if (pages === 0) return { items: [], total: 0, page: 1, pages: 1 };
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return readJson<FeedPage>(path.join(ROOT, found.store, `${filter}-${current}.json`));
}
