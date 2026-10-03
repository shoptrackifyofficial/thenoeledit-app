import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShopGrid } from "@/components/shop/ShopGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { getCategories, getCategory } from "@/lib/catalog";
import { getCategoryCards } from "@/lib/commerce/views";
import { formatMoney } from "@/lib/money";
import { breadcrumbSchema, graph, itemListSchema } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) return {};
  return {
    title: `${c.title} — Christmas Gifts on Sale`,
    description: c.blurb,
    alternates: { canonical: `/shop/${c.slug}` },
    openGraph: { title: `${c.title} Christmas gifts`, description: c.blurb, images: [{ url: `${c.image}&w=1200&h=630` }] },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const [c, all] = await Promise.all([getCategory(category), getCategories()]);
  if (!c) notFound();
  const cards = await getCategoryCards(c.slug);
  const prices = cards.map((p) => p.price);
  const currency = cards[0]?.currency ?? "USD";
  const bestSaving = Math.max(0, ...cards.map((p) => p.percentOff ?? 0));
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: c.title, href: `/shop/${c.slug}` },
  ];

  return (
    <>
      <JsonLd data={graph(itemListSchema(`${c.title} Christmas gifts`, `/shop/${c.slug}`, cards), breadcrumbSchema(crumbs))} />

      <section className="bg-cream">
        <div className="container-page grid items-center gap-8 pt-6 pb-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:pt-10 lg:pb-14">
          <div className="order-2 lg:order-1">
            <Breadcrumbs items={crumbs.map((x, i) => (i === crumbs.length - 1 ? { label: x.label } : x))} />
            <p className="script mt-6 text-[2.4rem] text-berry-600 sm:text-[3rem]" aria-hidden="true">
              Christmas gifts
            </p>
            <h1 className="display-lg -mt-1">{c.title}</h1>
            <p className="mt-4 max-w-xl text-[1.05rem] text-ink-soft">{c.blurb}</p>
            {/* Quick facts — a compact, quotable summary for shoppers and answer engines. */}
            <dl className="mt-7 grid max-w-lg grid-cols-3 divide-x divide-line rounded-2xl bg-paper py-4 ring-1 ring-line">
              <div className="px-4">
                <dt className="text-[0.66rem] font-bold tracking-[0.16em] text-ink-faint uppercase">Gifts</dt>
                <dd className="numeral mt-1 text-[1.5rem] leading-none">{cards.length}</dd>
              </div>
              <div className="px-4">
                <dt className="text-[0.66rem] font-bold tracking-[0.16em] text-ink-faint uppercase">From</dt>
                <dd className="numeral mt-1 text-[1.5rem] leading-none">{formatMoney(Math.min(...prices), currency)}</dd>
              </div>
              <div className="px-4">
                <dt className="text-[0.66rem] font-bold tracking-[0.16em] text-ink-faint uppercase">Save up to</dt>
                <dd className="numeral mt-1 text-[1.5rem] leading-none text-berry-600">{bestSaving}%</dd>
              </div>
            </dl>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-[2rem] lg:aspect-[4/5] lg:rounded-t-full lg:rounded-b-[2rem]">
              <Image src={c.image} alt="" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Categories" className="border-b border-line">
        <ul className="scrollbar-none container-page flex gap-2 overflow-x-auto py-3">
          <li>
            <Link href="/shop" className="flex h-10 items-center rounded-full px-4 text-[0.82rem] font-semibold whitespace-nowrap ring-1 ring-line hover:bg-cream">
              All gifts
            </Link>
          </li>
          {all.map((x) => (
            <li key={x.slug}>
              <Link
                href={`/shop/${x.slug}`}
                aria-current={x.slug === c.slug ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 text-[0.82rem] font-semibold whitespace-nowrap",
                  x.slug === c.slug ? "bg-berry-600 text-snow" : "ring-1 ring-line hover:bg-cream",
                )}
              >
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page py-8 lg:py-12">
        <ShopGrid cards={cards} priorityCount={2} />
      </div>

      <section className="container-page pb-16 lg:pb-24" aria-labelledby="more-cats">
        <h2 id="more-cats" className="display-md">
          Keep shopping
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {all
            .filter((x) => x.slug !== c.slug)
            .map((x) => (
              <li key={x.slug}>
                <Link href={`/shop/${x.slug}`} className="group relative flex aspect-[5/4] items-end overflow-hidden rounded-2xl bg-pine-900 p-4 text-snow">
                  <Image src={x.image} alt="" fill sizes="(min-width: 1024px) 18vw, 45vw" className="object-cover opacity-75 transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-linear-to-t from-pine-950/85 to-transparent" />
                  <span className="relative flex w-full items-center justify-between">
                    <span className="font-display text-[1.25rem] leading-tight">{x.title}</span>
                    <Icon name="arrow-right" className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
