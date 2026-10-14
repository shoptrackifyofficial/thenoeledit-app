import "server-only";

import { getProductReviews, verifiedOnly } from "@/lib/judgeme/reviews";
import { hasLocalReviews, localOverview, localPage } from "@/lib/reviews/local";
import { FEED_PAGE_SIZE, type FeedFilter, type FeedPage, type ProductReviews, type Review, type ReviewSummary } from "@/lib/judgeme/types";

/**
 * Server side of the review feed. Everything is paged: the product page gets the rating summary, the
 * photo count, a few featured reviews and page one; `/api/reviews` serves any other page. Products with
 * a local store (`data/reviews/<store>/`, see lib/reviews/local.ts) read only the page file asked for.
 * Everything else comes from Judge.me, whose set is fetched once an hour and cached.
 */

export type ReviewOverview = {
  summary: ReviewSummary;
  photoCount: number;
  /** The few five-star reviews with words that the buy-box strip shows. */
  featured: Review[];
  /** Rating for search-engine markup: only reviews written on this store by verified buyers, else null. */
  verified: { average: number; count: number } | null;
};

const FEATURED = 5;

const photoCount = (set: ProductReviews) => set.reviews.filter((r) => r.images.length > 0).length;

export function parseFilter(raw: string | null): FeedFilter {
  if (raw === "photo") return "photo";
  const star = Number(raw);
  return star >= 1 && star <= 5 && Number.isInteger(star) ? (star as FeedFilter) : "all";
}

function feedPage(set: ProductReviews, filter: FeedFilter, page: number): FeedPage {
  const matching =
    filter === "all" ? set.reviews : filter === "photo" ? set.reviews.filter((r) => r.images.length > 0) : set.reviews.filter((r) => r.rating === filter);
  const pages = Math.max(1, Math.ceil(matching.length / FEED_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: matching.slice((current - 1) * FEED_PAGE_SIZE, current * FEED_PAGE_SIZE), total: matching.length, page: current, pages };
}

export async function reviewOverviewFor(handle: string): Promise<ReviewOverview | null> {
  if (hasLocalReviews(handle)) {
    const local = await localOverview(handle);
    // Imported reviews are never "verified", so they give no rating markup.
    return local ? { ...local, verified: null } : null;
  }
  const set = await getProductReviews(handle);
  if (!set) return null;
  const verified = verifiedOnly(set);
  return {
    summary: set.summary,
    photoCount: photoCount(set),
    featured: set.reviews.filter((r) => r.rating === 5 && r.body.trim()).slice(0, FEATURED),
    verified: verified ? { average: verified.summary.average, count: verified.summary.count } : null,
  };
}

export async function reviewPageFor(handle: string, filter: FeedFilter, page: number): Promise<FeedPage | null> {
  if (hasLocalReviews(handle)) return localPage(handle, filter, page);
  const set = await getProductReviews(handle);
  return set ? feedPage(set, filter, page) : null;
}
