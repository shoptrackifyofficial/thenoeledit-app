import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.8rem] text-ink-soft", className)}>
      <ol className="scrollbar-none flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron-right" className="size-3 text-ink-faint" />}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
