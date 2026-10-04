"use client";

import { useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type AccordionItem = { title: string; body: ReactNode; defaultOpen?: boolean };

/**
 * Collapsible sections with a clear toggle: a round +/− button at the end of
 * each row, `aria-expanded` for assistive tech, and a smooth height change
 * (grid-rows 0fr → 1fr). Closed panels are `inert`, so nothing inside stays
 * focusable while hidden.
 */
export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState<boolean[]>(() => items.map((i) => Boolean(i.defaultOpen)));

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, i) => {
        const isOpen = open[i] ?? false;
        const panelId = `${id}-${i}`;
        return (
          <section key={item.title}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                className="flex min-h-13 w-full cursor-pointer items-center justify-between gap-4 py-2 text-left text-[0.92rem] font-semibold"
              >
                {item.title}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300",
                    isOpen ? "bg-berry-600 text-snow ring-berry-600" : "bg-cream text-ink-soft ring-line",
                  )}
                >
                  <Icon name={isOpen ? "minus" : "plus"} className="size-3.5" strokeWidth={2.2} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pb-5 text-[0.9rem] text-ink-soft">{item.body}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
