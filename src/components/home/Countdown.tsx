"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Live countdown to a real deadline. Server HTML renders fixed-width "--"
 * cells (no layout shift, no hydration mismatch); the numbers arrive on mount
 * and tick once a second. Announces nothing — it is decorative urgency, and
 * the deadline itself is stated in text next to it.
 */
function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({
  endsAt,
  tone = "light",
  size = "lg",
  className,
}: {
  endsAt: string;
  tone?: "light" | "dark";
  size?: "lg" | "sm";
  className?: string;
}) {
  const [left, setLeft] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    const end = Date.parse(endsAt);
    const tick = () => setLeft(parts(end - Date.now()));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [endsAt]);

  const cells: [string, number | undefined][] = [
    ["Days", left?.d],
    ["Hrs", left?.h],
    ["Min", left?.m],
    ["Sec", left?.s],
  ];

  return (
    <div className={cn("flex items-start gap-1.5 sm:gap-2", className)} aria-hidden="true">
      {cells.map(([label, value], i) => (
        <div key={label} className="flex items-start gap-1.5 sm:gap-2">
          <div
            className={cn(
              "flex flex-col items-center rounded-xl",
              size === "lg" ? "min-w-[3.6rem] px-2 py-2 sm:min-w-[4.25rem] sm:py-2.5" : "min-w-[2.6rem] px-1.5 py-1",
              tone === "light" ? "bg-snow/10 ring-1 ring-snow/20 backdrop-blur-md" : "bg-pine-900 text-snow",
            )}
          >
            <span
              className={cn(
                "numeral leading-none font-medium",
                size === "lg" ? "text-[1.7rem] sm:text-[2.1rem]" : "text-[1.05rem]",
              )}
            >
              {value === undefined ? "--" : String(value).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "mt-1 font-bold tracking-[0.16em] uppercase opacity-70",
                size === "lg" ? "text-[0.55rem]" : "text-[0.48rem]",
              )}
            >
              {label}
            </span>
          </div>
          {i < cells.length - 1 && (
            <span className={cn("numeral opacity-50", size === "lg" ? "pt-2 text-[1.4rem]" : "pt-0.5 text-[0.9rem]")}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
