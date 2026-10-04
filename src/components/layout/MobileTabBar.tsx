"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/components/cart/CartProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * App-style bottom tab bar for phones: thumb-reachable Home / Shop / Search /
 * Bag, sitting in the safe area. Hidden on product pages, where the sticky
 * add-to-bag bar owns the bottom of the screen.
 */
const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
  { href: "/shop", label: "Shop", icon: "tree", match: (p) => p.startsWith("/shop") },
  { href: "/search", label: "Search", icon: "search", match: (p) => p.startsWith("/search") },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { count, open, hydrated } = useCart();
  if (pathname.startsWith("/products/")) return null;

  const item = "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.62rem] font-semibold transition-colors";

  return (
    <>
      {/* Spacer so the footer is never hidden behind the bar */}
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-3 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30 lg:hidden"
      >
        <ul className="glass mx-auto flex max-w-md items-stretch gap-1 rounded-full p-1.5 shadow-lift ring-1 ring-line">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href} className="flex flex-1">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(item, active ? "bg-berry-600 text-snow shadow-ribbon" : "text-ink-soft active:bg-cream")}
                >
                  {active && <Icon name="sparkle" className="absolute top-0.5 right-[22%] size-2.5 animate-twinkle text-gold-300" />}
                  <Icon name={t.icon} className="size-5" />
                  {t.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button type="button" onClick={open} className={cn(item, "text-ink-soft active:bg-cream")}>
              <span className="relative">
                <Icon name="bag" className="size-5" />
                {hydrated && count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 grid min-w-4.5 animate-[pop_0.4s_var(--ease-spring)] place-items-center rounded-full bg-berry-600 px-1 text-[0.6rem] leading-[1.125rem] font-bold text-snow tabular-nums ring-2 ring-white">
                    {count}
                  </span>
                )}
              </span>
              Bag
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
