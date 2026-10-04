// Test the Purchase pipeline (Meta CAPI + GA4): sends a signed fake `orders/paid` webhook to the
// local dev server (npm run dev) and prints what was sent to Meta and its reply.
// Usage: npm run meta:test-purchase   (base URL override: TEST_BASE_URL=...)
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const secret = env.SHOPIFY_WEBHOOK_SECRET;
if (!secret) throw new Error("SHOPIFY_WEBHOOK_SECRET missing");

const order = {
  id: 5900000000001,
  name: "#TEST1001",
  email: "  Jane.Doe@Example.com ",
  phone: "+1 (415) 555-0123",
  currency: "USD",
  current_total_price: "211.40",
  total_price: "211.40",
  subtotal_price: "188.00",
  total_tax: "15.40",
  total_discounts: "10.00",
  total_shipping_price_set: { shop_money: { amount: "8.00" } },
  discount_codes: [{ code: "MERRY10" }],
  processed_at: new Date().toISOString(),
  browser_ip: "203.0.113.42",
  client_details: { browser_ip: "203.0.113.42", user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1" },
  order_status_url: "https://shop.example.com/orders/abc/authenticate?key=xyz",
  customer: { id: 7000000001, email: "jane.doe@example.com", first_name: "Jane", last_name: "Doe" },
  billing_address: { first_name: "Jane", last_name: "Doe", phone: "+14155550123", city: "San Francisco", province_code: "CA", zip: "94103-1234", country_code: "US" },
  shipping_address: { first_name: "John", last_name: "Doe", phone: "+14155550199", city: "Oakland", province_code: "CA", zip: "94607", country_code: "US" },
  note_attributes: [
    { name: "Gift wrap", value: "Yes" },
    { name: "_fbp", value: "fb.1.1759550000000.1234567890" },
    { name: "_fbc", value: "fb.1.1759550000000.IwAR2TestClick123456" },
    { name: "_eid", value: "c".repeat(64) },
    { name: "_ga_cid", value: "1234567890.1759550000" },
    { name: "_ga_sid", value: "1759550000" },
  ],
  line_items: [
    { id: 1, product_id: 1003, variant_id: 1001, title: "Pearl Drop Necklace", quantity: 1, price: "89.00", total_discount: "5.00" },
    { id: 2, product_id: 1003, variant_id: 1002, title: "Pearl Drop Necklace", quantity: 1, price: "99.00", total_discount: "5.00" },
    { id: 3, product_id: 999, variant_id: 99999, title: "Other brand item", quantity: 2, price: "20.00" },
  ],
};

const body = JSON.stringify(order);
const sig = createHmac("sha256", secret).update(body, "utf8").digest("base64");
const send = async (signature, id) => {
  const res = await fetch(`${process.env.TEST_BASE_URL ?? "http://localhost:3000"}/api/webhooks/shopify/orders-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Hmac-Sha256": signature, "X-Shopify-Webhook-Id": id },
    body,
  });
  return [res.status, await res.text()];
};

const hookId = `test-${Date.now()}`;
const [s1, b1] = await send(sig, hookId);
console.log("signed:", s1, b1);
const [s2, b2] = await send(sig, hookId);
console.log("redelivery:", s2, b2);
const [s3, b3] = await send("bad" + sig, `${hookId}-x`);
console.log("bad signature:", s3, b3);
