"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

function remaining(target: number) {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    totalHours: total / 3600,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** The line above the digits gets more urgent as the deadline nears. */
function headline(totalHours: number): string {
  if (totalHours <= 3) return "Final hours! Offer ends in";
  if (totalHours <= 24) return "Last day! Offer ends in";
  return "Hurry! Offer ends in";
}

/**
 * Offer countdown — only ever shows a deadline the merchant set in Shopify (the
 * product's "Offer ends at" metafield, `custom.sale_ends_at`; the catalog sync
 * already drops past dates) and hides itself the moment that passes, rather than
 * freezing at 00:00:00.
 *
 * The big digits are hours : minutes : seconds (they tick, so they create the
 * urgency); the days are a small pill beside them. The wording above gets more
 * pressing as the end nears ("Hurry!" → "Last day!" → "Final hours!").
 *
 * Starts empty on the server and on the client's first paint (the time left
 * depends on the visitor's clock, which a cached page can't know) and fills in
 * from an effect, which avoids a hydration mismatch. On phones it is a full-width
 * bar under the shipping strip; from `sm` a two-line box beside it. `compact` is
 * a one-line version for the bag.
 */
export function SaleCountdown({ endsAt, compact = false, variant = "box" }: { endsAt: string; compact?: boolean; variant?: "box" | "banner" | "strip" }) {
  const target = Date.parse(endsAt);
  const [left, setLeft] = useState<ReturnType<typeof remaining>>(null);

  useEffect(() => {
    setLeft(remaining(target));
    const id = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!left) return null;

  const clock = [left.hours, left.minutes, left.seconds];
  const label = headline(left.totalHours);
  const digits = (
    <span className="numeral flex items-center gap-0.5 font-bold tabular-nums" aria-hidden="true">
      {clock.map((v, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="opacity-60">:</span>}
          <span className="min-w-5 text-center">{pad(v)}</span>
        </span>
      ))}
    </span>
  );
  const spoken = (
    <span className="sr-only">
      Offer ends in {left.days > 0 ? `${left.days} days ` : ""}
      {left.hours} hours {left.minutes} minutes
    </span>
  );

  if (compact) {
    return (
      <div className="flex" role="timer" aria-live="off">
        {/* Icon + days + digits only, so it stays small enough to sit under a badge. */}
        <p className="inline-flex items-center gap-1 text-[0.7rem] leading-tight font-semibold whitespace-nowrap text-berry-600" title={label}>
          <Icon name="hourglass" className="size-3.5 shrink-0" />
          {left.days > 0 && <span className="text-[0.64rem] font-bold">{left.days}d</span>}
          <span className="text-[0.74rem]">{digits}</span>
        </p>
        {spoken}
      </div>
    );
  }

  if (variant === "strip") {
    // A full-width strip right under the navbar at the top of the product page (the top announcement bar is
    // hidden there), so the deadline is the first thing seen. Same layout as HimVolt's: clock, "Offer ends in",
    // then the digits in small boxes. Screen readers get one plain sentence instead of the ticking digits.
    return (
      <div className="bg-berry-600 text-snow" role="timer" aria-live="off">
        <p className="container-page flex items-center justify-center gap-3 py-2.5 text-[0.9rem] font-medium">
          <Icon name="clock" className="size-4 shrink-0" />
          <span>Offer ends in</span>
          <span className="numeral flex items-center gap-1 font-semibold tabular-nums" aria-hidden="true">
            {/* Days are not shown: the hours run past 24 instead (HH:MM:SS), as asked.
            {left.days > 0 && <span>{left.days}d</span>} */}
            {[Math.floor(left.totalHours), left.minutes, left.seconds].map((v, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="opacity-70">:</span>}
                <span className="min-w-8 rounded-md bg-snow/15 px-1.5 py-0.5 text-center">{pad(v)}</span>
              </span>
            ))}
          </span>
          {spoken}
        </p>
      </div>
    );
  }

  if (variant === "banner") {
    // Inline, for the announcement bar at the very top of every page.
    return (
      <span className="inline-flex items-center gap-1.5" role="timer" aria-live="off">
        <span className="opacity-60">·</span>
        <Icon name="hourglass" className="size-3.5 shrink-0 text-gold-300" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Ends in</span>
        <span className="font-bold text-gold-200">
          {left.days > 0 && <span className="mr-1">{left.days}d</span>}
          <span className="tabular-nums" aria-hidden="true">
            {clock.map(pad).join(":")}
          </span>
        </span>
        {spoken}
      </span>
    );
  }

  // The box above the Add to bag button counts plain hours too (HH:MM:SS), with no days pill.
  const hoursDigits = (
    <span className="numeral flex items-center gap-0.5 font-bold tabular-nums" aria-hidden="true">
      {[Math.floor(left.totalHours), left.minutes, left.seconds].map((v, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="opacity-60">:</span>}
          <span className="min-w-5 text-center">{pad(v)}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="w-full sm:flex sm:w-auto sm:shrink-0" role="timer" aria-live="off">
      <p
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-berry-200 bg-berry-50 px-3 py-2 text-[0.78rem] font-semibold whitespace-nowrap text-berry-600",
          "sm:w-auto sm:flex-col sm:items-start sm:justify-center sm:gap-1 sm:py-1.5",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="clock" className="size-4 shrink-0 motion-safe:animate-[free-pop_1.2s_ease-in-out_infinite]" />
          <span>{label}</span>
        </span>
        <span className="inline-flex items-center gap-2 sm:pl-6">
          {/* No days pill here: the hours run past 24 instead (HH:MM:SS). */}
          <span className="text-[0.95rem]">{hoursDigits}</span>
        </span>
      </p>
      {spoken}
    </div>
  );
}
