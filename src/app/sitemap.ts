import type { MetadataRoute } from "next";

import { site } from "@/content/site";
import { getCatalog, getCategories, getProducts } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, catalog] = await Promise.all([getProducts(), getCategories(), getCatalog()]);
  const synced = new Date(catalog.syncedAt);
  const url = (path: string) => `${site.url}${path}`;

  return [
    { url: url("/"), lastModified: synced, changeFrequency: "daily", priority: 1 },
    { url: url("/shop"), lastModified: synced, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: url(`/shop/${c.slug}`),
      lastModified: synced,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: url(`/products/${p.handle}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
      images: p.media.filter((m) => m.type === "image").slice(0, 3).map((m) => (m.type === "image" ? m.url.split("?")[0]! : "")),
    })),
    ...["shipping", "returns", "faq", "contact"].map((s) => ({
      url: url(`/pages/${s}`),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
