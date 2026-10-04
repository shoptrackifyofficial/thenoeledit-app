import { cn } from "@/lib/utils";

/** Judge.me sends no profile pictures, so a reviewer gets a round initial in a soft colour picked from their name (stable across renders). */
const TONES = [
  "bg-berry-100 text-berry-700",
  "bg-gold-100 text-gold-700",
  "bg-pine-100 text-pine-700",
  "bg-linen text-ink",
  "bg-berry-50 text-berry-600",
];

export function ReviewAvatar({ name, className }: { name: string; className?: string }) {
  const letter = (name.trim().match(/[A-Za-z0-9]/)?.[0] ?? "?").toUpperCase();
  const tone = TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length]!;
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-[1.05rem] leading-none ring-2 ring-surface", tone, className)}
    >
      {letter}
    </span>
  );
}
