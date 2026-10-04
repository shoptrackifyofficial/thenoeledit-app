"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import type { MenuCategory, MenuData } from "@/lib/commerce/views";
import { formatMoney } from "@/lib/money";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";

/**
 * Header chrome: a floating glass pill.
 *  - Home: fixed and fully transparent over the full-height hero (white type,
 *    no announcement bar), so the hero and nav read as one surface. After a
 *    little scroll it firms up into the white pill.
 *  - Everywhere else: sticky pill under an announcement bar that scrolls away.
 * The decision comes from the pathname, which the server also knows, so
 * there is no flash or hydration mismatch.
 */
export function HeaderShell({ announcement, children }: { announcement: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "z-40 w-full",
        isHome ? "fixed inset-x-0 top-0" : "sticky top-[calc(-1*var(--announce-h))]",
      )}
    >
      {!isHome && announcement}
      {isHome && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-pine-950/55 to-transparent transition-opacity duration-500",
            scrolled && "opacity-0",
          )}
        />
      )}
      <div className="px-2 pt-2 sm:px-4">
        <div
          data-scrolled={scrolled}
          data-over-hero={isHome && !scrolled}
          className="header-pill group/header relative mx-auto grid h-(--header-h) max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full bg-white/65 px-1.5 shadow-[0_0_0_1px_rgb(239_226_217/0.7)] backdrop-blur-xl backdrop-saturate-150 sm:px-3"
        >
          {children}
        </div>
      </div>
    </header>
  );
}

/* ── Desktop: Shop → Category → Products mega menu ─────────────────────── */

export function DesktopNav({ menu }: { menu: MenuData }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const pathname = usePathname();
  const id = useId();
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById(`${id}-trigger`)?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open, id]);

  const enter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  const category = menu.categories[active];
  const quick = menu.categories.slice(0, 3);

  return (
    <div ref={wrapRef} className="hidden h-full items-center lg:flex" onPointerLeave={leave}>
      <nav aria-label="Main" className="flex h-full items-center">
        <ul className="flex h-full items-center gap-0.5 text-[0.86rem] font-semibold">
          <li className="flex h-full items-center" onPointerEnter={enter}>
            <button
              id={`${id}-trigger`}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-panel`}
              onClick={() => setOpen((o) => !o)}
              className="flex h-10 items-center gap-1.5 rounded-full px-4 transition-colors hover:bg-berry-50 hover:text-berry-700 aria-expanded:bg-berry-50 aria-expanded:text-berry-700"
            >
              Shop
              <Icon
                name="chevron-down"
                className={cn("size-3.5 transition-transform duration-300", open && "-rotate-180")}
                strokeWidth={2}
              />
            </button>
          </li>
          {quick.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className="flex h-10 items-center rounded-full px-4 transition-colors hover:bg-berry-50 hover:text-berry-700">
                {c.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/shop?budget=50" className="flex h-10 items-center gap-1.5 rounded-full px-4 text-berry-600 transition-colors group-data-[over-hero=true]/header:text-gold-300 hover:bg-berry-50 hover:text-berry-600">
              <Icon name="sparkle" className="size-3.5 animate-twinkle text-gold-500" />
              Under $50
            </Link>
          </li>
        </ul>
      </nav>

      <div
        id={`${id}-panel`}
        hidden={!open}
        onPointerEnter={enter}
        className="absolute inset-x-0 top-full z-40 pt-3"
      >
        <div className="mega-in mx-auto grid grid-cols-[250px_1fr_280px] overflow-hidden rounded-[1.75rem] bg-white text-ink shadow-lift ring-1 ring-line">
          {/* Categories */}
          <ul className="flex flex-col gap-0.5 border-r border-line bg-cream/70 p-3">
            <li className="kicker px-3 pt-2 pb-3">Shop by category</li>
            {menu.categories.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={c.href}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors",
                    i === active ? "bg-white shadow-soft" : "hover:bg-white/60",
                  )}
                >
                  <span>
                    <span className="block font-display text-[1.08rem] leading-tight">{c.title}</span>
                    <span className="block text-[0.72rem] text-ink-soft">{c.count} {c.count === 1 ? "gift" : "gifts"}</span>
                  </span>
                  <Icon
                    name="chevron-right"
                    className={cn("size-4 transition-transform", i === active ? "translate-x-0.5 text-berry-600" : "text-ink-faint")}
                  />
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line px-3 pt-3 pb-1">
              <Link href="/shop" className="group/link inline-flex items-center gap-2 text-[0.85rem] font-semibold">
                Browse every gift
                <Icon name="arrow-right" className="size-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </li>
          </ul>

          {/* Products in the active category */}
          {category && (
            <div className="p-6" key={category.slug}>
              <div className="flex items-baseline justify-between">
                <p className="display-md">{category.title}</p>
                <Link href={category.href} className="link-underline text-[0.8rem] font-semibold">
                  View all {category.count}
                </Link>
              </div>
              <ul className="mt-5 grid grid-cols-3 gap-4">
                {category.products.map((p) => (
                  <li key={p.href} className="mega-in">
                    <Link href={p.href} className="group block">
                      <span className="relative block aspect-square overflow-hidden rounded-2xl bg-cream">
                        {p.image && (
                          <Image
                            src={p.image}
                            alt=""
                            fill
                            sizes="180px"
                            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-105"
                          />
                        )}
                      </span>
                      <span className="mt-2 block truncate text-[0.85rem] font-semibold">{p.name}</span>
                      <span className="flex gap-1.5 text-[0.82rem] font-semibold tabular-nums">
                        <span className={p.compareAtPrice ? "text-berry-600" : ""}>{formatMoney(p.price, menu.currency)}</span>
                        {p.compareAtPrice && <s className="font-normal text-ink-faint">{formatMoney(p.compareAtPrice, menu.currency)}</s>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Promo */}
          {category && (
            <Link href={category.href} className="group relative m-3 overflow-hidden rounded-2xl bg-pine-900 text-snow">
              <Image
                src={category.image}
                alt=""
                fill
                sizes="300px"
                className="object-cover opacity-70 transition-transform duration-1000 ease-out-soft group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-linear-to-t from-pine-950/90 via-pine-950/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="kicker text-gold-300">Gift edit</span>
                <span className="mt-1 block font-display text-[1.6rem] leading-none">{category.title}</span>
                <span className="mt-1 block text-[0.8rem] text-snow/80">{category.kicker}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
                  Shop now <Icon name="arrow-right" className="size-4" />
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile: drill-down sheet (Shop → Category → Products) ─────────────── */

export function MobileMenu({ menu, accountUrl }: { menu: MenuData; accountUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<MenuCategory | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      lockScroll();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLevel(null);
          setOpen(true);
        }}
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-berry-50 lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Icon name="menu" />
      </button>
      <dialog
        ref={ref}
        onClose={() => {
          unlockScroll();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        aria-label="Menu"
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[92%] max-w-[400px] rounded-r-[1.75rem] bg-paper p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-[3px] open:flex open:animate-[sheet-in_0.45s_var(--ease-out-soft)] open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          {level ? (
            <button
              type="button"
              onClick={() => setLevel(null)}
              className="flex h-11 items-center gap-1.5 pr-3 text-[0.8rem] font-bold tracking-[0.14em] uppercase"
            >
              <Icon name="chevron-left" className="size-4" /> All categories
            </button>
          ) : (
            <span className="flex items-center gap-2.5">
              <Image src="/logo-200.webp" alt="" width={40} height={40} className="size-10" />
              <span className="font-display text-[1.2rem]">The Noel Edit</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-11 place-items-center rounded-full hover:bg-cream"
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* Level 0 — categories */}
          <div
            className={cn(
              "absolute inset-0 overflow-y-auto px-4 pt-5 pb-8 transition-transform duration-500 ease-out-soft",
              level && "-translate-x-full",
            )}
            inert={Boolean(level)}
          >
            <Link href="/shop" className="relative mb-6 block overflow-hidden rounded-[1.4rem] bg-berry-600 p-5 text-snow shadow-ribbon">
              <span className="kicker text-gold-300">The Christmas sale</span>
              <span className="mt-1 block font-display text-[1.6rem] leading-tight">
                Up to <span className="accent">40% off</span>
              </span>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
                Shop all gifts <Icon name="arrow-right" className="size-4" />
              </span>
              <Icon name="snowflake" className="absolute -top-4 -right-4 size-28 text-snow/10" strokeWidth={1} />
            </Link>
            <p className="kicker mb-2">Shop by category</p>
            <ul className="divide-y divide-line">
              {menu.categories.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => setLevel(c)}
                    className="flex w-full items-center gap-4 py-3 text-left"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-cream shadow-soft ring-2 ring-white">
                      <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[1.15rem] leading-tight">{c.title}</span>
                      <span className="block truncate text-[0.78rem] text-ink-soft">{c.kicker}</span>
                    </span>
                    <Icon name="chevron-right" className="size-4 text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-[0.85rem] font-semibold">
              <li>
                <Link href="/shop?budget=25" className="flex h-11 items-center justify-center rounded-full bg-berry-50 text-berry-700">Under $25</Link>
              </li>
              <li>
                <Link href="/shop?budget=50" className="flex h-11 items-center justify-center rounded-full bg-berry-50 text-berry-700">Under $50</Link>
              </li>
              <li>
                <Link href="/search" className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white">
                  <Icon name="search" className="size-4" /> Search
                </Link>
              </li>
              <li>
                {accountUrl ? (
                  <a href={accountUrl} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white">
                    <Icon name="user" className="size-4" /> Account
                  </a>
                ) : (
                  <Link href="/pages/contact" className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white">
                    <Icon name="mail" className="size-4" /> Contact
                  </Link>
                )}
              </li>
            </ul>
            <ul className="mt-6 space-y-3 text-[0.9rem] text-ink-soft">
              <li><Link href="/pages/shipping">Delivery</Link></li>
              <li><Link href="/pages/returns">Returns & exchanges</Link></li>
              <li><Link href="/pages/faq">Help & FAQ</Link></li>
            </ul>
          </div>

          {/* Level 1 — products in the chosen category */}
          <div
            className={cn(
              "absolute inset-0 overflow-y-auto px-4 pt-5 pb-8 transition-transform duration-500 ease-out-soft",
              level ? "translate-x-0" : "translate-x-full",
            )}
            inert={!level}
          >
            {level && (
              <>
                <p className="display-md">{level.title}</p>
                <p className="mt-1 text-[0.85rem] text-ink-soft">{level.kicker}</p>
                <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
                  {level.products.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} className="block">
                        <span className="relative block aspect-square overflow-hidden rounded-2xl bg-cream">
                          {p.image && <Image src={p.image} alt="" fill sizes="45vw" className="object-cover" />}
                        </span>
                        <span className="mt-2 block text-[0.85rem] leading-snug font-semibold">{p.name}</span>
                        <span className="flex gap-1.5 text-[0.82rem] font-semibold tabular-nums">
                          <span className={p.compareAtPrice ? "text-berry-600" : ""}>{formatMoney(p.price, menu.currency)}</span>
                          {p.compareAtPrice && <s className="font-normal text-ink-faint">{formatMoney(p.compareAtPrice, menu.currency)}</s>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={level.href} className="btn btn-primary mt-7 w-full">
                  Shop all {level.title}
                </Link>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

export function BagButton() {
  const { count, open, hydrated } = useCart();
  return (
    <button
      type="button"
      onClick={open}
      className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-berry-50"
      aria-label={hydrated && count > 0 ? `Open bag, ${count} item${count === 1 ? "" : "s"}` : "Open bag"}
    >
      <Icon name="bag" />
      {hydrated && count > 0 && (
        <span className="absolute top-1 right-0.5 grid min-w-5 animate-[pop_0.4s_var(--ease-spring)] place-items-center rounded-full bg-berry-600 px-1 text-[0.66rem] leading-5 font-bold text-snow tabular-nums ring-2 ring-white">
          {count}
        </span>
      )}
    </button>
  );
}
