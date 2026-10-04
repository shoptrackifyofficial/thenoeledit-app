import Image from "next/image";
import Link from "next/link";

import { SnowCap, SnowDrift } from "@/components/decor/NightScene";
import { NewsletterForm } from "@/components/content/NewsletterForm";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";
import { getCategories } from "@/lib/catalog";

export async function Footer() {
  const categories = await getCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="px-2 pb-2 sm:px-4 sm:pb-4">
      <SnowDrift />
      <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-[1.75rem] bg-pine-950 text-pine-100 sm:rounded-[2.25rem]">
        <SnowCap />
        <div aria-hidden="true" className="absolute -top-48 -right-24 size-[30rem] rounded-full bg-berry-600/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-gold-500/10 blur-3xl" />

        {/* Newsletter band */}
        <div className="relative container-page pt-10 lg:pt-14">
          <div className="grid items-center gap-5 rounded-[1.5rem] bg-white/[0.04] p-5 text-center ring-1 ring-white/10 sm:p-7 lg:grid-cols-[auto_1fr_minmax(0,26rem)] lg:gap-10 lg:text-left">
            <span className="hidden size-20 rounded-full bg-snow p-1 shadow-lift lg:block">
              <Image src="/logo-200.webp" alt="" width={200} height={200} sizes="80px" className="size-full" />
            </span>
            <div>
              <p className="kicker text-gold-300">Stay merry</p>
              <p className="display-md mt-2 text-snow">
                Early access to <span className="accent text-gold-300">every drop.</span>
              </p>
              <p className="mt-1.5 max-w-md text-[0.86rem] text-pine-200/80">
                Last-minute deals and delivery reminders — a few emails a season, never more.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>

        <div className="relative container-page grid grid-cols-2 gap-x-6 gap-y-10 pt-10 pb-8 lg:pt-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div className="col-span-2 mx-auto flex max-w-sm flex-col items-center text-center lg:col-span-1 lg:mx-0 lg:items-start lg:text-left">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo-200.webp" alt="" width={200} height={200} sizes="56px" className="size-14 rounded-full bg-snow p-0.5" />
              <span className="font-display text-[1.4rem] text-snow">{site.name}</span>
            </Link>
            <p className="mt-4 text-[0.86rem] leading-relaxed text-pine-200/80">{site.tagline} Hand-picked gifts, wrapped free and delivered before Christmas.</p>
            <ul className="mt-5 flex gap-2">
              {(["instagram", "tiktok", "pinterest"] as const).map((s) => (
                <li key={s}>
                  <a
                    href={site.social[s]}
                    rel="noopener noreferrer"
                    target="_blank"
                    aria-label={`${site.name} on ${s}`}
                    className="grid size-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/15 transition-[background-color,color,transform] duration-300 hover:-translate-y-0.5 hover:bg-berry-600 hover:text-snow"
                  >
                    <Icon name={s} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Shop">
            <p className="eyebrow text-gold-300">Shop</p>
            <ul className="mt-4 space-y-2 text-[0.88rem]">
              <li><Link href="/shop" className="transition-colors hover:text-snow">All gifts</Link></li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop/${c.slug}`} className="transition-colors hover:text-snow">{c.title}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help">
            <p className="eyebrow text-gold-300">Help</p>
            <ul className="mt-4 space-y-2 text-[0.88rem]">
              <li><Link href="/pages/shipping" className="transition-colors hover:text-snow">Delivery</Link></li>
              <li><Link href="/pages/returns" className="transition-colors hover:text-snow">Returns & exchanges</Link></li>
              <li><Link href="/pages/faq" className="transition-colors hover:text-snow">FAQ</Link></li>
              <li><Link href="/pages/contact" className="transition-colors hover:text-snow">Contact us</Link></li>
            </ul>
          </nav>

          <div className="col-span-2 lg:col-span-1">
            <p className="eyebrow text-gold-300">Our promise</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.84rem] lg:grid-cols-1">
              {site.promises.map((p) => (
                <li key={p.title} className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/5 text-gold-300 ring-1 ring-white/10">
                    <Icon name={p.icon} className="size-4" />
                  </span>
                  {p.title}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="pointer-events-none relative container-page bg-linear-to-b from-gold-300/25 to-transparent bg-clip-text font-display text-[clamp(3.2rem,13vw,12rem)] leading-[0.85] tracking-[-0.04em] whitespace-nowrap text-transparent select-none"
        >
          The <span className="italic">Noel</span> Edit
        </p>

        <div className="relative border-t border-white/10">
          <div className="container-page flex flex-col items-center gap-2 py-5 text-[0.75rem] text-pine-300 sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} {site.name}. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <Icon name="lock" className="size-3.5" /> Secure checkout powered by Shopify
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
