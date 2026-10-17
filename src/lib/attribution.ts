/**
 * Ad attribution. Shoppers land here with ?utm_*&fbclid=…&placement=…, browse on this domain, then
 * pay on Shopify's hosted checkout — which never sees the landing URL. We keep EVERY query param of
 * the landing URL in a first-party cookie, copy them onto the Shopify cart (hidden attributes) and
 * read them back in the orders/paid webhook for the server-side Purchase events.
 */

export const ATTRIBUTION_COOKIE = "noel_attr";
export const ATTRIBUTION_MAX_AGE_DAYS = 30;

/** Only a landing URL carrying one of these starts (and replaces) a stored attribution. */
const LANDING_SIGNALS = /^(utm_|placement$|fbclid$|gclid$|gbraid$|wbraid$|ttclid$|msclkid$|twclid$)/i;

const MAX_PARAMS = 25;
const MAX_VALUE = 200;
/** Keeps the cookie well under the 4 KB browser limit. */
const MAX_QUERY_LENGTH = 2400;

const KEY = /^[\w.-]{1,40}$/;
const isUtm = (key: string) => key.startsWith("utm_");

export type Attribution = Record<string, string>;

/** True when the URL's params mark an ad / campaign visit. */
export const hasLandingSignal = (params: URLSearchParams) => [...params.keys()].some((k) => LANDING_SIGNALS.test(k));

/** Every valid query param, bounded in count and size. */
export function pickAttribution(params: URLSearchParams): Attribution {
  const out: Attribution = {};
  let size = 0;
  for (const [rawKey, rawValue] of params) {
    const key = rawKey.trim();
    const value = rawValue.trim().slice(0, MAX_VALUE);
    if (!KEY.test(key) || !value || key in out) continue;
    size += key.length + value.length + 2;
    if (Object.keys(out).length >= MAX_PARAMS || size > MAX_QUERY_LENGTH) break;
    out[key] = value;
  }
  return out;
}

/** Cookie value. The caller must not encode it again (cookies are decoded once on the server). */
export const serializeAttribution = (a: Attribution) => encodeURIComponent(new URLSearchParams(a).toString());

/** Reads the cookie value as the server sees it (already decoded once). */
export function parseAttribution(raw: string | undefined | null): Attribution {
  if (!raw) return {};
  let query = raw;
  // Tolerate a value that still arrives percent-encoded.
  if (!query.includes("=") && query.includes("%3D")) {
    try {
      query = decodeURIComponent(query);
    } catch {
      return {};
    }
  }
  return pickAttribution(new URLSearchParams(query));
}

/**
 * Cart / order attribute name for a param. UTMs keep their own name (`utm_source` → `_utm_source`);
 * everything else is namespaced (`fbclid` → `_qp_fbclid`) so no param can collide with the
 * identity attributes (_fbp, _fbc, _eid, _ga_cid…).
 */
export const attributeName = (key: string) => (isUtm(key) ? `_${key}` : `_qp_${key}`);

/** The inverse, for an order's note attributes. */
export function attributionFromAttributes(attrs: Map<string, string>): Attribution {
  const out: Attribution = {};
  for (const [name, value] of attrs) {
    const key = name.startsWith("_qp_") ? name.slice(4) : name.startsWith("_utm_") ? name.slice(1) : null;
    if (key && KEY.test(key) && value) out[key] = value.slice(0, MAX_VALUE);
  }
  return out;
}

/** Event-payload form: utm_* and placement as-is, other params prefixed so they can't clobber `value`, `currency`… */
export function eventParams(a: Attribution): Record<string, string> {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [isUtm(k) || k === "placement" ? k : `qp_${k}`, v]));
}
