import { site } from "@/content/site";
import type { CardView, ProductView } from "@/lib/commerce/product-view";

/**
 * schema.org builders. Everything is linked by @id into one @graph per page,
 * so search engines and answer engines (AEO/GEO) read one coherent entity
 * model: Organization → WebSite → pages → Products/Offers.
 */

const abs = (path: string) => (path.startsWith("http") ? path : `${site.url}${path}`);
export const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

type Node = Record<string, unknown>;

export function graph(...nodes: (Node | Node[] | null | undefined)[]) {
  return { "@context": "https://schema.org", "@graph": nodes.flat().filter(Boolean) };
}

export function organizationSchema(): Node {
  return {
    "@type": "OnlineStore",
    "@id": ORG_ID,
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.email,
    logo: abs("/icon.svg"),
    sameAs: Object.values(site.social),
    hasMerchantReturnPolicy: returnPolicy(),
  };
}

export function websiteSchema(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: site.url,
    name: site.name,
    description: site.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

function returnPolicy(): Node {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 30,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };
}

function shippingDetails(currency: string): Node {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: site.delivery.minDays,
        maxValue: site.delivery.maxDays,
        unitCode: "DAY",
      },
    },
  };
}

export function productSchema(view: ProductView): Node {
  const url = abs(view.href);
  const images = view.gallery
    .filter((m) => m.type === "image")
    .slice(0, 6)
    .map((m) => (m.type === "image" ? m.url.split("?")[0] : ""));
  const validUntil = view.saleEndsAt.slice(0, 10);
  const offers = view.variants.map((v) => ({
    "@type": "Offer",
    url: `${url}?variant=${v.id.split("/").pop()}`,
    sku: v.sku ?? v.id.split("/").pop(),
    price: v.price.toFixed(2),
    priceCurrency: view.currency,
    priceValidUntil: validUntil,
    availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": ORG_ID },
    shippingDetails: shippingDetails(view.currency),
    hasMerchantReturnPolicy: returnPolicy(),
    ...(v.compareAtPrice
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceType: "https://schema.org/StrikethroughPrice",
            price: v.compareAtPrice.toFixed(2),
            priceCurrency: view.currency,
          },
        }
      : {}),
  }));

  const base = {
    name: view.name,
    description: view.summary,
    image: images,
    brand: { "@type": "Brand", name: view.vendor || site.name },
    category: view.category.title,
    url,
  };

  if (view.variants.length > 1) {
    return {
      "@type": "ProductGroup",
      "@id": `${url}#product`,
      ...base,
      productGroupID: view.handle,
      variesBy: view.options.map((o) => o.name),
      hasVariant: view.variants.map((v, i) => ({
        "@type": "Product",
        name: v.label ? `${view.name} — ${v.label}` : view.name,
        image: v.image?.split("?")[0] ?? images[0],
        offers: offers[i],
      })),
    };
  }
  return { "@type": "Product", "@id": `${url}#product`, ...base, offers: offers[0] };
}

export function breadcrumbSchema(items: { label: string; href: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: abs(c.href),
    })),
  };
}

export function itemListSchema(name: string, path: string, cards: CardView[]): Node {
  return {
    "@type": "CollectionPage",
    "@id": `${abs(path)}#page`,
    name,
    url: abs(path),
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cards.length,
      itemListElement: cards.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(c.href),
        name: c.name,
      })),
    },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]): Node | null {
  if (faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
