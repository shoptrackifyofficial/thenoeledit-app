/**
 * Turns a TikTok Shop review export into a paged review store the site reads one page at a time, and
 * copies each review's photos and profile picture onto our own host (TikTok's links are signed and
 * expire within days).
 *
 *   npx tsx scripts/import-tiktok-reviews.ts <raw.json> <out-dir> <photo-dir> [prefix]
 *   e.g. data/reviews/source/neck-massager-tiktok.raw.json data/reviews/neck-massager public/reviews/neck-massager nm
 *
 * Writes to <out-dir>:
 *   meta.json            summary (count, average, per-star), photo count, page counts per filter, and the
 *                        few five-star reviews the buy-box strip shows
 *   <filter>-<page>.json one page of FEED_PAGE_SIZE reviews, for each filter: all, photo, 1..5
 * so the server only ever reads the page being asked for (see src/lib/reviews/local.ts).
 *
 * Keeps: rating, text (may be empty: a star-only rating), the already-masked name, country, date, photos
 * and profile picture. Leaves out on purpose: `verified_purchase` (a TikTok purchase is not a purchase
 * from this store, so nothing here is ever marked a verified buyer), and photos on a review whose text
 * mentions a home or address. Every review is tagged `source: "tiktok"`, so it is never used in
 * search-engine rating markup.
 *
 * Re-runnable: files already on disk are not downloaded again.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FEED_PAGE_SIZE, summarize, type Review } from "../src/lib/judgeme/types";

type Raw = {
  reviewer_name: string;
  country?: string;
  rating: number;
  review_text?: string;
  date: string;
  media_urls?: string[];
  profile_pic_url?: string;
};

const [rawPath, outDir, photoDir, prefix = "tt"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!rawPath || !outDir || !photoDir) {
  console.error("usage: tsx scripts/import-tiktok-reviews.ts <raw.json> <out-dir> <photo-dir> [prefix]");
  process.exit(1);
}

const ADDRESS = /\b(my (house|home|door|porch|apartment)|address|street)\b/i;
/** Only TikTok's own image CDN is ever downloaded from. */
const TIKTOK_CDN = /^https:\/\/[^/]+\.(?:tiktokcdn-us|ttcdn-us|tiktokcdn)\.com\//i;
const AVATAR_DIR = path.join("public", "avatars");
const FEATURED = 5;

/** Stable per review, so files survive the export being re-merged or re-sorted. */
const fileKey = (r: Raw) =>
  createHash("sha1").update([r.reviewer_name, r.date, r.review_text ?? ""].join("|")).digest("hex").slice(0, 8);

const publicPath = (file: string) => "/" + path.relative("public", file).split(path.sep).join("/");

async function download(url: string, file: string): Promise<boolean> {
  if (existsSync(file)) return true;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

/** True for a (near) solid black image: TikTok serves a black square for accounts with no picture. */
async function isBlank(file: string): Promise<boolean> {
  try {
    const { default: sharp } = await import("sharp");
    const { channels } = await sharp(file).stats();
    return channels.every((c) => c.max < 40);
  } catch {
    return false;
  }
}

/** Newest day first; within a day: higher rating, then photos, then ones with words, then time. */
function newestDayFirst(a: Review, b: Review): number {
  const byDay = b.createdAt.slice(0, 10).localeCompare(a.createdAt.slice(0, 10));
  if (byDay !== 0) return byDay;
  return (
    b.rating - a.rating ||
    Number(b.images.length > 0) - Number(a.images.length > 0) ||
    Number(Boolean(b.body)) - Number(Boolean(a.body)) ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

async function main() {
  const raw = JSON.parse(readFileSync(rawPath!, "utf8")) as { reviews: Raw[] };
  mkdirSync(photoDir!, { recursive: true });
  mkdirSync(AVATAR_DIR, { recursive: true });

  const reviews: Review[] = [];
  let failed = 0;
  let withheld = 0;
  let blank = 0;
  for (const r of raw.reviews.filter((x) => x.rating >= 1 && x.rating <= 5)) {
    const key = fileKey(r);
    const text = (r.review_text ?? "").trim();
    const sensitive = ADDRESS.test(text);
    if (sensitive && r.media_urls?.length) withheld += 1;

    const images: string[] = [];
    for (const [j, url] of (sensitive ? [] : (r.media_urls ?? [])).entries()) {
      if (!TIKTOK_CDN.test(url)) continue;
      const file = path.join(photoDir!, `${prefix}-${key}-${j + 1}.webp`);
      if (await download(url, file)) images.push(publicPath(file));
      else failed += 1;
    }

    let avatar: string | undefined;
    if (r.profile_pic_url && TIKTOK_CDN.test(r.profile_pic_url)) {
      const file = path.join(AVATAR_DIR, `${prefix}-${key}.jpg`);
      if (!(await download(r.profile_pic_url, file))) failed += 1;
      else if (await isBlank(file)) {
        unlinkSync(file);
        blank += 1;
      } else avatar = publicPath(file);
    }

    reviews.push({
      id: "",
      rating: r.rating as Review["rating"],
      title: null,
      body: text,
      author: r.reviewer_name,
      ...(avatar ? { avatar } : {}),
      ...(r.country && /^[A-Za-z]{2}$/.test(r.country) ? { country: r.country.toUpperCase() } : {}),
      verified: false,
      // Noon UTC: the export gives a day, not a time.
      createdAt: `${r.date}T12:00:00.000Z`,
      images,
      source: "tiktok",
    });
  }
  reviews.sort(newestDayFirst);
  reviews.forEach((r, i) => (r.id = `${prefix}-${String(i + 1).padStart(3, "0")}`));

  // Rebuild the page files from scratch so a smaller export leaves no stale pages behind.
  rmSync(outDir!, { recursive: true, force: true });
  mkdirSync(outDir!, { recursive: true });

  const filters = ["all", "photo", "1", "2", "3", "4", "5"] as const;
  const pages: Record<string, number> = {};
  for (const f of filters) {
    const matching = reviews.filter((r) => (f === "all" ? true : f === "photo" ? r.images.length > 0 : r.rating === Number(f)));
    const count = Math.ceil(matching.length / FEED_PAGE_SIZE);
    pages[f] = count;
    for (let p = 1; p <= count; p++) {
      const items = matching.slice((p - 1) * FEED_PAGE_SIZE, p * FEED_PAGE_SIZE);
      writeFileSync(path.join(outDir!, `${f}-${p}.json`), JSON.stringify({ items, total: matching.length, page: p, pages: count }));
    }
  }
  const meta = {
    summary: summarize(reviews),
    photoCount: reviews.filter((r) => r.images.length > 0).length,
    pages,
    featured: reviews.filter((r) => r.rating === 5 && r.body).slice(0, FEATURED),
  };
  writeFileSync(path.join(outDir!, "meta.json"), JSON.stringify(meta));

  console.log(
    `${reviews.length} reviews -> ${outDir} (${pages.all} pages of ${FEED_PAGE_SIZE}; ${reviews.filter((r) => r.body).length} with text, ` +
      `${reviews.reduce((s, r) => s + r.images.length, 0)} photos, ${reviews.filter((r) => r.avatar).length} profile pictures` +
      (blank ? `, ${blank} blank dropped` : "") +
      (withheld ? `, photos withheld on ${withheld}` : "") +
      (failed ? `, ${failed} downloads failed` : "") +
      ")",
  );
}

void main();
