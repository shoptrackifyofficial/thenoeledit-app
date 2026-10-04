import { NextResponse, type NextRequest } from "next/server";

import {
  META_EVENTS,
  hashEmail,
  hashLocation,
  metaConfig,
  sanitizeCustomData,
  sendServerEvent,
} from "@/lib/meta/capi";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/meta/event — the server half of every Meta event. The browser
 * Pixel fires the same event with the same event_id, and Meta keeps one.
 *
 * The browser only supplies the event name/id, the page URL, standard
 * custom_data (allow-listed and type-checked here), its anonymous
 * external_id and — for newsletter Leads only — the email it just submitted.
 * Everything else that improves Event Match Quality is read server-side:
 * IP, user agent, the _fbp/_fbc cookies (or a click id built from ?fbclid=),
 * Vercel geo headers, and the hashed email remembered after a sign-up.
 */

const FBP = /^fb\.\d\.\d{10,13}\.\d{5,20}$/;
const FBC = /^fb\.\d\.\d{10,13}\.[\w-]{10,500}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const EVENT_ID = /^[A-Za-z]{2,30}\.[\w-]{8,64}$/;
const EM_COOKIE = "noel_em";
const DAY = 60 * 60 * 24;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (!metaConfig()) return json({ ok: false, error: "not configured" });

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return json({ error: "Invalid origin." }, 403);
  const ip = clientIp(request.headers);
  if (!rateLimit(`meta:${ip}`, 120, 60_000)) return json({ error: "Too many requests." }, 429);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Bad request." }, 400);

  const name = typeof body.event_name === "string" ? body.event_name : "";
  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  if (!META_EVENTS.has(name) || !EVENT_ID.test(eventId)) return json({ error: "Unknown event." }, 400);

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(String(body.event_source_url));
  } catch {
    return json({ error: "Bad url." }, 400);
  }
  if (sourceUrl.host !== request.nextUrl.host) return json({ error: "Bad url." }, 400);

  // Click id: the Pixel's _fbc cookie, else one built from ?fbclid= (Meta's documented format).
  let fbc = request.cookies.get("_fbc")?.value;
  let newFbc: string | null = null;
  const fbclid = sourceUrl.searchParams.get("fbclid");
  if (fbclid && /^[\w-]{10,500}$/.test(fbclid) && !fbc?.endsWith(`.${fbclid}`)) {
    newFbc = `fb.1.${Date.now()}.${fbclid}`;
    fbc = newFbc;
  }
  const fbp = request.cookies.get("_fbp")?.value;

  // Email: from a newsletter Lead (then remembered, hashed, for later events), or the remembered hash.
  const leadHash = name === "Lead" && typeof body.email === "string" ? hashEmail(body.email) : null;
  const rememberedHash = request.cookies.get(EM_COOKIE)?.value;
  const em = leadHash ?? (rememberedHash && HEX64.test(rememberedHash) ? rememberedHash : undefined);

  const externalId = typeof body.external_id === "string" && HEX64.test(body.external_id) ? body.external_id : undefined;
  const h = request.headers;

  const userData = Object.fromEntries(
    Object.entries({
      client_ip_address: ip !== "unknown" ? ip : undefined,
      client_user_agent: h.get("user-agent")?.slice(0, 500) || undefined,
      fbp: fbp && FBP.test(fbp) ? fbp : undefined,
      fbc: fbc && FBC.test(fbc) ? fbc : undefined,
      external_id: externalId ? [externalId] : undefined,
      em: em ? [em] : undefined,
      // Approximate location from the hosting edge (present on Vercel; hashed per Meta's spec).
      ct: hashLocation("ct", h.get("x-vercel-ip-city")),
      st: hashLocation("st", h.get("x-vercel-ip-country-region")),
      zp: hashLocation("zp", h.get("x-vercel-ip-postal-code")),
      country: hashLocation("country", h.get("x-vercel-ip-country")),
    }).filter(([, v]) => v !== undefined),
  );

  let referrer: string | undefined;
  try {
    referrer = body.referrer_url ? new URL(String(body.referrer_url)).toString().slice(0, 1000) : undefined;
  } catch {
    referrer = undefined;
  }

  const result = await sendServerEvent({
    event_name: name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: sourceUrl.toString().slice(0, 1000),
    referrer_url: referrer,
    action_source: "website",
    user_data: userData,
    custom_data: sanitizeCustomData(body.custom_data),
  }).catch((error: unknown) => {
    console.error("[meta capi]", error instanceof Error ? error.message : error);
    return { ok: false as const, error: "send failed" };
  });

  // In test mode echo Meta's reply (events_received, fbtrace_id) so events are easy to verify.
  const res = json(
    "test" in result && result.test
      ? { ok: result.ok, meta: result.body, sent: { event_name: name, user_data_keys: Object.keys(userData) } }
      : { ok: result.ok },
    result.ok ? 200 : 502,
  );
  const secure = request.nextUrl.protocol === "https:";
  if (newFbc) res.cookies.set("_fbc", newFbc, { path: "/", maxAge: 90 * DAY, sameSite: "lax", secure });
  if (leadHash) res.cookies.set(EM_COOKIE, leadHash, { path: "/", maxAge: 180 * DAY, sameSite: "lax", secure, httpOnly: true });
  return res;
}
