import "server-only";

import { summarize, type ProductReviews, type Review } from "./types";

/**
 * Product reviews from Judge.me, server-only (the private API token never
 * reaches the browser). Needs JUDGEME_API_TOKEN; the shop domain reuses
 * SHOPIFY_STORE_DOMAIN. With either missing, or on any failure, this returns
 * null and the page simply shows no reviews.
 *
 * Judge.me's product filter doesn't scope this shop's responses, so the pool is
 * paged once an hour (cached) and filtered by `product_handle` here.
 *
 * Honesty: reviews written on this store by a verified buyer are marked
 * `verified`. Reviews imported from a marketplace (AliExpress etc.) are kept
 * but flagged `source`, shown with an "Imported review" label, never as
 * verified, and never used in search-engine rating markup.
 */

type JudgemeReview = {
  id: number;
  rating: number;
  body: string | null;
  title: string | null;
  created_at: string;
  hidden: boolean;
  published: boolean;
  verified?: string | null;
  source?: string | null;
  product_handle: string | null;
  country_code?: string | null;
  reviewer?: { name?: string | null; country_code?: string | null } | null;
  pictures?: { hidden?: boolean; urls: { original: string; compact?: string } }[];
};

const ENDPOINT = "https://judge.me/api/v1/reviews";
const PER_PAGE = 100;
const MAX_PAGES = 20;
const VERIFIED = new Set(["buyer", "confirmed-buyer", "verified-buyer"]);
const IMPORTED = /import|aliexpress|amazon|csv|ali|cj|temu|etsy|shopee/i;

const shopDomain = () => (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const apiToken = () => (process.env.JUDGEME_API_TOKEN ?? "").trim();

async function fetchAll(domain: string, token: string): Promise<JudgemeReview[]> {
  const all: JudgemeReview[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("api_token", token);
    url.searchParams.set("shop_domain", domain);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    const res = await fetch(url, { next: { revalidate: 3600, tags: ["reviews"] } });
    if (!res.ok) break;
    const data = (await res.json()) as { reviews?: JudgemeReview[] };
    const reviews = data.reviews ?? [];
    all.push(...reviews);
    if (reviews.length < PER_PAGE) break;
  }
  return all;
}

/** A two-letter country code, only if Judge.me sent a valid one. */
function country(r: JudgemeReview): string | null {
  const c = (r.reviewer?.country_code ?? r.country_code ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

function displayName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified buyer";
  const last = parts.length > 1 ? ` ${parts[parts.length - 1]![0]!.toUpperCase()}.` : "";
  return `${parts[0]}${last}`;
}

/** Published, visible reviews with some text for a Shopify product handle; null when none or on any failure. */
export async function getProductReviews(handle: string): Promise<ProductReviews | null> {
  const domain = shopDomain();
  const token = apiToken();
  if (!domain || !token) return null;
  try {
    const raw = await fetchAll(domain, token);
    const reviews: Review[] = raw
      .filter((r) => r.product_handle === handle && r.published && !r.hidden && Boolean(r.body?.trim() || r.title?.trim()))
      .map((r) => {
        const imported = Boolean(r.source && IMPORTED.test(r.source));
        return {
          id: String(r.id),
          rating: Math.min(5, Math.max(1, Math.round(r.rating))) as Review["rating"],
          title: r.title?.trim() || null,
          body: r.body?.trim() || "",
          author: displayName(r.reviewer?.name),
          createdAt: r.created_at,
          images: (r.pictures ?? []).filter((p) => !p.hidden).map((p) => p.urls.compact ?? p.urls.original),
          verified: !imported && Boolean(r.verified && VERIFIED.has(r.verified)),
          ...(imported ? { source: r.source!.toLowerCase() } : {}),
          ...(country(r) ? { country: country(r)! } : {}),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (reviews.length === 0) return null;
    return { reviews, summary: summarize(reviews) };
  } catch {
    return null;
  }
}

/** Only reviews written on this store by verified buyers: the sole input for rating markup in search results. */
export function verifiedOnly(set: ProductReviews | null): ProductReviews | null {
  if (!set) return null;
  const reviews = set.reviews.filter((r) => r.verified);
  return reviews.length ? { reviews, summary: summarize(reviews) } : null;
}
