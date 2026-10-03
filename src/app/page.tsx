import type { Metadata } from "next";

import { Hero } from "@/components/home/Hero";
import {
  AdventDeals,
  CategoryArches,
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
      <CategoryArches categories={categories} />
      <AdventDeals cards={deals} />
      <ProductGridSection
        id="wanted-title"
        script="this season's"
        title={
          <>
            The most-wanted <span className="italic">list</span>
          </>
        }
        intro="The gifts everyone is asking for this Christmas — on sale, wrapped free."
        cards={mostWanted}
        action={{ href: "/shop", label: "Shop all gifts" }}
      />
      <GiftFinder cards={cards} />
      <WrappedStory />
      <DeliveryTimeline />
      <ProductGridSection
        id="new-title"
        script="just in"
        title="Fresh under the tree"
        cards={newest}
        action={{ href: "/shop?sort=new", label: "See what's new" }}
      />
      <section aria-labelledby="faq-title" className="bg-cream py-16 lg:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <SectionHeading
            id="faq-title"
            script="good to know"
            title="Christmas gifting, answered"
            intro="Everything you need to order with confidence before the big day."
            action={{ href: "/pages/faq", label: "All questions" }}
          />
          <FaqList faqs={faqs} />
        </div>
      </section>
    </>
  );
}
