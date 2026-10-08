import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeliveryTimeline, FaqList, ProductGridSection, SectionHeading } from "@/components/home/Sections";
import { getPaymentMethods } from "@/lib/shopify/payments";
import { ProductVideoShowcase } from "@/components/product/ProductVideoShowcase";
import { ProductStory, StoryInfo, infoGroups } from "@/components/product/ProductStory";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { originalPrice, tierBase } from "@/lib/commerce/tiers";
import { productVideos, productVideosByHandle } from "@/content/product-videos";
import { Accordion } from "@/components/ui/Accordion";
import { DeliveryEstimate } from "@/components/product/DeliveryEstimate";
import { Icon, type IconName } from "@/components/ui/Icon";
import { faqs as siteFaqs } from "@/content/faqs";
import { site } from "@/content/site";
import { getProducts } from "@/lib/catalog";
import { PurchaseFeedback } from "@/components/product/PurchaseFeedback";
import { ReviewRating } from "@/components/product/ReviewRating";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { feedPage, photoCount, reviewSetFor } from "@/lib/reviews/feed";
import { verifiedOnly } from "@/lib/judgeme/reviews";
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
  const description = record.seo.description || `${view.summary} Free shipping on every order and tracked delivery before Christmas.`.slice(0, 300);
  return {
    // A title set in Shopify (SEO title) is used exactly as written, brand included; otherwise the site template adds the brand.
    title: record.seo.title ? { absolute: record.seo.title } : title,
    description,
    alternates: { canonical: view.href },
    openGraph: {
      type: "website",
      url: view.href,
      title: record.seo.title ?? `${view.name} · ${site.name}`,
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

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const data = await getProductView(handle);
  if (!data) notFound();
  const { view } = data;
  const payments = await getPaymentMethods();
  // Judge.me reviews (null when there are none): the same set feeds the three places below.
  const reviewSet = await reviewSetFor(view.handle);
  const verified = verifiedOnly(reviewSet);
  const fiveStar = reviewSet?.reviews.filter((r) => r.rating === 5) ?? [];

  const allCards = await getCardViews((r) => r.handle !== view.handle && r.availableForSale);
  const related = allCards.filter((c) => c.category.slug === view.category.slug).slice(0, 4);
  const more = byDiscount(allCards.filter((c) => c.category.slug !== view.category.slug)).slice(0, 4);

  const offerEnds = view.offerEndsAt
    ? new Date(view.offerEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
    : null;
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
        ? `${view.giftFor}. To send it straight to them, just enter their address at checkout.`
        : `It's a thoughtful ${view.category.title.toLowerCase()} gift.`,
    },
    {
      q: `How much is the ${view.name} in the Christmas sale?`,
      a: `It's ${formatMoney(view.fromPrice, view.currency)}${
        lead?.compareAtPrice ? `, down from ${formatMoney(lead.compareAtPrice, view.currency)} (${lead.compareAtPercent}% off)` : ""
      }. Sale prices run ${offerEnds ? `until ${offerEnds}` : "for the Christmas sale"} or while stock lasts.`,
    },
    {
      q: `Will the ${view.name} arrive before Christmas?`,
      a: `It ships tracked and arrives in ${view.delivery.minDays}–${view.delivery.maxDays} working days${view.delivery.note ? ` (${view.delivery.note.toLowerCase()})` : ""}. Order early so it is under the tree in time, with no last-minute rush.`,
    },
    ...siteFaqs.slice(3, 5),
  ];

  const bundleOff = view.story?.bundle ? Math.round(tierBase(view.story.bundle)) : 0;

  const videos = productVideosByHandle[view.handle] ?? productVideos;

  const trust: { icon: IconName; text: string }[] = [
    { icon: "shield", text: "Secure checkout" },
    { icon: "truck", text: "Early for Christmas" },
    { icon: "tag", text: "Free shipping on every order" },
  ];

  return (
    <>
      <JsonLd
        data={graph(
          productSchema(view, verified ? { average: verified.summary.average, count: verified.summary.count } : null),
          breadcrumbSchema(crumbs),
          faqSchema(productFaqs),
        )}
      />

      {/* ── Section 1: gallery + buy box ─────────────────────────────── */}
      <div className="container-page pt-4 pb-12 md:pt-6 lg:pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <ProductGallery media={view.gallery} productName={view.name} />

          <div className="min-w-0 lg:pt-2">
            <ul className="mb-5 flex flex-wrap gap-2 lg:gap-1.5 xl:flex-nowrap">
              {trust.map((t) => (
                <li
                  key={t.text}
                  className="inline-flex items-center gap-1.5 rounded-full bg-berry-50 px-3 py-1.5 text-[0.72rem] leading-none font-semibold whitespace-nowrap text-berry-500 xl:px-2.5 xl:text-[0.7rem]"
                >
                  <Icon name={t.icon} className="size-3.5" />
                  {t.text}
                </li>
              ))}
            </ul>

            <Link href={`/shop/${view.category.slug}`} className="eyebrow text-gold-700 hover:text-berry-600">
              {view.category.title}
            </Link>
            {reviewSet && <ReviewRating summary={reviewSet.summary} />}
            <h1 className="display-lg mt-2 text-wrap text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)]">
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
              <PurchasePanel view={view} payments={payments} />
            </div>

            <Accordion
              className="mt-7"
              items={
                view.story?.info.length
                  ? infoGroups(view.story.info, view.options, view.story.valueLabels).map((g) => ({ title: g.title, body: <StoryInfo info={g.rows} /> }))
                  : [
                      {
                        title: "Details",
                        body: view.descriptionHtml ? (
                          <div className="prose-gift text-[0.92rem]" dangerouslySetInnerHTML={{ __html: view.descriptionHtml }} />
                        ) : (
                          <p>{view.summary}</p>
                        ),
                      },
                    ]
              }
            />

            <div className="mt-5">
              <DeliveryEstimate
                minDays={view.delivery.minDays}
                maxDays={view.delivery.maxDays}
                note={view.delivery.note}
              />
            </div>

            {fiveStar.length > 0 && <PurchaseFeedback reviews={fiveStar} className="mt-5" />}

            {/* At a glance — a compact, quotable fact sheet (AEO/GEO) */}
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line text-[0.85rem] ring-1 ring-line">
              {[
                [
                  "Price",
                  bundleOff
                    ? `${formatMoney(view.fromPrice, view.currency)} (−${bundleOff}% off ${formatMoney(originalPrice(view.fromPrice, tierBase(view.story!.bundle!)), view.currency)})`
                    : `${formatMoney(view.fromPrice, view.currency)}${lead?.compareAtPercent ? ` (−${lead.compareAtPercent}%)` : ""}`,
                ],
                ...(offerEnds ? [["Offer ends", offerEnds]] : []),
                ["Category", view.category.title],
                ["Shipping", "Tracked · free on every order"],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface p-3.5">
                  <dt className="text-[0.66rem] font-bold tracking-[0.16em] text-ink-faint uppercase">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ── Product videos (story videos), right after section 1 ── */}
      {videos.length > 0 && (
        <section className="py-10 lg:py-14" aria-labelledby="videos-title">
          <div className="container-page">
            <SectionHeading
              id="videos-title"
              kicker="Product videos"
              title={
                <>
                  A closer <span className="accent text-berry-600">look.</span>
                </>
              }
              align="center"
            />
          </div>
          {/* Full-bleed: the row runs edge to edge so it has room to drift. */}
          <ProductVideoShowcase videos={videos} className="mt-7 px-2 sm:px-3" />
        </section>
      )}

      {/* ── Rich story (How it works / designs / details) when the product has one ── */}
      {view.story && <ProductStory story={view.story} />}

      {/* ── The gift story — fallback for products without a rich story ── */}
      {!view.story && (
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
      )}

      <ProductGridSection
        id="related-title"
        kicker="Complete the gift"
        title={`More ${view.category.title}`}
        cards={related}
        action={{ href: `/shop/${view.category.slug}`, label: `All ${view.category.title}` }}
      />

      {/* ── The full review system ── */}
      {reviewSet && (
        <ReviewsSection summary={reviewSet.summary} photoCount={photoCount(reviewSet)} initial={feedPage(reviewSet, "all", 1)} handle={view.handle} />
      )}

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
