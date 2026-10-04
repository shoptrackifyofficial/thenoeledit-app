"use client";

import { useEffect } from "react";

/**
 * Makes casual copying and inspecting harder on the live site: no right-click
 * menu, no text selection / copy / drag, and the usual developer-tools and
 * view-source shortcuts are swallowed. Form fields keep working normally.
 *
 * This is a deterrent, not security — anyone determined can still read a web
 * page (browser menus, view-source:, the network tab, a scraper). It is on
 * everywhere, development included; set NEXT_PUBLIC_ALLOW_INSPECT=1 in .env
 * (and restart) to switch it off while you are working on the site.
 */
const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && Boolean(t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));

export function ContentGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ALLOW_INSPECT === "1") return;

    const block = (e: Event) => {
      if (!editable(e.target)) e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const devtools = e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) || (e.metaKey && e.altKey && ["i", "j", "c"].includes(k));
      const source = mod && ["u", "s"].includes(k);
      if ((devtools || source) && !editable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      } else if (devtools || source) {
        // Even inside a field these should not open the tools.
        e.preventDefault();
      }
    };

    const events = ["contextmenu", "selectstart", "copy", "cut", "dragstart"] as const;
    events.forEach((name) => document.addEventListener(name, block));
    document.addEventListener("keydown", keys, true);
    return () => {
      events.forEach((name) => document.removeEventListener(name, block));
      document.removeEventListener("keydown", keys, true);
    };
  }, []);

  return null;
}
