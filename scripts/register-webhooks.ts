/**
 * npm run shopify:register-webhooks — register this site's Shopify webhooks
 * through the Admin API, so they are signed with the app's client secret
 * (which is SHOPIFY_WEBHOOK_SECRET) and the HMAC checks in
 * src/app/api/webhooks/** pass. Webhooks made in the admin UI get a hidden
 * secret that can never match, which is why they are created here instead.
 *
 *   ORDERS_PAID      → /api/webhooks/shopify/orders-paid  (server-side Meta Purchase)
 *   PRODUCTS_CREATE  → /api/webhooks/shopify/products     (re-sync the catalog)
 *   PRODUCTS_UPDATE  → /api/webhooks/shopify/products     (re-sync the catalog)
 *
 * The Shopify store is shared with other brands, so this script NEVER deletes
 * anything: it lists what exists and creates only what is missing.
 *
 *   npm run shopify:register-webhooks                  # uses NEXT_PUBLIC_SITE_URL
 *   npm run shopify:register-webhooks -- --list        # list only, change nothing
 *   npm run shopify:register-webhooks -- --url=https://other-domain.com
 *   npm run shopify:register-webhooks -- --delete=<webhookSubscriptionId>
 */
import { getAdminToken } from "../src/lib/shopify/admin-token";
import { shopifyConfig } from "../src/lib/shopify/config";

const ENDPOINTS: Record<string, string> = {
  ORDERS_PAID: "/api/webhooks/shopify/orders-paid",
  PRODUCTS_CREATE: "/api/webhooks/shopify/products",
  PRODUCTS_UPDATE: "/api/webhooks/shopify/products",
};

type Sub = { id: string; topic: string; callbackUrl: string };

async function main() {
  const cfg = shopifyConfig();
  if (!cfg.storeDomain) throw new Error("SHOPIFY_STORE_DOMAIN is not set.");
  const endpoint = `https://${cfg.storeDomain}/admin/api/${cfg.apiVersion}/graphql.json`;
  const token = await getAdminToken();

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[] };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  };

  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

  const del = arg("delete");
  if (del) {
    const r = await gql<{ webhookSubscriptionDelete: { userErrors: { message: string }[] } }>(
      `mutation($id: ID!) { webhookSubscriptionDelete(id: $id) { userErrors { message } } }`,
      { id: del },
    );
    console.log(r.webhookSubscriptionDelete.userErrors.length ? r.webhookSubscriptionDelete.userErrors : `deleted ${del}`);
    return;
  }

  const siteUrl = (arg("url") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(siteUrl) || siteUrl.includes("localhost")) {
    throw new Error(`Shopify can only deliver to a public https URL (got "${siteUrl || "none"}"). Set NEXT_PUBLIC_SITE_URL or pass --url=.`);
  }

  const existing = await gql<{ webhookSubscriptions: { nodes: Sub[] } }>(
    `query { webhookSubscriptions(first: 250) { nodes { id topic callbackUrl } } }`,
  );
  const all = existing.webhookSubscriptions.nodes;
  console.log(`\n${all.length} webhook(s) currently on ${cfg.storeDomain}:`);
  for (const s of all) console.log(`  • ${s.topic.padEnd(18)} ${s.callbackUrl}   (${s.id})`);

  if (process.argv.includes("--list")) return;

  console.log(`\nRegistering for ${siteUrl}:`);
  let created = 0;
  for (const [topic, path] of Object.entries(ENDPOINTS)) {
    const callbackUrl = `${siteUrl}${path}`;
    if (all.some((s) => s.topic === topic && s.callbackUrl === callbackUrl)) {
      console.log(`  skip     ${topic} (already registered)`);
      continue;
    }
    const r = await gql<{
      webhookSubscriptionCreate: { userErrors: { message: string }[]; webhookSubscription: Sub | null };
    }>(
      `mutation($topic: WebhookSubscriptionTopic!, $url: URL!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: { callbackUrl: $url, format: JSON }) {
          userErrors { message }
          webhookSubscription { id topic callbackUrl }
        }
      }`,
      { topic, url: callbackUrl },
    );
    const errors = r.webhookSubscriptionCreate.userErrors;
    if (errors.length) {
      console.error(`  error    ${topic}: ${errors.map((e) => e.message).join("; ")}`);
      continue;
    }
    console.log(`  created  ${topic} → ${callbackUrl}  (${r.webhookSubscriptionCreate.webhookSubscription?.id})`);
    created += 1;
  }

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
  const same = process.env.SHOPIFY_WEBHOOK_SECRET && process.env.SHOPIFY_WEBHOOK_SECRET === process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
  console.log(`\n${created} created.`);
  console.log(
    `Signing secret: ${secret ? (same || !process.env.SHOPIFY_WEBHOOK_SECRET ? "matches the app's client secret ✔" : "SHOPIFY_WEBHOOK_SECRET differs from SHOPIFY_ADMIN_CLIENT_SECRET ✖ — API-created webhooks are signed with the client secret") : "MISSING ✖"}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("✖", message);
  if (/access|scope|topic|permission/i.test(message)) {
    console.error(
      "\nThe app lacks access to a webhook topic. In the Shopify Dev Dashboard, add the scopes read_orders and\n" +
        "read_products to the app, release a new version, and re-install it on the store. Then run this again.",
    );
  }
  process.exit(1);
});
