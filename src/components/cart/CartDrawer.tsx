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
      aria-label="Your bag"
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[94%] max-w-[420px] rounded-l-[1.75rem] bg-paper p-0 text-ink shadow-lift backdrop:bg-pine-950/45 backdrop:backdrop-blur-[3px] open:flex open:animate-[drawer-in_0.5s_var(--ease-out-soft)] open:flex-col"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="display-md">
          Your bag{" "}
          {count > 0 && <span className="ml-1 inline-grid min-w-6 place-items-center rounded-full bg-berry-600 px-1.5 align-middle font-sans text-[0.72rem] leading-6 font-bold text-snow">{count}</span>}
        </p>
        <button
          type="button"
          onClick={close}
          className="grid size-11 place-items-center rounded-full hover:bg-cream"
          aria-label="Close bag"
        >
          <Icon name="close" />
        </button>
      </div>
      {isOpen && <BagContents onNavigate={close} />}
    </dialog>
  );
}
