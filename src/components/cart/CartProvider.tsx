"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useLocalization } from "@/components/localization/LocalizationProvider";
import type { BagCatalog, BagVariant } from "@/lib/commerce/views";
import { originalPrice, round2, tierCode, tierPercent, tierPrice } from "@/lib/commerce/tiers";
import { site } from "@/content/site";
import type { PaymentMethod } from "@/lib/shopify/payments";
import {
  trackAddToCart,
  trackBeginCheckout,
  getExternalId,
  trackRemoveFromCart,
  type AnalyticsItem,
} from "@/lib/analytics";

/**
 * The bag. Lines live in localStorage as { variantId, quantity } only; names
 * and prices come from the server's bag catalog (GET /api/bag — static and
 * cached, fetched only once a shopper actually has a bag), so a stale browser
 * can never show or submit a price. Shopify re-prices everything when
 * /api/cart/checkout creates the real cart.
 */

export type BagLine = { variantId: string; quantity: number };
export type ResolvedLine = BagLine &
  BagVariant & {
    /** What the shopper pays for this line (after any tier / sale discount). */
    lineTotal: number;
    /** The same line at its list price, before discounts. */
    listTotal: number;
    /** Percent saved on this line, or null. */
    savedPercent: number | null;
    /** Coupon label for the offer on this line, e.g. XMAS56. */
    couponCode: string | null;
  };

const STORAGE_KEY = "noel.bag.v1";
const MAX_QTY = 10;
const MAX_LINES = 20;


type CartContextValue = {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  savings: number;
  currency: string;
  /** Free-shipping progress in the money the shopper sees (the threshold is set in the shop currency). */
  freeShipping: { unlocked: boolean; threshold: number; remaining: number; rate: number; endsAt: string | null };
  isOpen: boolean;
  hydrated: boolean;
  loading: boolean;
  demo: boolean;
  payments: PaymentMethod[];
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number, snapshot?: BagVariant) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  checkout: () => Promise<{ ok: true } | { ok: false; error: string }>;
  announcement: string;
};

const CartContext = createContext<CartContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the bag still works for this visit */
  }
}

function sanitize(raw: unknown): BagLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l): l is BagLine =>
        typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0,
    )
    .map((l) => ({ variantId: l.variantId, quantity: Math.min(MAX_QTY, l.quantity) }))
    .slice(0, MAX_LINES);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<BagLine[]>([]);
  const [catalog, setCatalog] = useState<BagCatalog | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, BagVariant>>({});
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const fetching = useRef<Promise<void> | null>(null);
  const { localizedPriceFor, requestPrices } = useLocalization();

  const loadCatalog = useCallback(() => {
    if (catalog || fetching.current) return fetching.current;
    setLoading(true);
    fetching.current = fetch("/api/bag")
      .then((r) => (r.ok ? (r.json() as Promise<BagCatalog>) : null))
      .then((data) => {
        if (data) setCatalog(data);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        fetching.current = null;
      });
    return fetching.current;
  }, [catalog]);

  // Restore the bag; only pay for the catalog request when there is a bag.
  useEffect(() => {
    const lines = sanitize(readJson(STORAGE_KEY, []));
    setStored(lines);
    setHydrated(true);
    if (lines.length > 0) void loadCatalog();
    // Keep tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStored(sanitize(readJson(STORAGE_KEY, [])));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: BagLine[]) => {
    setStored(next);
    writeJson(STORAGE_KEY, next);
  }, []);

  // Shopify's own prices for the visitor's country. Every line must have one, in one currency,
  // before any is used — otherwise the bag stays entirely in the shop's currency.
  useEffect(() => {
    requestPrices(stored.map((l) => l.variantId));
  }, [stored, requestPrices]);

  const { lines, currency, baseSubtotal } = useMemo(() => {
    const resolved: { line: BagLine; data: BagVariant }[] = [];
    for (const line of stored) {
      const data = catalog?.variants[line.variantId] ?? (catalog ? undefined : snapshots[line.variantId]);
      if (data) resolved.push({ line, data });
    }
    const livePrices = resolved.map(({ line }) => localizedPriceFor(line.variantId));
    const liveCurrency = livePrices[0]?.currencyCode;
    const localized =
      resolved.length > 0 && Boolean(liveCurrency) && livePrices.every((p) => p != null && p.currencyCode === liveCurrency);

    // A tier depends on how many units of the product are in the bag in total.
    const unitsOf = new Map<string, number>();
    for (const { line, data } of resolved) {
      if (data.tiers && data.productId) unitsOf.set(data.productId, (unitsOf.get(data.productId) ?? 0) + line.quantity);
    }
    const out = resolved.map(({ line, data }, i): ResolvedLine => {
      const live = localized ? livePrices[i]! : null;
      const liveAmount = live ? Number.parseFloat(live.amount) : NaN;
      const price = Number.isFinite(liveAmount) ? liveAmount : data.price;
      const liveCompare = live?.compareAtAmount != null ? Number.parseFloat(live.compareAtAmount) : NaN;
      // A compare-at price is only ever Shopify's own, in the visitor's currency.
      const compareAtPrice = live ? (Number.isFinite(liveCompare) ? liveCompare : null) : data.compareAtPrice;
      const list = round2(price * line.quantity);
      if (data.tiers && data.productId) {
        const qty = unitsOf.get(data.productId) ?? line.quantity;
        const pct = tierPercent(data.tiers, qty);
        // The "original" is worked back from the first step's percentage; the shopper pays the
        // bundle step's share of Shopify's price (checkout applies the matching code).
        return {
          ...line,
          ...data,
          price,
          lineTotal: tierPrice(list, data.tiers, qty),
          listTotal: originalPrice(list, data.tiers.discounts[0] ?? 0),
          savedPercent: pct > 0 ? pct : null,
          couponCode: tierCode(data.tiers, qty),
        };
      }
      const onSale = compareAtPrice != null && compareAtPrice > price;
      return {
        ...line,
        ...data,
        price,
        compareAtPrice,
        lineTotal: list,
        listTotal: onSale ? round2(compareAtPrice! * line.quantity) : list,
        savedPercent: onSale ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100) : null,
        couponCode: null,
      };
    });
    return {
      lines: out,
      currency: localized && liveCurrency ? liveCurrency : (catalog?.currency ?? "USD"),
      baseSubtotal: round2(resolved.reduce((sum, { line, data }) => sum + data.price * line.quantity, 0)),
    };
  }, [stored, catalog, snapshots, localizedPriceFor]);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const savings = round2(lines.reduce((s, l) => s + (l.listTotal - l.lineTotal), 0));

  const freeShipping = useMemo(() => {
    // Visitor's price ÷ shop price, from the undiscounted prices (1 until Shopify's local prices have landed).
    const listNow = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const ratio = baseSubtotal > 0 ? listNow / baseSubtotal : 1;
    const threshold = Math.ceil(site.delivery.freeOver * ratio);
    // The regular shipping price, in the money the shopper sees; and the earliest offer deadline among the bag's products.
    const ends = lines.map((l) => l.offerEndsAt).filter((d): d is string => Boolean(d)).sort()[0] ?? null;
    return {
      unlocked: baseSubtotal >= site.delivery.freeOver,
      threshold,
      remaining: Math.max(0, round2(threshold - subtotal)),
      rate: round2(site.delivery.rate * ratio),
      endsAt: ends,
    };
  }, [baseSubtotal, subtotal, lines]);

  const toItem = (l: ResolvedLine | (BagVariant & { variantId: string }), quantity: number): AnalyticsItem => ({
    id: l.variantId,
    name: l.productName,
    variant: l.variantLabel || undefined,
    // the price actually paid per unit, when the line carries a discount
    price: "lineTotal" in l && l.quantity > 0 ? round2(l.lineTotal / l.quantity) : l.price,
    quantity,
    productId: l.productId,
    category: l.category,
  });

  const add = useCallback(
    (variantId: string, quantity = 1, snapshot?: BagVariant) => {
      if (snapshot) setSnapshots((s) => ({ ...s, [variantId]: snapshot }));
      const current = sanitize(readJson(STORAGE_KEY, []));
      const existing = current.find((l) => l.variantId === variantId);
      const next = existing
        ? current.map((l) =>
            l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
          )
        : [...current, { variantId, quantity: Math.min(MAX_QTY, quantity) }].slice(-MAX_LINES);
      persist(next);
      void loadCatalog();
      setOpen(true);
      const data = snapshot ?? catalog?.variants[variantId];
      if (data) {
        setAnnouncement(`${data.productName} added to your bag.`);
        // Analytics carry the price the shopper saw, in the currency they saw it.
        const live = localizedPriceFor(variantId);
        const liveAmount = live ? Number.parseFloat(live.amount) : NaN;
        trackAddToCart(
          toItem({ ...data, variantId, ...(Number.isFinite(liveAmount) ? { price: liveAmount } : {}) }, quantity),
          (Number.isFinite(liveAmount) && live?.currencyCode) || catalog?.currency || "USD",
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persist, loadCatalog, catalog, localizedPriceFor],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const q = Math.max(0, Math.min(MAX_QTY, Math.floor(quantity)));
      persist(
        q === 0
          ? stored.filter((l) => l.variantId !== variantId)
          : stored.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
      );
    },
    [persist, stored],
  );

  const remove = useCallback(
    (variantId: string) => {
      const line = lines.find((l) => l.variantId === variantId);
      persist(stored.filter((l) => l.variantId !== variantId));
      if (line) {
        setAnnouncement(`${line.productName} removed from your bag.`);
        trackRemoveFromCart(toItem(line, line.quantity), currency);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persist, stored, lines, currency],
  );


  const checkout = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (lines.length === 0) return { ok: false, error: "Your bag is empty." };
    trackBeginCheckout(
      lines.map((l) => toItem(l, l.quantity)),
      currency,
    );
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          externalId: getExternalId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        return { ok: false, error: data.error ?? "We couldn't start checkout. Please try again." };
      }
      window.location.assign(data.checkoutUrl);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — please check your connection and try again." };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, currency]);

  const open = useCallback(() => {
    setOpen(true);
    void loadCatalog();
  }, [loadCatalog]);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      savings,
      currency,
      freeShipping,
      isOpen,
      hydrated,
      loading,
      demo: Boolean(catalog?.demo),
      payments: catalog?.payments ?? [],
      open,
      close,
      add,
      setQuantity,
      remove,
      checkout,
      announcement,
    }),
    [lines, count, subtotal, savings, currency, freeShipping, isOpen, hydrated, loading, catalog, open, close, add, setQuantity, remove, checkout, announcement],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
