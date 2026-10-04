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

      <section className="px-2 pt-3 sm:px-4 sm:pt-4">
        <div className="dots relative mx-auto max-w-[1600px] overflow-hidden rounded-[1.75rem] bg-cream sm:rounded-[2.25rem]">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-80 rounded-full bg-berry-200/50 blur-3xl" />
        <div className="relative container-page pt-6 pb-8 text-center sm:text-left lg:pt-8 lg:pb-12 [&_nav_ol]:justify-center sm:[&_nav_ol]:justify-start">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
          <p className="kicker mt-6 mb-3">The whole edit</p>
          <h1 className="display-lg">
            Every Christmas gift, <span className="accent text-berry-600">on sale</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft sm:mx-0">
            {cards.length} hand-picked gifts, {site.sale.headline.toLowerCase()}. Filter by budget, then let us do the
            wrapping.
          </p>

          <ul className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {categories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/shop/${c.slug}`}
                  className="group flex items-center gap-2.5 rounded-full bg-surface py-1 pr-4 pl-1 shadow-soft ring-1 ring-line transition-colors hover:bg-berry-600 hover:text-snow"
                >
                  <span className="relative size-9 overflow-hidden rounded-full">
                    <Image src={c.image} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="text-[0.84rem] font-semibold whitespace-nowrap">{c.title}</span>
                  <span className="text-[0.74rem] tabular-nums opacity-60">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </section>

      <div className="container-page py-6 lg:py-10">
        <ShopGrid cards={cards} />
      </div>
    </>
  );
}
