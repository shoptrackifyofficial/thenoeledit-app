import Link from "next/link";

import { NewsletterForm } from "@/components/content/NewsletterForm";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";
import { getCategories } from "@/lib/catalog";

export async function Footer() {
  const categories = await getCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-pine-950 text-pine-100">
      {/* Ribbon edge */}
      <div className="h-1.5 bg-linear-to-r from-berry-700 via-gold-500 to-berry-700" aria-hidden="true" />

      <div className="container-page grid gap-12 pt-16 pb-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-10 lg:pt-20">
        <div className="max-w-md">
          <p className="script text-[2.6rem] text-gold-400">Stay merry</p>
          <p className="display-md mt-1 text-snow">Early access to every drop.</p>
          <p className="mt-3 text-[0.92rem] text-pine-200">
            Last-minute deals, delivery reminders and new gifts — a few emails a season, never more.
          </p>
          <div className="mt-6">
            <NewsletterForm />
          </div>
        </div>

        <nav aria-label="Shop">
          <p className="eyebrow text-gold-400">Shop</p>
          <ul className="mt-4 space-y-2.5 text-[0.92rem]">
            <li><Link href="/shop" className="hover:text-snow">All gifts</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="hover:text-snow">{c.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <p className="eyebrow text-gold-400">Help</p>
          <ul className="mt-4 space-y-2.5 text-[0.92rem]">
            <li><Link href="/pages/shipping" className="hover:text-snow">Christmas delivery dates</Link></li>
            <li><Link href="/pages/returns" className="hover:text-snow">Returns & exchanges</Link></li>
            <li><Link href="/pages/faq" className="hover:text-snow">FAQ</Link></li>
            <li><Link href="/pages/contact" className="hover:text-snow">Contact us</Link></li>
          </ul>
        </nav>

        <div>
          <p className="eyebrow text-gold-400">Our promise</p>
          <ul className="mt-4 space-y-3 text-[0.88rem]">
            {site.promises.map((p) => (
              <li key={p.title} className="flex gap-3">
                <Icon name={p.icon} className="mt-0.5 size-4.5 shrink-0 text-gold-400" />
                {p.title}
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex gap-2">
            {(["instagram", "tiktok", "pinterest"] as const).map((s) => (
              <li key={s}>
                <a
                  href={site.social[s]}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={`${site.name} on ${s}`}
                  className="grid size-10 place-items-center rounded-full ring-1 ring-pine-100/25 transition-colors hover:bg-snow hover:text-pine-950"
                >
                  <Icon name={s} className="size-4.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none container-page font-display text-[clamp(4rem,15vw,15rem)] leading-[0.8] tracking-[-0.04em] whitespace-nowrap text-snow/[0.05] select-none"
      >
        The <span className="italic">Noel</span> Edit
      </p>

      <div className="border-t border-pine-100/10">
        <div className="container-page flex flex-col gap-2 py-6 text-[0.78rem] text-pine-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <Icon name="lock" className="size-3.5" /> Secure checkout powered by Shopify
          </p>
        </div>
      </div>
    </footer>
  );
}
