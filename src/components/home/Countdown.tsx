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

const SIZES = {
  lg: { cell: "min-w-[3.6rem] px-2 py-2 sm:min-w-[4.25rem] sm:py-2.5", num: "text-[1.7rem] sm:text-[2.1rem]", label: "text-[0.55rem]" },
  md: { cell: "min-w-[3.1rem] px-1.5 py-1.5 sm:min-w-[3.6rem] sm:py-2", num: "text-[1.35rem] sm:text-[1.65rem]", label: "text-[0.5rem]" },
  sm: { cell: "min-w-[2.6rem] px-1.5 py-1", num: "text-[1.05rem]", label: "text-[0.48rem]" },
} as const;

export function Countdown({
  endsAt,
  tone = "light",
  size = "lg",
  className,
}: {
  endsAt: string;
  tone?: "light" | "dark";
  size?: keyof typeof SIZES;
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
  const z = SIZES[size];

  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden="true">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className={cn(
            "flex flex-col items-center rounded-xl",
            z.cell,
            tone === "light" ? "bg-white/12 ring-1 ring-white/15" : "bg-surface text-ink shadow-soft ring-1 ring-line",
          )}
        >
          <span key={value} className={cn("numeral animate-[fade_0.4s_ease-out] leading-none font-medium", z.num)}>
            {value === undefined ? "--" : String(value).padStart(2, "0")}
          </span>
          <span className={cn("mt-1 font-bold tracking-[0.14em] uppercase opacity-65", z.label)}>{label}</span>
        </div>
      ))}
    </div>
  );
}
