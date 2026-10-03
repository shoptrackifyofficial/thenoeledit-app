import type { MetadataRoute } from "next";

import { site } from "@/content/site";

/** Open to search and AI answer crawlers alike (GEO) — only cart, search and API are excluded. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/search"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
