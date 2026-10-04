import "server-only";

import { getProductReviews } from "@/lib/judgeme/reviews";
import { FEED_PAGE_SIZE, type FeedFilter, type FeedPage, type ProductReviews } from "@/lib/judgeme/types";

/** Server side of the review feed: page one ships in the HTML, `/api/reviews` serves the rest a page at a time. */
export const reviewSetFor = (handle: string): Promise<ProductReviews | null> => getProductReviews(handle);

export const photoCount = (set: ProductReviews) => set.reviews.filter((r) => r.images.length > 0).length;

export function parseFilter(raw: string | null): FeedFilter {
  if (raw === "photo") return "photo";
  const star = Number(raw);
  return star >= 1 && star <= 5 && Number.isInteger(star) ? (star as FeedFilter) : "all";
}

export function feedPage(set: ProductReviews, filter: FeedFilter, page: number): FeedPage {
  const matching =
    filter === "all" ? set.reviews : filter === "photo" ? set.reviews.filter((r) => r.images.length > 0) : set.reviews.filter((r) => r.rating === filter);
  const pages = Math.max(1, Math.ceil(matching.length / FEED_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: matching.slice((current - 1) * FEED_PAGE_SIZE, current * FEED_PAGE_SIZE), total: matching.length, page: current, pages };
}
