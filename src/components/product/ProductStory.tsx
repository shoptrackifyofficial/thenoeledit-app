import Image from "next/image";

import { Icon, type IconName } from "@/components/ui/Icon";
import type { ProductStory as Story } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

/**
 * Long-form product content from the `custom.noel_story` metafield:
 * "How it works", "Endless designs" and "At a glance". Server-rendered, no JS.
 * Each block renders only when its data exists, so a product with a partial
 * story still looks complete.
 */

function Heading({
  id,
  eyebrow,
  title,
  accent,
  intro,
  light = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  accent: string;
  intro?: string;
  light?: boolean;
}) {
  const at = accent ? title.indexOf(accent) : -1;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      {eyebrow && <p className={cn("kicker mb-3", light && "text-gold-300")}>{eyebrow}</p>}
      <h2 id={id} className="display-lg">
        {at >= 0 ? (
          <>
            {title.slice(0, at)}
            <span className={cn("accent", light ? "text-gold-300" : "text-berry-600")}>{accent}</span>
            {title.slice(at + accent.length)}
          </>
        ) : (
          title
        )}
      </h2>
      {intro && <p className={cn("mt-3 max-w-xl text-[0.95rem]", light ? "text-white/70" : "text-ink-soft")}>{intro}</p>}
    </div>
  );
}

function Chips({ icon, label, items, tone = "light" }: { icon: IconName; label: string; items: string[]; tone?: "light" | "dark" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.16em] text-ink-soft uppercase">
        <Icon name={icon} className="size-3.5 text-berry-600" /> {label}
      </p>
      <ul className="flex flex-wrap gap-2">
        {items.map((c) => (
          <li
            key={c}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold",
              tone === "dark" ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-berry-50 text-berry-700 ring-1 ring-berry-100",
            )}
          >
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductStory({ story }: { story: Story }) {
  const { how, designs, details, features } = story;

  return (
    <>
      {/* ── How it works ───────────────────────────────────────────────── */}
      {how && (
        <section aria-labelledby="how-title" className="section-y">
          <div className="container-page">
            <Heading id="how-title" eyebrow={how.eyebrow} title={how.title} accent={how.accent} intro={how.intro} />
            <div className="mt-9 grid items-center gap-8 lg:mt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              {how.image && (
                <div className="reveal relative mx-auto w-full max-w-[560px]">
                  <div className="img-skeleton relative aspect-square overflow-hidden rounded-[2rem] shadow-lift ring-[6px] ring-surface">
                    <Image
                      src={how.image}
                      alt={how.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 45vw, 90vw"
                      className="object-cover"
                    />
                  </div>
                  <span aria-hidden="true" className="absolute -top-3 -right-2 grid size-14 animate-float place-items-center rounded-full bg-berry-600 text-snow shadow-ribbon [--r:8deg] sm:size-16">
                    <Icon name="sparkle" className="size-6" />
                  </span>
                </div>
              )}
              <ol className="reveal-stagger relative grid gap-3">
                <span aria-hidden="true" className="absolute top-8 bottom-8 left-[1.65rem] w-px border-l-2 border-dashed border-berry-200" />
                {how.steps.map((s, i) => (
                  <li key={s.title} className="relative flex items-start gap-4 rounded-[1.4rem] bg-surface p-4 shadow-soft ring-1 ring-line sm:p-5">
                    <span className="numeral relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-berry-600 text-[1.25rem] text-snow shadow-ribbon">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">
                      <span className="block font-display text-[1.2rem] leading-tight">{s.title}</span>
                      <span className="mt-1 block text-[0.9rem] text-ink-soft">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ── Endless designs ────────────────────────────────────────────── */}
      {designs && (
        <section aria-labelledby="designs-title" className="px-2 sm:px-4">
          <div className="grain relative mx-auto max-w-[1600px] overflow-hidden rounded-[1.75rem] bg-pine-900 py-12 text-snow sm:rounded-[2.25rem] lg:py-16">
            <div className="snow opacity-30" aria-hidden="true" />
            <div className="relative container-page">
              <Heading id="designs-title" eyebrow={designs.eyebrow} title={designs.title} accent={designs.accent} intro={designs.intro} light />
              <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                {designs.images.map((img, i) => (
                  <li
                    key={img.url}
                    className={cn("reveal mx-auto w-full max-w-sm transition-transform duration-500 ease-out-soft hover:rotate-0", i % 2 ? "sm:rotate-[2deg]" : "sm:-rotate-[2deg]")}
                  >
                    {/* instant-photo frame */}
                    <figure className="rounded-[0.6rem] bg-white p-3 pb-4 text-ink shadow-lift">
                      {/* crops the supplier watermark off the bottom edge */}
                      <div className="img-skeleton relative aspect-[1/0.9] overflow-hidden rounded-[0.3rem]">
                        <Image src={img.url} alt={img.alt} fill sizes="(min-width: 640px) 360px, 90vw" className="object-cover object-top" />
                      </div>
                      {img.caption && <figcaption className="accent mt-3 text-center text-[1.15rem]">{img.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
              {designs.chips.length > 0 && (
                <ul className="mt-9 flex flex-wrap justify-center gap-2">
                  {designs.chips.map((c) => (
                    <li key={c} className="rounded-full bg-white/10 px-3.5 py-1.5 text-[0.82rem] font-semibold ring-1 ring-white/15">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Image + text bands, one per supplier photo, alternating sides ─── */}
      {features.length > 0 && (
        <section aria-label="Product features" className="px-2 sm:px-4">
          <ul className="mx-auto grid max-w-[1600px] gap-2 sm:gap-3">
            {features.map((f, i) => (
              <li
                key={f.image}
                className="reveal grid overflow-hidden rounded-[1.75rem] bg-cream sm:rounded-[2.25rem] lg:grid-cols-2"
              >
                <div
                  className={cn(
                    "img-skeleton relative aspect-[1/0.95] overflow-hidden",
                    i % 2 === 1 && "lg:order-2",
                  )}
                >
                  {/* object-top crops the supplier watermark off the bottom edge */}
                  <Image
                    src={f.image}
                    alt={f.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-top transition-transform duration-[1.4s] ease-out-soft hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col items-center justify-center px-6 py-9 text-center sm:px-10 lg:items-start lg:px-14 lg:py-12 lg:text-left">
                  <span className="numeral text-[3.4rem] leading-none text-berry-200 sm:text-[4.2rem]">{String(i + 1).padStart(2, "0")}</span>
                  {f.eyebrow && <p className="kicker mt-1 mb-3">{f.eyebrow}</p>}
                  <h3 className="display-md max-w-[22ch]">{f.title}</h3>
                  {f.text && <p className="mt-3 max-w-[46ch] text-[0.97rem] text-ink-soft">{f.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── At a glance ────────────────────────────────────────────────── */}
      {details && (
        <section aria-labelledby="details-title" className="section-y">
          <div className="container-page">
            <Heading id="details-title" eyebrow={details.eyebrow} title={details.title} accent={details.accent} />
            <div className="reveal mt-9 grid gap-7 rounded-[1.75rem] bg-surface p-6 shadow-soft ring-1 ring-line sm:p-8 lg:mt-12 lg:grid-cols-3 lg:gap-10">
              <Chips icon="gift" label="Perfect for" items={details.occasions} />
              <Chips icon="heart" label="Who it's for" items={details.recipients} />
              <Chips icon="snowflake" label="Gift it on" items={details.holidays} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** The full "Product information" list as a tidy label / value table (used in the Details accordion). */
/**
 * Splits the spec rows into a few titled groups so the product page can show
 * each in its own accordion (rows not matched fall into "More details").
 * Supplier labels that clash with our own option names are renamed:
 * "Color" lists the stencil packs and "Size" lists the camera colours.
 */
const INFO_GROUPS: { title: string; labels: string[] }[] = [
  { title: "Packs & colours", labels: ["Color", "Size"] },
  { title: "Material & build", labels: ["Material", "Manufacturing process"] },
  { title: "Great for", labels: ["Occasion for gifting", "Recipient relationship", "Applicable holidays", "Display method"] },
];
const INFO_RENAMES: Record<string, string> = { Color: "Stencil packs", Size: "Camera colours" };

export function infoGroups(
  info: Story["info"],
  options: { name: string; values: string[] }[] = [],
  valueLabels: Record<string, string> = {},
): { title: string; rows: Story["info"] }[] {
  // A row named like one of the product's options (the supplier's "Color" / "Size") is filled from the
  // variants actually on sale, so it can never list things that aren't sold.
  info = info.map((row) => {
    const option = options.find((o) => o.name === row.label);
    return option ? { ...row, value: option.values.map((v) => valueLabels[v] ?? v).join(", ") } : row;
  });
  const groups = INFO_GROUPS.map((g) => ({
    title: g.title,
    rows: info.filter((r) => g.labels.includes(r.label)).map((r) => ({ ...r, label: INFO_RENAMES[r.label] ?? r.label })),
  })).filter((g) => g.rows.length > 0);
  const rest = info.filter((r) => !INFO_GROUPS.some((g) => g.labels.includes(r.label)));
  return rest.length ? [...groups, { title: "More details", rows: rest }] : groups;
}

export function StoryInfo({ info }: { info: Story["info"] }) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-2xl bg-surface text-[0.88rem] ring-1 ring-line">
      {info.map((row) => (
        <div key={row.label} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
          <dt className="text-[0.7rem] font-bold tracking-[0.12em] text-ink-faint uppercase sm:pt-0.5">{row.label}</dt>
          <dd className="text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
