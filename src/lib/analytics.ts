/**
 * Commerce events, fanned out to whichever tags are loaded (GTM dataLayer,
 * GA4 gtag, Meta fbq, TikTok ttq). Safe to call before any of them exist —
 * nothing is sent when no tag is configured.
 */

export type AnalyticsItem = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  quantity?: number;
};

type Win = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

const numericId = (gid: string) => gid.split("/").pop() ?? gid;

function send(
  ga: string,
  meta: string | null,
  tiktok: string | null,
  items: AnalyticsItem[],
  currency: string,
) {
  if (typeof window === "undefined") return;
  const w = window as Win;
  const value = Math.round(items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0) * 100) / 100;
  const gaItems = items.map((i) => ({
    item_id: numericId(i.id),
    item_name: i.name,
    item_variant: i.variant,
    price: i.price,
    quantity: i.quantity ?? 1,
  }));
  w.dataLayer?.push({ ecommerce: null });
  w.dataLayer?.push({ event: ga, ecommerce: { currency, value, items: gaItems } });
  w.gtag?.("event", ga, { currency, value, items: gaItems });
  const contentIds = items.map((i) => numericId(i.id));
  if (meta) w.fbq?.("track", meta, { currency, value, content_ids: contentIds, content_type: "product" });
  if (tiktok) {
    w.ttq?.track(tiktok, {
      currency,
      value,
      contents: items.map((i) => ({ content_id: numericId(i.id), content_name: i.name, quantity: i.quantity ?? 1, price: i.price })),
    });
  }
}

export const trackViewItem = (item: AnalyticsItem, currency: string) =>
  send("view_item", "ViewContent", "ViewContent", [item], currency);
export const trackAddToCart = (item: AnalyticsItem, currency: string) =>
  send("add_to_cart", "AddToCart", "AddToCart", [item], currency);
export const trackRemoveFromCart = (item: AnalyticsItem, currency: string) =>
  send("remove_from_cart", null, null, [item], currency);
export const trackBeginCheckout = (items: AnalyticsItem[], currency: string) =>
  send("begin_checkout", "InitiateCheckout", "InitiateCheckout", items, currency);
export const trackViewCart = (items: AnalyticsItem[], currency: string) =>
  send("view_cart", null, null, items, currency);
