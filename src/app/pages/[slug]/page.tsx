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

const pages: Record<string, Page> = {
  shipping: {
    title: "Delivery",
    script: "a calm, early Christmas",
    description: `Delivery from ${site.name}: tracked shipping, free over ${formatMoney(site.delivery.freeOver)}, and why ordering early means a stress-free Christmas.`,
    body: (
      <>
        <p>
          Every order ships tracked. The easiest way to a stress-free Christmas is to order now — your gifts are packed,
          on their way and waiting long before the big day.
        </p>
        <p>
          Standard delivery takes {site.delivery.minDays}–{site.delivery.maxDays} working days and is free on orders over{" "}
          {formatMoney(site.delivery.freeOver)}. Faster options, if available, are shown at checkout.
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
          <li>Bought it as a gift? Email us your order number and the recipient can exchange it too.</li>
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
    description: `Answers about delivery, free shipping, sale prices and returns at ${site.name}.`,
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
      <div className="container-page py-8 lg:py-12">
        <Breadcrumbs items={[crumbs[0]!, { label: page.title }]} />
        <p className="kicker mt-7 mb-3">{page.script}</p>
        <h1 className="display-lg">{page.title}</h1>
        <div className="prose-gift mt-5 max-w-2xl">{page.body}</div>
        {page.faq && <FaqList faqs={faqs} className="mt-8 max-w-3xl" />}
        <p className="mt-8">
          <Link href="/shop" className="btn btn-primary">
            Back to the sale
          </Link>
        </p>
      </div>
      {page.extra}
    </>
  );
}
