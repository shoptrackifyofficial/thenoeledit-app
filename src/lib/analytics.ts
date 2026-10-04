/**
 * Commerce + engagement events, fanned out to whichever tags are configured
 * (GTM dataLayer, GA4 gtag, Meta Pixel + Conversions API, TikTok ttq). Safe to
 * call before any tag has loaded and when none is configured.
 *
 * Meta: every event is sent twice with the same `event_id` — once by the
 * browser Pixel and once server-side through /api/meta/event (Conversions
 * API) — and Meta de-duplicates the pair. The server copy survives ad
 * blockers and carries stronger matching signals (IP, user agent, _fbp, _fbc,
 * external_id, hashed email after newsletter sign-up). Parameters follow
 * Meta's standard-event spec: content_ids, contents[{id, quantity,
 * item_price}], content_type, content_name, content_category, currency,
 * value, num_items, search_string.
 *
 * Purchase is not sent from here: it happens on Shopify's hosted checkout.
 */

export type AnalyticsItem = {
  /** Shopify variant GID. */
  id: string;
  name: string;
  variant?: string;
  price: number;
  quantity?: number;
  /** Shopify product GID (enables Shopify-catalog content ids). */
  productId?: string;
  category?: string;
};

type Win = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  __fbqPending?: unknown[][];
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

const META_ON = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
const EXTERNAL_ID_KEY = "noel.eid.v1";

const numericId = (gid: string) => gid.split("/").pop() ?? gid;
const round = (n: number) => Math.round(n * 100) / 100;
const browser = () => (typeof window === "undefined" ? null : (window as Win));

/** The id sent to Meta for an item: the Shopify variant id (the same id the Purchase webhook sends). */
export function contentId(item: Pick<AnalyticsItem, "id">): string {
  return numericId(item.id);
}

/**
 * A stable, anonymous per-browser id sent to Meta as `external_id`. It is a
 * random 64-hex string, i.e. already in SHA-256 shape, so the Pixel and the
 * Conversions API send the identical value with no hashing mismatch.
 */
export function getExternalId(): string | null {
  const w = browser();
  if (!w) return null;
  try {
    const existing = w.localStorage.getItem(EXTERNAL_ID_KEY);
    if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    w.localStorage.setItem(EXTERNAL_ID_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

function newEventId(name: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${name}.${rand}`;
}

/** Calls fbq, or queues the call until the (lazily loaded) Pixel installs itself. */
function fbq(...args: unknown[]) {
  const w = browser();
  if (!w) return;
  if (w.fbq) w.fbq(...args);
  else (w.__fbqPending ??= []).push(args);
}

type MetaOptions = { custom?: boolean; email?: string };

/** Browser Pixel + server Conversions API, de-duplicated by a shared event_id. */
export function metaEvent(name: string, params: Record<string, unknown> = {}, opts: MetaOptions = {}) {
  const w = browser();
  if (!w || !META_ON) return;
  const eventId = newEventId(name);
  fbq(opts.custom ? "trackCustom" : "track", name, params, { eventID: eventId });

  const body = JSON.stringify({
    event_name: name,
    event_id: eventId,
    event_source_url: w.location.href,
    referrer_url: document.referrer || undefined,
    custom_data: params,
    external_id: getExternalId(),
    email: opts.email,
  });
  try {
    void fetch("/api/meta/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

/* ── shared payload builders ──────────────────────────────────────────── */

const total = (items: AnalyticsItem[]) => round(items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0));
const count = (items: AnalyticsItem[]) => items.reduce((n, i) => n + (i.quantity ?? 1), 0);

function metaContents(items: AnalyticsItem[], currency: string) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  return {
    content_type: "product",
    content_ids: items.map(contentId),
    contents: items.map((i) => ({ id: contentId(i), quantity: i.quantity ?? 1, item_price: round(i.price) })),
    content_name: items.length === 1 ? items[0]!.name : undefined,
    content_category: categories.length === 1 ? categories[0] : undefined,
    currency,
    value: total(items),
  };
}

function google(event: string, items: AnalyticsItem[], currency: string, extra: Record<string, unknown> = {}) {
  const w = browser();
  if (!w) return;
  const gaItems = items.map((i) => ({
    item_id: numericId(i.id),
    item_name: i.name,
    item_variant: i.variant,
    item_category: i.category,
    price: i.price,
    quantity: i.quantity ?? 1,
  }));
  const payload = { currency, value: total(items), items: gaItems, ...extra };
  w.dataLayer?.push({ ecommerce: null });
  w.dataLayer?.push({ event, ecommerce: payload });
  w.gtag?.("event", event, payload);
}

function tiktok(event: string, items: AnalyticsItem[], currency: string) {
  browser()?.ttq?.track(event, {
    currency,
    value: total(items),
    content_type: "product",
    contents: items.map((i) => ({
      content_id: contentId(i),
      content_name: i.name,
      content_category: i.category,
      quantity: i.quantity ?? 1,
      price: i.price,
    })),
  });
}

/** A product card as an analytics item (its lead variant). */
export function cardItem(card: {
  productId: string;
  leadVariantId: string | null;
  name: string;
  price: number;
  category: { title: string };
}): AnalyticsItem {
  return {
    id: card.leadVariantId ?? card.productId,
    productId: card.productId,
    name: card.name,
    price: card.price,
    category: card.category.title,
  };
}

/* ── events ───────────────────────────────────────────────────────────── */

export function trackPageView() {
  metaEvent("PageView");
}

export function trackViewItem(item: AnalyticsItem, currency: string) {
  google("view_item", [item], currency);
  metaEvent("ViewContent", metaContents([{ ...item, quantity: 1 }], currency));
  tiktok("ViewContent", [item], currency);
}

/** Shopper picked a different option (size, finish, pack) on a product page. */
export function trackCustomizeProduct(item: AnalyticsItem, currency: string, option: string, value: string) {
  google("select_item", [item], currency, { option_name: option, option_value: value });
  metaEvent("CustomizeProduct", { ...metaContents([{ ...item, quantity: 1 }], currency), option_name: option, option_value: value });
}

/** A category or "all gifts" listing was viewed (Meta custom event). */
export function trackViewCategory(category: string, items: AnalyticsItem[], currency: string) {
  const top = items.slice(0, 20);
  google("view_item_list", top, currency, { item_list_name: category });
  metaEvent(
    "ViewCategory",
    {
      content_type: "product",
      content_category: category,
      content_name: category,
      content_ids: top.map(contentId),
      num_items: items.length,
      currency,
    },
    { custom: true },
  );
}

export function trackSearch(query: string, results: AnalyticsItem[], currency: string) {
  const q = query.trim().toLowerCase().slice(0, 100);
  if (!q) return;
  const top = results.slice(0, 10);
  browser()?.gtag?.("event", "search", { search_term: q });
  browser()?.dataLayer?.push({ event: "search", search_term: q, results: results.length });
  metaEvent("Search", {
    search_string: q,
    content_type: "product",
    content_ids: top.map(contentId),
    contents: top.map((i) => ({ id: contentId(i), quantity: 1, item_price: round(i.price) })),
    num_items: results.length,
    currency,
  });
  browser()?.ttq?.track("Search", { query: q });
}

export function trackAddToCart(item: AnalyticsItem, currency: string) {
  google("add_to_cart", [item], currency);
  metaEvent("AddToCart", metaContents([item], currency));
  tiktok("AddToCart", [item], currency);
}

export function trackRemoveFromCart(item: AnalyticsItem, currency: string) {
  google("remove_from_cart", [item], currency);
}

export function trackViewCart(items: AnalyticsItem[], currency: string) {
  google("view_cart", items, currency);
}

export function trackBeginCheckout(items: AnalyticsItem[], currency: string) {
  google("begin_checkout", items, currency);
  metaEvent("InitiateCheckout", { ...metaContents(items, currency), num_items: count(items) });
  tiktok("InitiateCheckout", items, currency);
}

/** Newsletter sign-up. The email goes only to our own server, which hashes it for Meta. */
export function trackLead(email: string) {
  browser()?.gtag?.("event", "generate_lead", { lead_source: "newsletter" });
  browser()?.dataLayer?.push({ event: "generate_lead", lead_source: "newsletter" });
  metaEvent("Lead", { content_name: "Newsletter", content_category: "newsletter" }, { email });
  browser()?.ttq?.track("SubmitForm", {});
}

export function trackContact(method: string) {
  metaEvent("Contact", { content_name: method });
  browser()?.ttq?.track("Contact", {});
}
