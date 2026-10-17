"use client";

import { useEffect } from "react";

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_DAYS,
  hasLandingSignal,
  pickAttribution,
  serializeAttribution,
} from "@/lib/attribution";

/**
 * Saves every query param of an ad landing URL, so they survive internal navigation and reach
 * checkout. A visit with UTMs / a click id replaces the old set (last paid click wins); a visit
 * without them (e.g. a plain ?variant= link) leaves it alone.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!hasLandingSignal(params)) return;
      const found = pickAttribution(params);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ATTRIBUTION_COOKIE}=${serializeAttribution(found)}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;
    } catch {
      /* attribution must never break the page */
    }
  }, []);
  return null;
}
