"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { BagContents } from "@/components/cart/BagContents";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/** Slide-in bag. A native <dialog> gives focus trapping, Escape and inertness for free. */
export function CartDrawer() {
  const { isOpen, close, count } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      lockScroll();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => close(), [pathname, close]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        unlockScroll();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-labelledby="bag-title"
      className="fixed inset-y-2 right-2 left-auto m-0 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[440px] rounded-[1.75rem] bg-paper p-0 text-ink shadow-lift ring-1 ring-line backdrop:bg-pine-950/45 backdrop:backdrop-blur-[3px] open:flex open:animate-[drawer-in_0.5s_var(--ease-out-soft)] open:flex-col"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 id="bag-title" className="flex items-center gap-2 font-display text-[1.35rem] leading-none outline-none" tabIndex={-1}>
          Your bag
          {count > 0 && (
            <span className="numeral grid min-w-6 place-items-center rounded-full bg-berry-600 px-1.5 font-sans text-[0.72rem] leading-6 font-bold text-snow">
              {count}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={close}
          className="grid size-9 place-items-center rounded-xl bg-cream ring-1 ring-line transition-colors hover:bg-linen"
          aria-label="Close bag"
        >
          <Icon name="close" className="size-4.5" />
        </button>
      </div>
      {isOpen && <BagContents onNavigate={close} />}
    </dialog>
  );
}
