"use client";

import { Icon } from "@/components/ui/Icon";
import type { ProductStory } from "@/lib/catalog/types";

/**
 * "What's in the box": what comes with the product (ticks) and what is sold
 * separately (clearly marked), so nobody assumes an optional extra is included.
 */
/** Scrolls to the add-on picker and blinks it once, so the shopper sees where to add the extra. */
function showExtras() {
  const el = document.getElementById("ribbon-picker");
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  const box = el.firstElementChild?.nextElementSibling ?? el;
  box.classList.remove("flash-ring");
  void (box as HTMLElement).offsetWidth; // restart the animation on repeat clicks
  box.classList.add("flash-ring");
  window.setTimeout(() => box.classList.remove("flash-ring"), 2200);
}

export function BoxContents({ box }: { box: NonNullable<ProductStory["box"]> }) {
  return (
    <section aria-label="What's in the box" className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line">
      <h3 className="text-[0.66rem] font-bold tracking-[0.14em] text-ink-soft uppercase">In the box</h3>
      <ul className="mt-2.5 grid gap-x-4 gap-y-1.5 text-[0.86rem] sm:grid-cols-2">
        {box.included.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-pine-600 text-snow">
              <Icon name="check" className="size-3" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
      {box.separate.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-dashed border-line pt-3 text-[0.84rem] text-ink-soft">
          {box.separate.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700 ring-1 ring-gold-300">
                <Icon name="plus" className="size-3" strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span>{item}</span>
                <button
                  type="button"
                  onClick={showExtras}
                  className="group inline-flex items-center gap-1 rounded-full bg-berry-50 px-2.5 py-1 text-[0.72rem] leading-none font-semibold text-berry-700 ring-1 ring-berry-100 transition-colors hover:bg-berry-600 hover:text-snow hover:ring-berry-600"
                >
                  Sold separately
                  <Icon name="arrow-right" className="size-3 rotate-90 transition-transform group-hover:translate-y-0.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
