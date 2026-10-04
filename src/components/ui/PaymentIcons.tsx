import type { PaymentMethod } from "@/lib/shopify/payments";
import { cn } from "@/lib/utils";

/**
 * Payment logos for the methods checkout accepts. The icons are Shopify's own
 * (activemerchant/payment_icons, MIT) in `public/payments/`, the same 38×24
 * cards a Shopify theme shows. The list says what is accepted, so it is a
 * labelled list; each image is then decorative.
 */
export function PaymentIcons({ methods, className }: { methods: PaymentMethod[]; className?: string }) {
  if (methods.length === 0) return null;
  return (
    <ul
      aria-label={`Pay with ${methods.map((m) => m.label).join(", ")}`}
      className={cn("flex flex-wrap items-center justify-center gap-1 sm:gap-1.5", className)}
    >
      {methods.map((m) => (
        <li key={m.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/payments/${m.id}.svg`} alt="" title={m.label} width={38} height={24} className="h-[21px] w-[33px] rounded-[4px] sm:h-6 sm:w-[38px] shadow-[0_0_0_1px_rgb(14_26_51/0.08)]" />
        </li>
      ))}
    </ul>
  );
}
