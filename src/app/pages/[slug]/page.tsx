import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DeliveryTimeline, FaqList } from "@/components/home/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { faqs } from "@/content/faqs";
import { site } from "@/content/site";
import { formatMoney } from "@/lib/money";
import { breadcrumbSchema, faqSchema, graph } from "@/lib/seo/schema";

/**
 * Help pages. Policy wording here is a starting point — check it against your
 * Shopify policies (Settings → Policies) before launch.
 */

type Page = { title: string; script: string; description: string; body: ReactNode; extra?: ReactNode; faq?: boolean };

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

const pages: Record<string, Page> = {
  shipping: {
    title: "Christmas delivery dates",
    script: "in time for the tree",
    description: `Order-by dates for Christmas delivery from ${site.name}: standard, express and next-day cut-offs, costs and tracking.`,
    body: (
      <>
        <p>Every order ships tracked. Order before the dates below for delivery before Christmas Day.</p>
        <ul>
          {site.deliveryCutoffs.map((c) => (
            <li key={c.service}>
              <strong>{c.service}:</strong> order by {fmt(c.date)} — {c.note}.
            </li>
          ))}
        </ul>
        <p>
          Standard delivery takes {site.delivery.minDays}–{site.delivery.maxDays} working days and is free on orders over{" "}
          {formatMoney(site.delivery.freeOver)}. Express and next-day rates are shown at checkout.
        </p>
        <p>You will get a tracking link by email as soon as your parcel leaves us.</p>
      </>
    ),
    extra: <DeliveryTimeline />,
  },
  returns: {
    title: "Returns & exchanges",
    script: "no stress",
    description: `${site.name} returns: Christmas gifts can be returned or exchanged until January 31, with gift receipts included.`,
    body: (
      <>
        <p>
          Christmas gifts bought from {site.name} can be returned or exchanged until <strong>January 31</strong>. Items
          should be unused and in their original packaging.
        </p>
        <ul>
          <li>Every gift-wrapped order includes a gift receipt, so recipients can exchange too.</li>
          <li>Refunds go back to the original payment method once the return is received.</li>
          <li>Damaged, faulty or wrong item? Contact us and we&apos;ll put it right.</li>
        </ul>
        <p>
          To start a return, email <a href={`mailto:${site.email}`}>{site.email}</a> with your order number.
        </p>
      </>
    ),
  },
  faq: {
    title: "Help & FAQ",
    script: "good to know",
    description: `Answers about Christmas delivery dates, free gift wrapping, sale prices and returns at ${site.name}.`,
    body: <p>Quick answers to the questions we hear most in the run-up to Christmas.</p>,
    faq: true,
  },
  contact: {
    title: "Contact us",
    script: "say hello",
    description: `Get in touch with ${site.name} about an order, delivery or a gift question.`,
    body: (
      <>
        <p>
          We&apos;re here to help with orders, delivery dates and gift questions. Email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> and we reply within one working day — faster in December.
        </p>
        <p>Please include your order number if you have one.</p>
      </>
    ),
  },
};

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/pages/${slug}` } };
}

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: page.title, href: `/pages/${slug}` },
  ];

  return (
    <>
      <JsonLd data={graph(breadcrumbSchema(crumbs), page.faq ? faqSchema(faqs) : null)} />
      <div className="container-page py-10 lg:py-16">
        <Breadcrumbs items={[crumbs[0]!, { label: page.title }]} />
        <p className="script mt-8 text-[2.4rem] text-berry-600" aria-hidden="true">
          {page.script}
        </p>
        <h1 className="display-lg -mt-1">{page.title}</h1>
        <div className="prose-gift mt-6 max-w-2xl text-[1.05rem]">{page.body}</div>
        {page.faq && <FaqList faqs={faqs} className="mt-10 max-w-3xl" />}
        <p className="mt-10">
          <Link href="/shop" className="btn btn-dark">
            Back to the sale
          </Link>
        </p>
      </div>
      {page.extra}
    </>
  );
}
