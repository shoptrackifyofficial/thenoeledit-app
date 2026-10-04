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
    <div className="container-page min-h-[60vh] py-8 lg:py-12">
      <p className="kicker mb-3">Looking for something?</p>
      <h1 className="display-lg mb-6">
        Find the <span className="accent text-berry-600">perfect gift</span>
      </h1>
      <SearchClient cards={cards} suggestions={suggestions} />
    </div>
  );
}
