import Image from "next/image";

/** Customer photos kept on our own host (taken from the imported reviews), shown overlapping like a "joined by" strip. */
const FACES = ["nm-0195aabf", "nm-0444cd4b", "nm-04605879", "nm-13c229ef"];

/** 219200 → "219.2K+", 1250000 → "1.25M+", 840 → "840+". */
export function compactCount(n: number): string {
  const trim = (x: number, digits: number) => x.toFixed(digits).replace(/\.?0+$/, "");
  if (n >= 1_000_000) return `${trim(n / 1_000_000, 2)}M+`;
  if (n >= 1_000) return `${trim(n / 1_000, 1)}K+`;
  return `${n}+`;
}

/** "Trusted by 219.2K+ customers worldwide", with four customer faces. Driven by the product's `custom.customers_count` metafield. */
export function TrustedBy({ count, className }: { count: number; className?: string }) {
  return (
    <p className={className} aria-label={`Trusted by ${compactCount(count)} customers worldwide`}>
      <span className="inline-flex items-center gap-3">
        <span aria-hidden="true" className="flex shrink-0 -space-x-3">
          {FACES.map((f) => (
            <span key={f} className="relative size-9 overflow-hidden rounded-full bg-cream ring-2 ring-surface">
              <Image src={`/avatars/${f}.jpg`} alt="" fill sizes="36px" className="object-cover" unoptimized />
            </span>
          ))}
        </span>
        <span className="text-[0.92rem] leading-tight text-ink-soft">
          Trusted by <strong className="numeral text-[1.02rem] font-bold text-ink">{compactCount(count)}</strong> customers worldwide
        </span>
      </span>
    </p>
  );
}
