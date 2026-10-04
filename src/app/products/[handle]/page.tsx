import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeliveryTimeline, FaqList, ProductGridSection } from "@/components/home/Sections";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { faqs as siteFaqs } from "@/content/faqs";
import { site } from "@/content/site";
import { getProducts } from "@/lib/catalog";
import { byDiscount, getCardViews, getProductView } from "@/lib/commerce/views";
import { formatMoney } from "@/lib/money";
import { breadcrumbSchema, faqSchema, graph, productSchema } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";

/**
 * PDP — static + ISR off the synced catalog. Only the gallery and the
 * purchase panel hydrate; everything else is server HTML.
 */
export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ handle: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const data = await getProductView(handle);
  if (!data) return {};
  const { view, record } = data;
  const price = formatMoney(view.fromPrice, view.currency);
  const title = record.seo.title || `${view.name} — ${price} in the Christmas Sale`;
  const description = record.seo.description || `${view.summary} Free gift wrapping and delivery before Christmas.`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: view.href },
    openGraph: {
      type: "website",
      url: view.href,
      title: `${view.name} · ${site.name}`,
      description,
      images: view.cardImage ? [{ url: view.cardImage.url, alt: view.name }] : undefined,
    },
  };
}

/** Keyword → icon for perk bullets (perks come from the Shopify `custom.perks` metafield). */
const PERK_ICONS: [RegExp, IconName][] = [
  [/wrap|box|gift|ribbon|tin|case/i, "gift"],
  [/hour|battery|charge|last|warm|cold/i, "clock"],
  [/safe|tested|hypoallergenic|warranty|resistan/i, "shield"],
  [/soft|plush|cashmere|silk|velvet/i, "heart"],
  [/scent|fir|clove|cocoa|flavour|flavor|baked/i, "sparkle"],
];
const perkIcon = (perk: string): IconName => PERK_ICONS.find(([re]) => re.test(perk))?.[1] ?? "check";

function nextCutoff() {
  const today = new Date().toISOString().slice(0, 10);
  const c = site.deliveryCutoffs.find((x) => x.date >= today);
  if (!c) return null;
  return {
    ...c,
    label: new Date(`${c.date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
  };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const data = await getProductView(handle);
  if (!data) notFound();
  const { view } = data;

  const allCards = await getCardViews((r) => r.handle !== view.handle && r.availableForSale);
  const related = allCards.filter((c) => c.category.slug === view.category.slug).slice(0, 4);
  const more = byDiscount(allCards.filter((c) => c.category.slug !== view.category.slug)).slice(0, 4);

  const cutoff = nextCutoff();
  const saleEnds = new Date(view.saleEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const lead = view.variants.find((v) => v.id === view.defaultVariantId) ?? view.variants[0];
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: view.category.title, href: `/shop/${view.category.slug}` },
    { label: view.name, href: view.href },
  ];

  const productFaqs = [
    {
      q: `Who is the ${view.name} a good gift for?`,
      a: view.giftFor
        ? `${view.giftFor}. It arrives gift-wrapped for free with a handwritten card if you tick gift wrapping in your bag.`
        : `It's a thoughtful ${view.category.title.toLowerCase()} gift, and it arrives gift-wrapped for free with a handwritten card.`,
    },
    {
      q: `How much is the ${view.name} in the Christmas sale?`,
      a: `It's ${formatMoney(view.fromPrice, view.currency)}${
        lead?.compareAtPrice ? `, down from ${formatMoney(lead.compareAtPrice, view.currency)} (${lead.compareAtPercent}% off)` : ""
      }. Sale prices run until ${saleEnds} or while stock lasts.`,
    },
    ...(cutoff
      ? [
          {
            q: `Will the ${view.name} arrive before Christmas?`,
            a: `Yes — order by ${cutoff.label} for ${cutoff.service.toLowerCase()} delivery (${cutoff.note.toLowerCase()}). Every order is tracked.`,
          },
        ]
      : []),
    ...siteFaqs.slice(4, 6),
  ];

  const trust: { icon: IconName; text: string }[] = [
    { icon: "gift", text: "Free gift wrap" },
    { icon: "truck", text: "Delivered for Christmas" },
    { icon: "refresh", text: "Returns till Jan 31" },
  ];

  return (
    <>
      <JsonLd
        data={graph(
          productSchema(view),
          breadcrumbSchema(crumbs),
          faqSchema(productFaqs),
        )}
      />

      {/* ── Section 1: gallery + buy box ─────────────────────────────── */}
      <div className="container-page pt-4 pb-12 md:pt-6 lg:pb-16">
        <Breadcrumbs items={crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.label } : c))} className="mb-4 lg:mb-6" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <ProductGallery media={view.gallery} productName={view.name} />

          <div className="min-w-0 lg:pt-2">
            <ul className="mb-5 flex flex-wrap gap-2">
              {trust.map((t) => (
                <li
                  key={t.text}
                  className="inline-flex items-center gap-1.5 rounded-full bg-berry-50 px-3 py-1.5 text-[0.72rem] leading-none font-semibold text-berry-700"
                >
                  <Icon name={t.icon} className="size-3.5" />
                  {t.text}
                </li>
              ))}
            </ul>

            <Link href={`/shop/${view.category.slug}`} className="eyebrow text-gold-700 hover:text-berry-600">
              {view.category.title}
            </Link>
            <h1 className="display-lg mt-2 text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)]">
              {view.name}
            </h1>
            {view.giftFor && (
              <p className="mt-3 flex items-start gap-2 text-[0.95rem] text-ink-soft">
                <span className="accent text-[1.15rem] leading-none text-berry-600">for</span>
                {view.giftFor}
              </p>
            )}

            {view.perks.length > 0 && (
              <ul className="mt-6 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {view.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-[0.9rem]">
                    <span aria-hidden="true" className="mt-px grid size-5.5 shrink-0 place-items-center rounded-full bg-berry-50 text-berry-600">
                      <Icon name={perkIcon(perk)} className="size-3" strokeWidth={2} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">
              <PurchasePanel view={view} />
            </div>

            <div className="mt-7 divide-y divide-line border-y border-line">
              {[
                {
                  title: "Details",
                  body: view.descriptionHtml ? (
                    <div className="prose-gift text-[0.92rem]" dangerouslySetInnerHTML={{ __html: view.descriptionHtml }} />
                  ) : (
                    <p>{view.summary}</p>
                  ),
                },
                {
                  title: "Gift wrapping & cards",
                  body: (
                    <p>
                      Tick “Free gift wrapping” in your bag and we wrap it in matte paper with a satin ribbon, plus a card
                      printed with your own message. Gift receipts are included.
                    </p>
                  ),
                },
                {
                  title: "Delivery & returns",
                  body: (
                    <p>
                      Tracked delivery in {site.delivery.minDays}–{site.delivery.maxDays} working days, free over{" "}
                      {formatMoney(site.delivery.freeOver, view.currency)}. Returns and exchanges until January 31.{" "}
                      <Link href="/pages/shipping" className="link-underline text-ink">
                        Delivery dates
                      </Link>
                    </p>
                  ),
                },
              ].map((item, i) => (
                <details key={item.title} className="group" open={i === 0}>
                  <summary className="flex min-h-13 items-center justify-between gap-4 py-2 text-[0.92rem] font-semibold">
                    {item.title}
                    <Icon name="plus" className="size-4 shrink-0 text-ink-soft transition-transform duration-300 group-open:rotate-45" />
                  </summary>
                  <div className="pb-5 text-[0.9rem] text-ink-soft">{item.body}</div>
                </details>
              ))}
            </div>

            {cutoff && (
              <aside className="mt-4 flex gap-3 rounded-2xl bg-berry-50 p-4 text-[0.86rem] ring-1 ring-berry-100" aria-label="Christmas delivery">
                <Icon name="snowflake" className="mt-0.5 size-5 shrink-0 text-berry-600" />
                <p>
                  <strong className="font-semibold">Want it by Christmas?</strong> Order by {cutoff.label} for{" "}
                  {cutoff.service.toLowerCase()} delivery.{" "}
                  <Link href="/pages/shipping" className="link-underline">
                    All dates
                  </Link>
                </p>
              </aside>
            )}

            {/* At a glance — a compact, quotable fact sheet (AEO/GEO) */}
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line text-[0.85rem] ring-1 ring-line">
              {[
                ["Price", `${formatMoney(view.fromPrice, view.currency)}${lead?.compareAtPercent ? ` (−${lead.compareAtPercent}%)` : ""}`],
                ["Sale ends", saleEnds],
                ["Category", view.category.title],
                ["Gift wrap", "Free, with card"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-3.5">
                  <dt className="text-[0.66rem] font-bold tracking-[0.16em] text-ink-faint uppercase">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ── The gift story ────────────────────────────────────────────── */}
      <section aria-labelledby="story-title" className="px-2 sm:px-4">
        <div className="grain relative mx-auto max-w-[1600px] overflow-hidden rounded-[1.75rem] bg-pine-900 py-12 text-snow sm:rounded-[2.25rem] lg:py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-t-full rounded-b-[2rem] ring-[5px] ring-white/10">
            {(() => {
              const img = view.gallery.filter((m) => m.type === "image")[1] ?? view.gallery.find((m) => m.type === "image");
              return img && img.type === "image" ? (
                <Image src={img.url} alt={img.alt} fill sizes="(min-width: 1024px) 38vw, 90vw" className="object-cover" />
              ) : null;
            })()}
          </div>
          <div>
            <p className="kicker mb-3 text-gold-300">The gift story</p>
            <h2 id="story-title" className="display-lg">
              Why it&apos;s <span className="accent text-gold-300">the one.</span>
            </h2>
            <p className="mt-4 max-w-lg text-[0.98rem] leading-relaxed text-white/75">{view.summary}</p>
            {view.perks.length > 0 && (
              <ol className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {view.perks.map((perk, i) => (
                  <li key={perk} className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10">
                    <span className="numeral text-[1.4rem] leading-none text-gold-300">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[0.92rem] text-snow/90">{perk}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        </div>
      </section>

      <ProductGridSection
        id="related-title"
        kicker="Complete the gift"
        title={`More ${view.category.title}`}
        cards={related}
        action={{ href: `/shop/${view.category.slug}`, label: `All ${view.category.title}` }}
      />

      <DeliveryTimeline />

      <section aria-labelledby="pdp-faq" className="pb-14 lg:pb-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <p className="kicker mb-3">Questions?</p>
            <h2 id="pdp-faq" className="display-lg">
              Good to <span className="accent text-berry-600">know</span>
            </h2>
          </div>
          <FaqList faqs={productFaqs} />
        </div>
      </section>

      <div className={cn("bg-cream", more.length === 0 && "hidden")}>
        <ProductGridSection id="more-title" kicker="You may also love" title="Deals in other categories" cards={more} />
      </div>
    </>
  );
}
