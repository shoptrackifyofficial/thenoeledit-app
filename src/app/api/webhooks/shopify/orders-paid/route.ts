import { NextResponse, type NextRequest } from "next/server";

import { site } from "@/content/site";
import { categories } from "@/content/categories";
import { categorySlugOf, getProducts } from "@/lib/catalog";
import { gaConfig, sendGaPurchase, type GaItem } from "@/lib/ga/mp";
import { isDuplicateWebhook, verifyShopifyWebhook, wrongShop } from "@/lib/shopify/webhook";
import { hashLocation, hashPhone, hashText, hashZip, sendServerEvent, sha256 } from "@/lib/meta/capi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Shopify `orders/paid` webhook → Meta Conversions API `Purchase`.
 *
 * Shoppers pay on Shopify's hosted checkout and never return to a page on
 * this domain, so this server-to-server call is the only way the purchase
 * reaches Meta. Register it in Shopify admin → Settings → Notifications →
 * Webhooks → "Order payment", URL https://<your-domain>/api/webhooks/shopify/orders-paid,
 * format JSON, and put the signing secret shown there in SHOPIFY_WEBHOOK_SECRET.
 *
 * Matching signals, strongest first: hashed email, phone, first/last name,
 * city, region, zip, country (billing + shipping), the shopper's real IP and
 * user agent from the order, the _fbp/_fbc/external id our checkout route put
 * on the cart, and a hashed Shopify customer id. Only line items from this
 * storefront's catalog are counted (the Shopify store is shared).
 */

type Money = string | number | null | undefined;
type Address = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country_code?: string | null;
};
type LineItem = {
  id: number;
  product_id?: number | null;
  variant_id?: number | null;
  title?: string | null;
  quantity?: number;
  price?: Money;
  total_discount?: Money;
};
type Order = {
  id: number;
  name?: string;
  email?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  currency?: string;
  current_total_price?: Money;
  total_price?: Money;
  subtotal_price?: Money;
  total_tax?: Money;
  total_discounts?: Money;
  total_shipping_price_set?: { shop_money?: { amount?: Money } } | null;
  discount_codes?: { code?: string }[];
  processed_at?: string | null;
  created_at?: string | null;
  browser_ip?: string | null;
  client_details?: { browser_ip?: string | null; user_agent?: string | null } | null;
  order_status_url?: string | null;
  referring_site?: string | null;
  customer?: { id?: number; email?: string | null; phone?: string | null; first_name?: string | null; last_name?: string | null } | null;
  billing_address?: Address | null;
  shipping_address?: Address | null;
  note_attributes?: { name?: string; value?: string }[];
  line_items?: LineItem[];
  test?: boolean;
};

const ok = (body: Record<string, unknown> = { received: true }) => NextResponse.json(body);
const num = (v: Money) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const FBP = /^fb\.\d\.\d{10,13}\.\d{5,20}$/;
const FBC = /^fb\.\d\.\d{10,13}\.[\w-]{10,500}$/;
const HEX64 = /^[a-f0-9]{64}$/;

/** Up to two distinct hashed values (billing + shipping), as Meta accepts arrays. */
const both = (a?: string, b?: string) => {
  const list = [...new Set([a, b].filter((v): v is string => Boolean(v)))];
  return list.length ? list : undefined;
};

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyShopifyWebhook(raw, request.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (wrongShop(request.headers)) return NextResponse.json({ error: "Unknown shop" }, { status: 401 });
  if (isDuplicateWebhook(request.headers.get("x-shopify-webhook-id"))) return ok({ received: true, duplicate: true });

  let order: Order;
  try {
    order = JSON.parse(raw) as Order;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only this storefront's products count (the Shopify store is shared with other brands).
  const products = await getProducts();
  const byVariant = new Map<string, (typeof products)[number]>();
  for (const p of products) for (const v of p.variants) byVariant.set(v.id.split("/").pop()!, p);
  const lines = (order.line_items ?? []).filter((l) => l.variant_id && byVariant.has(String(l.variant_id)));
  if (lines.length === 0) {
    console.log(`[orders-paid] ${order.name ?? order.id}: no Noel Edit items, skipped`);
    return ok({ received: true, skipped: "no matching items" });
  }

  const allOurs = lines.length === (order.line_items ?? []).length;
  const itemsValue = num(lines.reduce((s, l) => s + num(l.price) * (l.quantity ?? 1) - num(l.total_discount), 0));
  const value = allOurs ? num(order.current_total_price ?? order.total_price) : itemsValue;

  const titleOf = (slug: string) => categories.find((c) => c.slug === slug)?.title ?? slug;
  const cats = [...new Set(lines.map((l) => titleOf(categorySlugOf(byVariant.get(String(l.variant_id))!))))];

  // Identity the checkout route stored on the cart (hidden "_" attributes).
  const attrs = new Map((order.note_attributes ?? []).map((a) => [a.name ?? "", a.value ?? ""]));
  const fbp = attrs.get("_fbp");
  const fbc = attrs.get("_fbc");
  const eid = attrs.get("_eid");

  const bill = order.billing_address ?? {};
  const ship = order.shipping_address ?? {};
  const email = order.email || order.contact_email || order.customer?.email;
  const userData = Object.fromEntries(
    Object.entries({
      em: email ? [hashText(email)!] : undefined,
      ph: both(hashPhone(order.phone || order.customer?.phone || bill.phone), hashPhone(ship.phone)),
      fn: both(hashText(bill.first_name || order.customer?.first_name), hashText(ship.first_name)),
      ln: both(hashText(bill.last_name || order.customer?.last_name), hashText(ship.last_name)),
      ct: both(hashLocation("ct", bill.city ?? null), hashLocation("ct", ship.city ?? null)),
      st: both(hashLocation("st", bill.province_code ?? null), hashLocation("st", ship.province_code ?? null)),
      zp: both(hashZip(bill.zip, bill.country_code), hashZip(ship.zip, ship.country_code)),
      country: both(hashLocation("country", bill.country_code ?? null), hashLocation("country", ship.country_code ?? null)),
      external_id: [eid && HEX64.test(eid) ? eid : undefined, order.customer?.id ? sha256(String(order.customer.id)) : undefined].filter(Boolean),
      client_ip_address: order.browser_ip || order.client_details?.browser_ip || undefined,
      client_user_agent: order.client_details?.user_agent || undefined,
      fbp: fbp && FBP.test(fbp) ? fbp : undefined,
      fbc: fbc && FBC.test(fbc) ? fbc : undefined,
    }).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  );

  // Meta accepts events up to 7 days old; use the real order time when it is within that window.
  const orderTime = Date.parse(order.processed_at || order.created_at || "") / 1000;
  const now = Math.floor(Date.now() / 1000);
  const eventTime = Number.isFinite(orderTime) && now - orderTime < 6 * 86400 ? Math.floor(orderTime) : now;

  const contents = lines.map((l) => ({
    id: String(l.variant_id),
    quantity: l.quantity ?? 1,
    item_price: num(l.price),
    delivery_category: "home_delivery",
  }));
  const customData: Record<string, unknown> = {
    currency: order.currency ?? "USD",
    value,
    content_type: "product",
    content_ids: contents.map((c) => c.id),
    contents,
    content_name: lines.length === 1 ? lines[0]!.title ?? undefined : undefined,
    content_category: cats.length === 1 ? cats[0] : undefined,
    num_items: lines.reduce((n, l) => n + (l.quantity ?? 1), 0),
    order_id: String(order.id),
    delivery_category: "home_delivery",
    // Custom properties — usable for custom audiences and reporting breakdowns.
    order_name: order.name,
    subtotal: num(order.subtotal_price),
    tax: num(order.total_tax),
    shipping: num(order.total_shipping_price_set?.shop_money?.amount),
    discount: num(order.total_discounts),
    coupon: order.discount_codes?.[0]?.code || undefined,
    categories: cats,
  };

  // ── GA4 purchase: same order, GA's own field names ────────────────────────────
  const coupon = order.discount_codes?.[0]?.code || undefined;
  const gaItems: GaItem[] = lines.map((l) => {
    const qty = l.quantity ?? 1;
    const product = byVariant.get(String(l.variant_id))!;
    const variant = product.variants.find((v) => v.id.endsWith(`/${l.variant_id}`));
    return {
      item_id: String(l.variant_id),
      item_name: l.title ?? product.title,
      item_variant: variant ? Object.values(variant.options).join(" / ") : undefined,
      item_category: titleOf(categorySlugOf(product)),
      price: num(l.price),
      quantity: qty,
      discount: num(num(l.total_discount) / qty),
      coupon,
      affiliation: site.name,
    };
  });
  const gaPhone = hashPhone(order.phone || order.customer?.phone || bill.phone);
  const gaUser = Object.fromEntries(
    Object.entries({
      sha256_email_address: email ? [hashText(email)] : undefined,
      sha256_phone_number: gaPhone ? [gaPhone] : undefined,
      address:
        bill.first_name || bill.city || bill.zip
          ? [
              {
                sha256_first_name: hashText(bill.first_name),
                sha256_last_name: hashText(bill.last_name),
                city: bill.city?.trim().toLowerCase().replace(/\s+/g, "") || undefined,
                region: bill.province_code?.trim().toLowerCase() || undefined,
                postal_code: bill.zip?.trim() || undefined,
                country: bill.country_code?.trim().toUpperCase() || undefined,
              },
            ]
          : undefined,
    }).filter(([, v]) => v !== undefined),
  );
  const testMode = Boolean(process.env.META_TEST_EVENT_CODE?.trim());
  const gaPromise = gaConfig()
    ? sendGaPurchase(
        {
          // The browser's id when captured at checkout; otherwise one stable id per order.
          clientId: attrs.get("_ga_cid") || `${order.id}.${Math.floor(Date.parse(order.created_at || "") / 1000) || 1}`,
          sessionId: attrs.get("_ga_sid"),
          timestampMicros: eventTime * 1_000_000,
          transactionId: String(order.id),
          currency: order.currency ?? "USD",
          value,
          tax: num(order.total_tax),
          shipping: num(order.total_shipping_price_set?.shop_money?.amount),
          coupon,
          items: gaItems,
          userData: Object.keys(gaUser).length ? gaUser : undefined,
        },
        testMode, // test mode: validate against GA's debug endpoint instead of recording a real purchase
      ).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) }))
    : Promise.resolve({ ok: false as const, error: "not configured" });

  const metaPromise = sendServerEvent({
    event_name: "Purchase",
    event_time: eventTime,
    event_id: `Purchase.${order.id}`,
    event_source_url: order.order_status_url || `${site.url}/cart`,
    referrer_url: order.referring_site || undefined,
    action_source: "website",
    user_data: userData,
    custom_data: Object.fromEntries(Object.entries(customData).filter(([, v]) => v !== undefined)),
  }).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) }));

  // Independent: a Meta problem must never stop GA, and vice versa.
  const [result, ga] = await Promise.all([metaPromise, gaPromise]);

  console.log(
    `[orders-paid] ${order.name ?? order.id} ${value} ${order.currency} → Meta: ${result.ok ? "sent" : "failed"}, GA4: ${ga.ok ? (testMode ? "validated" : "sent") : "failed"}`,
  );

  // Always 200 so Shopify does not retry for a destination-side problem; in test mode, echo what was sent.
  return ok(
    testMode
      ? {
          received: true,
          meta: "body" in result ? result.body : result,
          ga4: "body" in ga ? ga.body : ga,
          sent: { value, user_data_keys: Object.keys(userData), custom_data: customData },
        }
      : { received: true },
  );
}
