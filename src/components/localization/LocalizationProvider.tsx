"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Country/currency selection + a live-price overlay cache.
 *
 * The provider itself never computes a price — it only ever holds whatever
 * /api/localization* last returned, which is Shopify's own response for the
 * visitor's effective country. Nothing here does currency math.
 *
 * The country list and current selection are fetched client-side after mount
 * (same reason CartProvider reads its bag catalog via props rather than
 * cookies in the root layout: doing it there would force every route to
 * render dynamically and forfeit static generation).
 */

export type LocalizationCountry = {
  isoCode: string;
  name: string;
  currency: { isoCode: string; symbol: string };
};

type LocalizedPrice = {
  amount: string;
  currencyCode: string;
  /** Shopify's own localized compare-at price, or null if it doesn't have one in this currency — never derived locally. */
  compareAtAmount: string | null;
};

type LocalizationContextValue = {
  /** null until the visitor picks something themselves — a manual override. */
  country: string | null;
  /** The country/currency Shopify uses by default for this visitor, when no override is set. */
  defaultCountry: LocalizationCountry | null;
  /** `country` if the visitor picked one, otherwise `defaultCountry`'s code — what actually drives live pricing. */
  effectiveCountry: string | null;
  /** True once the initial /api/localization fetch has resolved. */
  ready: boolean;
  countries: LocalizationCountry[];
  setCountryCode: (isoCode: string | null) => void;
  /** A live, Shopify-reported price for this variant if one has already been fetched — otherwise null. */
  localizedPriceFor: (variantId: string) => LocalizedPrice | null;
  isPriceLoading: (variantId: string) => boolean;
  /** Batches a request for live prices covering these variant IDs; safe to call from many components on the same page. */
  requestPrices: (variantIds: string[]) => void;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<string | null>(null);
  const [defaultCountry, setDefaultCountry] = useState<LocalizationCountry | null>(null);
  const [ready, setReady] = useState(false);
  const [countries, setCountries] = useState<LocalizationCountry[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, LocalizedPrice>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const pendingIds = useRef<Set<string>>(new Set());
  const requestedIds = useRef<Set<string>>(new Set());
  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/localization", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { countries: LocalizationCountry[]; defaultCountry: LocalizationCountry | null; selected: string | null }) => {
        setCountries(data.countries);
        setDefaultCountry(data.defaultCountry);
        setCountry(data.selected);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setCountries([]);
      })
      .finally(() => setReady(true));
    return () => controller.abort();
  }, []);

  const effectiveCountry = country ?? defaultCountry?.isoCode ?? null;

  const countryRef = useRef(effectiveCountry);
  useEffect(() => {
    if (countryRef.current !== effectiveCountry) {
      countryRef.current = effectiveCountry;
      setPriceMap({});
      setLoadingIds(new Set());
      requestedIds.current.clear();
    }
  }, [effectiveCountry]);

  const flush = useCallback(() => {
    flushTimer.current = null;
    const ids = [...pendingIds.current];
    pendingIds.current.clear();
    if (ids.length === 0 || !effectiveCountry) return;

    fetch("/api/localization/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: ids }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { prices: Record<string, LocalizedPrice> }) => {
        if (Object.keys(data.prices).length === 0) return;
        setPriceMap((current) => ({ ...current, ...data.prices }));
      })
      .catch(() => {
        // A missed overlay just means those items keep showing their base-currency price.
      })
      .finally(() => {
        setLoadingIds((current) => {
          const next = new Set(current);
          for (const id of ids) next.delete(id);
          return next;
        });
      });
  }, [effectiveCountry]);

  const requestPrices = useCallback(
    (variantIds: string[]) => {
      if (!effectiveCountry) return;
      const added: string[] = [];
      for (const id of variantIds) {
        if (requestedIds.current.has(id)) continue;
        requestedIds.current.add(id);
        pendingIds.current.add(id);
        added.push(id);
      }
      if (added.length === 0) return;
      setLoadingIds((current) => new Set([...current, ...added]));
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(flush, 60);
    },
    [effectiveCountry, flush],
  );

  const localizedPriceFor = useCallback((variantId: string) => priceMap[variantId] ?? null, [priceMap]);
  const isPriceLoading = useCallback((variantId: string) => loadingIds.has(variantId), [loadingIds]);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      country,
      defaultCountry,
      effectiveCountry,
      ready,
      countries,
      setCountryCode: setCountry,
      localizedPriceFor,
      isPriceLoading,
      requestPrices,
    }),
    [country, defaultCountry, effectiveCountry, ready, countries, localizedPriceFor, isPriceLoading, requestPrices],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useLocalization must be used inside <LocalizationProvider>");
  return context;
}

/**
 * Convenience hook for a single price display: fires the batched fetch (a
 * no-op if already requested) and reports both the live price once it lands
 * and whether one is in flight, so a caller can show a skeleton instead of a
 * flash of the wrong currency.
 */
export function useLocalizedPrice(variantId: string | null | undefined): { price: LocalizedPrice | null; loading: boolean } {
  const { ready, effectiveCountry, localizedPriceFor, isPriceLoading, requestPrices } = useLocalization();

  useEffect(() => {
    if (variantId && effectiveCountry) requestPrices([variantId]);
  }, [variantId, effectiveCountry, requestPrices]);

  if (!variantId) return { price: null, loading: false };
  if (!ready) return { price: null, loading: true };
  return { price: localizedPriceFor(variantId), loading: isPriceLoading(variantId) };
}

/**
 * Same as useLocalizedPrice, but returns a ready-to-render number + currency
 * code, falling back to the catalog's own base-currency amount until (or
 * unless) a live one lands.
 */
export function useLocalizedAmount(
  variantId: string | null | undefined,
  fallbackAmount: number,
  fallbackCurrencyCode: string,
  fallbackCompareAtAmount: number | null = null,
): { amount: number; currencyCode: string; compareAtAmount: number | null; loading: boolean; isLocalized: boolean } {
  const { price, loading } = useLocalizedPrice(variantId);

  if (price) {
    const parsed = Number.parseFloat(price.amount);
    const compareAtParsed = price.compareAtAmount !== null ? Number.parseFloat(price.compareAtAmount) : null;
    return {
      amount: Number.isFinite(parsed) ? parsed : fallbackAmount,
      currencyCode: price.currencyCode,
      compareAtAmount: compareAtParsed !== null && Number.isFinite(compareAtParsed) ? compareAtParsed : null,
      loading: false,
      isLocalized: true,
    };
  }
  return {
    amount: fallbackAmount,
    currencyCode: fallbackCurrencyCode,
    compareAtAmount: fallbackCompareAtAmount,
    loading,
    isLocalized: false,
  };
}
