import { NextResponse } from "next/server";

import { isDemoCatalog } from "@/lib/catalog";
import { getBagCatalog } from "@/lib/commerce/views";

/**
 * GET /api/bag — the variant lookup the bag needs (names, labels, prices,
 * images). Static and edge-cached; the catalog revalidation refreshes it.
 * Fetched by the browser only once a shopper has something in their bag,
 * so it never weighs on first page load.
 */
export const revalidate = 3600;

export async function GET() {
  const data = await getBagCatalog(await isDemoCatalog());
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
