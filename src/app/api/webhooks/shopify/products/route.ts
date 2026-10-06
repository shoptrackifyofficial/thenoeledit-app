import { NextResponse, type NextRequest } from "next/server";

import { getAllProducts as getProducts, revalidateCatalog } from "@/lib/catalog";
import { isAdminConfigured, shopifyConfig } from "@/lib/shopify/config";
import { syncProduct } from "@/lib/shopify/sync";
import { isDuplicateWebhook, verifyShopifyWebhook, wrongShop } from "@/lib/shopify/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Shopify products/create | products/update | products/delete → re-sync that one
 * product into the catalog document (private Vercel Blob in production, see
 * lib/catalog/storage.ts) and purge the cached catalog read, so price, stock and
 * media changes show up on every page without a redeploy.
 *
 * The Shopify store is shared with other brands, so a product only triggers a
 * sync when its vendor is `TheNoelEdit`, or is already in our catalog (an
 * update that changes the vendor, or a delete, must drop it from the site).
 */

const TOPICS = new Set(["products/create", "products/update", "products/delete"]);

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

    let payload: { id?: number | string; handle?: string; vendor?: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const ours = String(payload.vendor ?? "").trim().toLowerCase() === shopifyConfig().productVendor.toLowerCase();
    const known = (await getProducts()).find(
      (p) => p.id.endsWith(`/${payload.id}`) || (payload.handle && p.handle === payload.handle),
    );
    if (!ours && !known) return ack({ topic, matched: false });

    if (!isAdminConfigured()) {
      console.error("[webhook/products] Admin API not configured — skipping sync");
      return ack({ topic, synced: false });
    }

    if (payload.id == null) return NextResponse.json({ error: "Missing product id" }, { status: 400 });

    const result = await syncProduct({ id: payload.id, handle: payload.handle, deleted: topic === "products/delete" });
    // Purge the new handle's page and the old one (a rename or a removal).
    revalidateCatalog(result.handle, payload.handle, known?.handle);
    console.log(`[webhook/products] ${topic} id=${webhookId} ${payload.handle ?? payload.id} → ${result.action}, ${result.products} product(s) live`);
    return ack({ topic, synced: true, action: result.action, products: result.products });
  } catch (error) {
    console.error(`[webhook/products] ${topic} id=${webhookId} failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 }); // 500 → Shopify retries
  }
}
