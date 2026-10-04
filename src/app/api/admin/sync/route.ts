import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { revalidateCatalog } from "@/lib/catalog";
import { syncCatalog } from "@/lib/shopify/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/sync — re-sync the catalog from the Shopify Admin API and
 * refresh every page. Auth: `Authorization: Bearer <ADMIN_API_KEY>`.
 *
 *   curl -X POST https://<domain>/api/admin/sync -H "Authorization: Bearer $ADMIN_API_KEY"
 *
 * Full resync; the products/* webhook syncs only the product that changed.
 */
function authorized(request: NextRequest): boolean {
  const key = process.env.ADMIN_API_KEY ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (key.length < 16 || given.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(key));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncCatalog();
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[admin/sync]", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Sync failed — see server logs." }, { status: 500 });
  }
}
