"use client";

import { useEffect } from "react";

import { onIdle } from "@/lib/defer";

/** Module-level so React 19 StrictMode's double-effect can't init twice. */
let started = false;

/**
 * Microsoft Clarity — heatmaps and session replay. Imported dynamically and
 * started only once the page is idle, so it never competes with first paint.
 * Runs only in the browser, and only when NEXT_PUBLIC_CLARITY_PROJECT_ID is
 * set, so local runs and previews
 * without the id stay out of the production project's data.
 */
export function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  useEffect(() => {
    if (!projectId || started) return;
    started = true;
    // Session replay is the heaviest script on the page and none of it
    // matters before the visitor can interact: hold both the chunk and its
    // init off the load window.
    return onIdle(() => {
      void import("@microsoft/clarity").then(({ default: Clarity }) =>
        Clarity.init(projectId),
      );
    });
  }, [projectId]);

  return null;
}
