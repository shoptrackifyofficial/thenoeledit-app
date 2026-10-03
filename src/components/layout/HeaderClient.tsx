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
 * Header chrome. On the home page the bar is fixed and transparent over the
 * full-height hero (white type on a soft scrim) and turns into the paper glass
 * bar once the page scrolls; everywhere else it is the sticky glass bar from
 * the first paint. The decision is made from the pathname, which the server
 * also knows — so there is no flash or hydration mismatch.
 */
export function HeaderShell({ announcement, children }: { announcement: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const overHero = isHome && !scrolled;

  return (
    <header
      data-home={isHome}
      className={cn("z-40 w-full", isHome ? "fixed inset-x-0 top-0" : "sticky top-0")}
    >
      {!isHome && announcement}
      <div data-over-hero={overHero} className="header-shell relative isolate">
        <div className="container-page grid h-(--header-h) grid-cols-[1fr_auto_1fr] items-center gap-2">
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
        <ul className="flex h-full items-center gap-1 text-[0.82rem] font-semibold tracking-[0.12em] uppercase">
          <li className="flex h-full items-center" onPointerEnter={enter}>
            <button
              id={`${id}-trigger`}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-panel`}
              onClick={() => setOpen((o) => !o)}
              className="flex h-11 items-center gap-1.5 rounded-full px-4 transition-colors hover:bg-current/8"
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
              <Link href={c.href} className="flex h-11 items-center rounded-full px-4 transition-colors hover:bg-current/8">
                {c.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/shop?budget=50" className="flex h-11 items-center gap-1.5 rounded-full px-4 transition-colors hover:bg-current/8">
              <Icon name="sparkle" className="size-3.5 text-gold-500" />
              Under $50
            </Link>
          </li>
        </ul>
      </nav>

      <div
        id={`${id}-panel`}
        hidden={!open}
        onPointerEnter={enter}
        className="absolute inset-x-0 top-full z-40 px-4 pt-2 lg:px-10"
      >
        <div className="mega-in mx-auto grid max-w-[1360px] grid-cols-[260px_1fr_300px] overflow-hidden rounded-[1.75rem] bg-paper text-ink shadow-lift ring-1 ring-line">
          {/* Categories */}
          <ul className="flex flex-col gap-0.5 border-r border-line bg-cream/60 p-3">
            <li className="px-3 pt-2 pb-3 eyebrow text-gold-700">Shop by category</li>
            {menu.categories.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={c.href}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors",
                    i === active ? "bg-paper shadow-soft" : "hover:bg-paper/60",
                  )}
                >
                  <span>
                    <span className="block font-display text-[1.15rem] leading-tight">{c.title}</span>
                    <span className="block text-[0.72rem] text-ink-soft">{c.count} gifts</span>
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
                      <span className="numeral flex gap-1.5 text-[0.85rem]">
                        <span className={p.compareAtPrice ? "text-berry-600" : ""}>{formatMoney(p.price, menu.currency)}</span>
                        {p.compareAtPrice && <s className="text-ink-faint">{formatMoney(p.compareAtPrice, menu.currency)}</s>}
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
                <span className="script block text-[2rem] text-gold-300">Gifts</span>
                <span className="block font-display text-[1.6rem] leading-none">{category.title}</span>
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
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-current/8 lg:hidden"
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
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-full max-w-[420px] bg-paper p-0 text-ink backdrop:bg-pine-950/50 open:flex open:animate-[sheet-in_0.45s_var(--ease-out-soft)] open:flex-col"
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
            <span className="font-display text-[1.3rem]">The Noel Edit</span>
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
            <Link href="/shop" className="relative mb-5 block overflow-hidden rounded-2xl bg-berry-700 p-5 text-snow">
              <span className="script block text-[2.2rem] leading-none text-gold-300">Christmas</span>
              <span className="block font-display text-[1.7rem] leading-tight">Sale — up to 40% off</span>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
                Shop all gifts <Icon name="arrow-right" className="size-4" />
              </span>
              <Icon name="snowflake" className="absolute -top-4 -right-4 size-28 text-snow/10" strokeWidth={1} />
            </Link>
            <p className="eyebrow mb-2 text-gold-700">Shop by category</p>
            <ul className="divide-y divide-line">
              {menu.categories.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => setLevel(c)}
                    className="flex w-full items-center gap-4 py-3 text-left"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-[1.1rem_1.1rem_0.5rem_0.5rem] bg-cream">
                      <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[1.25rem] leading-tight">{c.title}</span>
                      <span className="block truncate text-[0.78rem] text-ink-soft">{c.kicker}</span>
                    </span>
                    <Icon name="chevron-right" className="size-4 text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-[0.85rem] font-semibold">
              <li>
                <Link href="/shop?budget=25" className="flex h-12 items-center justify-center rounded-xl bg-cream">Under $25</Link>
              </li>
              <li>
                <Link href="/shop?budget=50" className="flex h-12 items-center justify-center rounded-xl bg-cream">Under $50</Link>
              </li>
              <li>
                <Link href="/search" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line">
                  <Icon name="search" className="size-4" /> Search
                </Link>
              </li>
              <li>
                {accountUrl ? (
                  <a href={accountUrl} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line">
                    <Icon name="user" className="size-4" /> Account
                  </a>
                ) : (
                  <Link href="/pages/contact" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line">
                    <Icon name="mail" className="size-4" /> Contact
                  </Link>
                )}
              </li>
            </ul>
            <ul className="mt-6 space-y-3 text-[0.9rem] text-ink-soft">
              <li><Link href="/pages/shipping">Christmas delivery dates</Link></li>
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
                        <span className="numeral flex gap-1.5 text-[0.85rem]">
                          <span className={p.compareAtPrice ? "text-berry-600" : ""}>{formatMoney(p.price, menu.currency)}</span>
                          {p.compareAtPrice && <s className="text-ink-faint">{formatMoney(p.compareAtPrice, menu.currency)}</s>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={level.href} className="btn btn-dark mt-7 w-full">
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
      className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-current/8"
      aria-label={hydrated && count > 0 ? `Open bag, ${count} item${count === 1 ? "" : "s"}` : "Open bag"}
    >
      <Icon name="bag" />
      {hydrated && count > 0 && (
        <span className="numeral absolute top-1 right-0.5 grid min-w-5 animate-[pop_0.4s_var(--ease-spring)] place-items-center rounded-full bg-berry-600 px-1 text-[0.68rem] leading-5 font-bold text-snow">
          {count}
        </span>
      )}
    </button>
  );
}
