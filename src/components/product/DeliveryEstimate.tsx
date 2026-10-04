import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Delivery panel for the product page: a three-step track (order → we pack it →
 * it arrives) with the delivery time as a range of working days, and a gentle
 * nudge to order early so Christmas week isn't a rush. Set the range in
 * content/site.ts (`delivery.minDays` / `maxDays`).
 */
export function DeliveryEstimate({ minDays, maxDays }: { minDays: number; maxDays: number }) {
  const steps: { icon: IconName; title: string; note: string }[] = [
    { icon: "bag", title: "Order", note: "Place it today" },
    { icon: "gift", title: "Packed & shipped", note: "Tracking by email" },
    { icon: "truck", title: "Arrives", note: `${minDays}–${maxDays} working days` },
  ];

  return (
    <section aria-labelledby="delivery-heading" className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="delivery-heading" className="text-[0.66rem] font-bold tracking-[0.14em] text-ink-soft uppercase">
            Estimated delivery
          </h3>
          <p className="numeral mt-1.5 text-[1.3rem] leading-tight font-semibold text-ink tabular-nums">
            {minDays}–{maxDays} working days
          </p>
          <p className="mt-0.5 text-[0.76rem] text-ink-soft">Counted from the day you order</p>
        </div>
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-berry-50 text-berry-600 ring-1 ring-berry-100">
          <Icon name="truck" className="size-6" strokeWidth={1.5} />
        </span>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-line pt-4 text-center">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex flex-col items-center gap-1.5">
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute top-[1.15rem] left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-berry-200" />
            )}
            <span
              className={
                i === steps.length - 1
                  ? "relative grid size-[2.3rem] place-items-center rounded-full bg-berry-600 text-snow shadow-ribbon"
                  : "relative grid size-[2.3rem] place-items-center rounded-full bg-cream text-berry-600 ring-1 ring-line"
              }
            >
              <Icon name={s.icon} className="size-[1.1rem]" strokeWidth={1.6} />
            </span>
            <span className="text-[0.78rem] leading-tight font-semibold text-ink">{s.title}</span>
            <span className="text-[0.72rem] leading-tight text-ink-soft tabular-nums">{s.note}</span>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-2">
        <li className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[0.74rem] leading-none font-semibold">
          <Icon name="check" className="size-3.5 text-pine-600" strokeWidth={2.5} /> Tracked parcel
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[0.74rem] leading-none font-semibold">
          <Icon name="tag" className="size-3.5 text-berry-600" /> Free shipping, no minimum
        </li>
      </ul>

      <div className="mt-4 flex gap-3 rounded-xl bg-berry-50 p-3 text-[0.84rem] ring-1 ring-berry-100">
        <Icon name="snowflake" className="mt-0.5 size-4.5 shrink-0 text-berry-600" />
        <p className="text-ink">
          <strong className="font-semibold">Order early, skip the rush.</strong> Christmas week is our busiest time, and
          everyone&apos;s parcel gets a little slower. Order now and your gift is packed, on its way and under the tree with
          time to spare.{" "}
          <Link href="/pages/shipping" className="link-underline">
            Delivery details
          </Link>
        </p>
      </div>
    </section>
  );
}
