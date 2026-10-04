import { NextRequest, NextResponse } from "next/server";

import { variantIndex } from "@/lib/catalog";
import { resolveEffectiveCountry } from "@/lib/localization/country";
import { getLocalizedVariantPrices } from "@/lib/shopify/localization";

/**
 * POST /api/localization/prices — each variant's price *as Shopify reports it*
 * for the visitor's country (their own choice, else the edge-detected one).
 * No conversion happens here. With no country (e.g. localhost) or on any
 * failure it returns no prices and pages keep showing the catalog's currency.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GID = /^gid:\/\/shopify\/ProductVariant\/\d{1,20}$/;
const MAX_IDS = 60;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });

export async function POST(request: NextRequest) {
  const country = await resolveEffectiveCountry();
  if (!country) return json({ prices: {} });

  const raw = await request.text();
  if (raw.length > 8_000) return json({ error: "Request too large." }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const input = (body as { variantIds?: unknown })?.variantIds;
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IDS) {
    return json({ error: "Invalid variant ids." }, 400);
  }

  const known = await variantIndex();
  const ids = input.filter((id): id is string => typeof id === "string" && GID.test(id) && known.has(id));
  if (ids.length === 0) return json({ prices: {} });

  try {
    const priceMap = await getLocalizedVariantPrices(ids, country);
    return json({ prices: Object.fromEntries(priceMap), country });
  } catch {
    return json({ prices: {} });
  }
}
