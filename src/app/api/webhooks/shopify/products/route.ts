import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { CATALOG_TAG, getProducts } from "@/lib/catalog";
import { isAdminConfigured } from "@/lib/shopify/config";
import { syncCatalog } from "@/lib/shopify/sync";
import { isDuplicateWebhook, verifyShopifyWebhook, wrongShop } from "@/lib/shopify/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Shopify products/create | products/update | products/delete → re-sync the
 * catalog and refresh every page, so price, stock and media changes show up
 * without a redeploy.
 *
 * The Shopify store is shared with other brands, so a product only triggers a
 * sync when it carries the `noel-edit` tag, or is already in our catalog (an
 * update that removes the tag, or a delete, must drop it from the site).
 */

const TOPICS = new Set(["products/create", "products/update", "products/delete"]);
const OUR_TAG = (process.env.SHOPIFY_PRODUCT_TAG || "noel-edit").toLowerCase();

const ack = (extra: Record<string, unknown> = {}) =>
  NextResponse.json({ received: true, ...extra }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const webhookId = request.headers.get("x-shopify-webhook-id");
  try {
    const raw = await request.text();
    if (raw.length > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    if (!verifyShopifyWebhook(raw, request.headers.get("x-shopify-hmac-sha256"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    if (wrongShop(request.headers)) return NextResponse.json({ error: "Unknown shop" }, { status: 401 });
    if (!TOPICS.has(topic)) return ack({ topic, ignored: true });
    if (isDuplicateWebhook(webhookId)) return ack({ topic, deduped: true });

    let payload: { id?: number | string; handle?: string; tags?: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const tagged = String(payload.tags ?? "")
      .split(",")
      .some((t) => t.trim().toLowerCase() === OUR_TAG);
    const inCatalog = (await getProducts()).some(
      (p) => p.id.endsWith(`/${payload.id}`) || (payload.handle && p.handle === payload.handle),
    );
    if (!tagged && !inCatalog) return ack({ topic, matched: false });

    if (!isAdminConfigured()) {
      console.error("[webhook/products] Admin API not configured — skipping sync");
      return ack({ topic, synced: false });
    }

    const result = await syncCatalog();
    revalidateTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    console.log(`[webhook/products] ${topic} ${payload.handle ?? payload.id} → synced ${result.products} product(s)`);
    return ack({ topic, synced: true, products: result.products });
  } catch (error) {
    console.error(`[webhook/products] ${topic} id=${webhookId} failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 }); // 500 → Shopify retries
  }
}
