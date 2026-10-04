import { NextRequest, NextResponse } from "next/server";

import { readSelectedCountry } from "@/lib/localization/country";
import { detectVisitorCountry } from "@/lib/localization/geo";
import { getLocalization } from "@/lib/shopify/localization";

/**
 * GET /api/localization — the countries/currencies Shopify Markets has
 * configured, the market Shopify uses for this visitor's edge-detected
 * country, and the country the visitor picked themselves (if any).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });

export async function GET(request: NextRequest) {
  try {
    const [localization, selected] = await Promise.all([
      getLocalization(detectVisitorCountry(request.headers)),
      readSelectedCountry(),
    ]);
    return json({
      defaultCountry: localization.defaultCountry,
      countries: localization.availableCountries,
      selected,
    });
  } catch {
    return json({ defaultCountry: null, countries: [], selected: null });
  }
}
