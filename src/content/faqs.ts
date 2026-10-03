import { site } from "@/content/site";

/**
 * Plain, direct answers — written so a shopper, a search snippet or an AI
 * answer engine can lift any one of them on its own. Keep them factual and
 * update the delivery dates in content/site.ts.
 */

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

const [standard, express, nextDay] = site.deliveryCutoffs;

export const faqs: { q: string; a: string }[] = [
  {
    q: "When do I need to order for delivery before Christmas?",
    a: `Order by ${fmt(standard!.date)} for standard tracked delivery, by ${fmt(express!.date)} for express, or by ${fmt(nextDay!.date)} (before 2pm) for next-day delivery.`,
  },
  {
    q: "Is gift wrapping really free?",
    a: "Yes. Every order can be gift-wrapped for free with ribbon and a printed card carrying your own message — just tick “Free gift wrapping” in your bag.",
  },
  {
    q: "Can I send a gift straight to someone else?",
    a: "Yes. Enter their address at checkout and add a gift message in your bag.",
  },
  {
    q: "How long is the Christmas sale on?",
    a: `${site.name} sale prices run until ${new Date(site.sale.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}, or while stock lasts. Each product shows its own countdown.`,
  },
  {
    q: "What if the gift isn't quite right?",
    a: "Christmas gifts bought now can be returned or exchanged until January 31. A gift receipt is included in every wrapped order, so the recipient can exchange it too.",
  },
  {
    q: "Is checkout secure?",
    a: "Yes. Payment is handled entirely by Shopify Checkout — card details never touch our servers — and you can pay with major cards and express wallets where available.",
  },
];
