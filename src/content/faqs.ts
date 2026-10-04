import { site } from "@/content/site";

/**
 * Plain, direct answers — written so a shopper, a search snippet or an AI
 * answer engine can lift any one of them on its own. Keep them factual and
 * update delivery times in content/site.ts.
 */

export const faqs: { q: string; a: string }[] = [
  {
    q: "Should I order now or wait?",
    a: `Order now. Sale prices and stock are at their best, and tracked delivery takes ${site.delivery.minDays}–${site.delivery.maxDays} working days — so your gifts arrive packed and ready well before Christmas, with no last-minute rush.`,
  },
  {
    q: "Can I send a gift straight to someone else?",
    a: "Yes. Just enter their address at checkout.",
  },
  {
    q: "How long is the Christmas sale on?",
    a: `${site.name} sale prices run until ${new Date(site.sale.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}, or while stock lasts. Each product shows its own countdown.`,
  },
  {
    q: "What if the gift isn't quite right?",
    a: "Christmas gifts bought now can be returned or exchanged until January 31.",
  },
  {
    q: "Is checkout secure?",
    a: "Yes. Payment is handled entirely by Shopify Checkout — card details never touch our servers — and you can pay with major cards and express wallets where available.",
  },
];
