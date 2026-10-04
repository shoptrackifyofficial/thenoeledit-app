/**
 * Review shapes and pure helpers shared by the Judge.me fetch, the feed API and
 * the reviews UI. Types and pure functions only (not `server-only`), because
 * client components import this module.
 */

export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  /** Already shortened ("Sara K."); masked for display with `maskName`. */
  author: string;
  /** ISO instant. */
  createdAt: string;
  images: string[];
  /** Two-letter country code of the reviewer, when Judge.me sends one (it usually does not for imported reviews). */
  country?: string;
  /** Judge.me marked the reviewer as a verified buyer of this store. */
  verified: boolean;
  /** Where an imported review was written ("aliexpress"…); absent for reviews written on this store. */
  source?: string;
};

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type ProductReviews = { reviews: Review[]; summary: ReviewSummary };

/** Reviews per page in the full feed. */
export const FEED_PAGE_SIZE = 8;

/** What the feed can be narrowed to: everything, reviews with photos, or one star band. */
export type FeedFilter = "all" | "photo" | Review["rating"];

export type FeedPage = { items: Review[]; total: number; page: number; pages: number };

/** "Oct 2, 2026": a short fixed date (not "2 days ago", which would change under a reader). */
export function formatReviewDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(then);
}

/** A reviewer's name as shown: first and last letter of each word with two stars between ("Nicholas M." becomes "N**s M**"). */
export function maskName(name: string): string {
  if (name.includes("*") || name === "Verified buyer") return name;
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const letters = word.replace(/\.$/, "");
      if (letters.length === 0) return word;
      return letters.length === 1 ? `${letters}**` : `${letters[0]}**${letters[letters.length - 1]}`;
    })
    .join(" ");
}

/** Counts, mean (1 decimal) and the per-star distribution. */
export function summarize(reviews: Review[]): ReviewSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary["distribution"];
  for (const r of reviews) distribution[r.rating] += 1;
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { count, average: Math.round(average * 10) / 10, distribution };
}
