import type { Metadata } from "next";

import { SearchClient } from "@/components/search/SearchClient";
import { getCategories } from "@/lib/catalog";
import { getCardViews } from "@/lib/commerce/views";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Search gifts",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default async function SearchPage() {
  const [cards, categories] = await Promise.all([getCardViews(), getCategories()]);
  const suggestions = [
    ...categories.map((c) => ({ label: c.title, href: `/shop/${c.slug}` })),
    { label: "Under $25", href: "/shop?budget=25" },
    { label: "Under $50", href: "/shop?budget=50" },
  ];
  return (
    <div className="container-page min-h-[60vh] py-10 lg:py-16">
      <p className="script text-[2.4rem] text-berry-600" aria-hidden="true">
        looking for
      </p>
      <h1 className="display-lg -mt-1 mb-8">Find the perfect gift</h1>
      <SearchClient cards={cards} suggestions={suggestions} />
    </div>
  );
}
