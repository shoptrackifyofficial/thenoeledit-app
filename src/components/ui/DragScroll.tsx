"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Horizontal rail that scrolls natively on touch and trackpads, and can also
 * be dragged with a mouse. While a mouse drag is in progress snapping is
 * paused (so the rail follows the pointer 1:1, no jitter) and the click that
 * ends a drag is swallowed, so letting go over a card never opens it.
 */
export function DragScroll({
  children,
  className,
  label,
  centerOnDesktop = false,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  /** On desktop, open the rail scrolled to its middle; phones always start at the first card. */
  centerOnDesktop?: boolean;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, left: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !centerOnDesktop) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const place = () => {
      el.scrollLeft = mq.matches ? (el.scrollWidth - el.clientWidth) / 2 : 0;
    };
    place();
    mq.addEventListener("change", place);
    return () => mq.removeEventListener("change", place);
  }, [centerOnDesktop]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { active: true, moved: false, x: e.clientX, left: el.scrollLeft };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    const d = drag.current;
    if (!el || !d.active) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      el.dataset.dragging = "true";
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };

  const end = (e: React.PointerEvent) => {
    const el = ref.current;
    const d = drag.current;
    if (!el || !d.active) return;
    d.active = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Let the browser re-snap smoothly from where the drag stopped.
    delete el.dataset.dragging;
  };

  return (
    <ul
      ref={ref}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={(e) => {
        if (drag.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          drag.current.moved = false;
        }
      }}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "drag-rail scrollbar-none flex snap-x snap-proximity overflow-x-auto overscroll-x-contain select-none md:cursor-grab",
        className,
      )}
    >
      {children}
    </ul>
  );
}
