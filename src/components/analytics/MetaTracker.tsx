"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { getExternalId, trackContact, trackPageView } from "@/lib/analytics";

/**
 * Site-wide Meta signals: a PageView on every client-side navigation (Next
 * swaps pages without a reload, so the Pixel would otherwise count only the
 * landing page), and a Contact event when someone taps an email link.
 */
export function MetaTracker() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === pathname) return; // one PageView per navigation, even under React dev double-effects
    sent.current = pathname;
    getExternalId();
    trackPageView();
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="mailto:"]');
      if (link) trackContact("email");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
