import type { Metadata } from "next";

import { Hero } from "@/components/home/Hero";
import {
  Accent,
  AdventDeals,
  CategoryOrnaments,
  DeliveryTimeline,
  FaqList,
  GiftFinder,
  ProductGridSection,
  RibbonMarquee,
  SectionHeading,
  WrappedStory,
} from "@/components/home/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqs } from "@/content/faqs";
import { site } from "@/content/site";
import { getCategories } from "@/lib/catalog";
import { byDiscount, getCardViews } from "@/lib/commerce/views";
import { faqSchema, graph, itemListSchema } from "@/lib/seo/schema";

/** Home — fully static, refreshed when the catalog tag is revalidated. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Christmas Gift Sale, Up to 40% Off` },
  description: site.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, cards] = await Promise.all([getCategories(), getCardViews()]);
  const deals = byDiscount(cards.filter((c) => c.available));
  const tagged = cards.filter((c) => c.tags.some((t) => t.toLowerCase() === "bestseller"));
  const mostWanted = [...tagged, ...deals.filter((c) => !tagged.includes(c))].slice(0, 8);
  const newest = [...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <>
      <JsonLd
        data={graph(itemListSchema("Christmas gift sale — most-wanted gifts", "/", mostWanted), faqSchema(faqs))}
      />
      <Hero />
      <RibbonMarquee />
      <CategoryOrnaments categories={categories} />
      <AdventDeals cards={deals} />
      <ProductGridSection
        id="wanted-title"
        kicker="This season's favourites"
        title={
          <>
            The most-wanted <Accent>list</Accent>
          </>
        }
        intro="The gifts everyone is asking for this Christmas — on sale, with free shipping over $50."
        cards={mostWanted}
        action={{ href: "/shop", label: "Shop all gifts" }}
      />
      <WrappedStory />
      <GiftFinder cards={cards} />
      <ProductGridSection
        id="new-title"
        kicker="Just in"
        title={
          <>
            Fresh <Accent>under the tree</Accent>
          </>
        }
        cards={newest}
        action={{ href: "/shop?sort=new", label: "See what's new" }}
        className="bg-cream"
      />
      <DeliveryTimeline />
      <section aria-labelledby="faq-title" className="pb-14 lg:pb-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            stack
            id="faq-title"
            kicker="Good to know"
            title={
              <>
                Christmas gifting, <Accent>answered</Accent>
              </>
            }
            intro="Everything you need to order with confidence before the big day."
            action={{ href: "/pages/faq", label: "All questions" }}
          />
          </div>
          <FaqList faqs={faqs} />
        </div>
      </section>
    </>
  );
}
