import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ShopGrid } from "@/components/shop/ShopGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { site } from "@/content/site";
import { getCategories } from "@/lib/catalog";
import { getCardViews } from "@/lib/commerce/views";
import { breadcrumbSchema, graph, itemListSchema } from "@/lib/seo/schema";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop All Christmas Gifts — Up to 40% Off",
  description:
    "Browse every gift in The Noel Edit Christmas sale — jewellery, tech, toys, home and festive treats, all discounted, with free gift wrapping and delivery before Christmas.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [categories, cards] = await Promise.all([getCategories(), getCardViews()]);

  return (
    <>
      <JsonLd
        data={graph(
          itemListSchema("All Christmas gifts", "/shop", cards),
          breadcrumbSchema([
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
          ]),
        )}
      />

      <section className="grain relative overflow-hidden bg-pine-900 text-snow">
        <div className="snow opacity-40" aria-hidden="true" />
        <div className="relative container-page pt-8 pb-12 lg:pt-12 lg:pb-16">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} className="text-snow/70 [&_[aria-current]]:text-snow" />
          <p className="script mt-6 text-[2.6rem] text-gold-300 sm:text-[3.2rem]" aria-hidden="true">
            the whole edit
          </p>
          <h1 className="display-lg -mt-1">Every Christmas gift, on sale</h1>
          <p className="mt-4 max-w-xl text-snow/75">
            {cards.length} hand-picked gifts, {site.sale.headline.toLowerCase()}. Filter by budget, then let us do the
            wrapping.
          </p>

          <ul className="scrollbar-none -mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {categories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/shop/${c.slug}`}
                  className="group flex items-center gap-3 rounded-full bg-snow/8 py-1.5 pr-5 pl-1.5 ring-1 ring-snow/15 transition-colors hover:bg-snow hover:text-ink"
                >
                  <span className="relative size-10 overflow-hidden rounded-full">
                    <Image src={c.image} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="text-[0.88rem] font-semibold whitespace-nowrap">{c.title}</span>
                  <span className="numeral text-[0.78rem] opacity-60">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page py-8 lg:py-12">
        <ShopGrid cards={cards} />
      </div>
    </>
  );
}
