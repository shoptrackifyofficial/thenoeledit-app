import { NextRequest, NextResponse } from "next/server";

import { getProductByHandle } from "@/lib/catalog";
import { parseFilter, reviewPageFor } from "@/lib/reviews/feed";

/**
 * GET /api/reviews?handle=…&filter=all|photo|1-5&page=N: one page of a product's review feed.
 * Public data, so it is cached at the edge. Only handles in our own catalog are accepted.
 */
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const handle = params.get("handle") ?? "";
  if (!(await getProductByHandle(handle))) return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  const feed = await reviewPageFor(handle, parseFilter(params.get("filter")), Number(params.get("page")));
  if (!feed) return NextResponse.json({ error: "No reviews" }, { status: 404 });
  return NextResponse.json(feed, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
