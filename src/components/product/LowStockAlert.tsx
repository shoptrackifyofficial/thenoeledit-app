import { Icon } from "@/components/ui/Icon";

/**
 * "Low stock" alert above the add-to-bag button. It only ever shows a real
 * number from Shopify's inventory (see `stock` in the catalog sync) and stays
 * hidden otherwise — no invented scarcity.
 */
export function LowStockAlert({ left, wanted = 1 }: { left: number; wanted?: number }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2.5 rounded-xl border border-dashed border-berry-200 bg-berry-50 px-3 py-2 text-[0.82rem] font-semibold text-berry-700"
    >
      <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-berry-500 opacity-70" />
        <span className="relative size-2.5 rounded-full bg-berry-600" />
      </span>
      <span>
        <strong className="font-bold">Low stock</strong> — only {left} left{wanted > 1 && left < wanted ? ", not enough for this bundle" : ""}. Order soon.
      </span>
      <Icon name="clock" className="ml-auto size-4 shrink-0 opacity-70" />
    </p>
  );
}
