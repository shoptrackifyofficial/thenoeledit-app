import { faqs } from "@/content/faqs";
import { site } from "@/content/site";
import { getCategories } from "@/lib/catalog";
import { getCardViews } from "@/lib/commerce/views";
import { formatMoney } from "@/lib/money";

/**
 * /llms.txt — a plain-markdown map of the store for AI answer engines (GEO):
 * what we sell, current sale prices, delivery cut-offs and policies, with
 * canonical links. Regenerated with the catalog.
 */
export const revalidate = 3600;

export async function GET() {
  const [categories, cards] = await Promise.all([getCategories(), getCardViews()]);
  const abs = (p: string) => `${site.url}${p}`;

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "## Key facts",
    `- Sale: ${site.sale.headline} until ${new Date(site.sale.endsAt).toUTCString().slice(5, 16)}`,
    "- Free gift wrapping with a printed gift message on every order",
    `- Tracked delivery in ${site.delivery.minDays}-${site.delivery.maxDays} working days; free over ${formatMoney(site.delivery.freeOver)}`,
    ...site.deliveryCutoffs.map((c) => `- Christmas cut-off (${c.service}): order by ${c.date} — ${c.note}`),
    "- Returns and exchanges until January 31; secure checkout by Shopify",
    "",
    "## Categories",
    ...categories.map((c) => `- [${c.title}](${abs(`/shop/${c.slug}`)}): ${c.blurb}`),
    "",
    "## Products",
    ...cards.map(
      (c) =>
        `- [${c.name}](${abs(c.href)}) — ${c.category.title}, ${formatMoney(c.price, c.currency)}${
          c.compareAtPrice ? ` (was ${formatMoney(c.compareAtPrice, c.currency)}, ${c.percentOff}% off)` : ""
        }${c.available ? "" : ", sold out"}`,
    ),
    "",
    "## FAQ",
    ...faqs.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    "## Pages",
    `- [Christmas delivery dates](${abs("/pages/shipping")})`,
    `- [Returns & exchanges](${abs("/pages/returns")})`,
    `- [Contact](${abs("/pages/contact")})`,
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600" },
  });
}
