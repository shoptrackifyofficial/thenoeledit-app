import type { ProductStory } from "@/lib/catalog/types";

/**
 * Parses the `custom.noel_story` JSON metafield into a typed, size-limited
 * shape. The value comes from Shopify admin (anyone with product access can
 * edit it), so nothing is trusted: unknown keys are dropped, text is trimmed
 * and capped, and image URLs must be https. A malformed value yields null and
 * the product page simply falls back to its standard layout.
 */

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max: number, each = 60): string[] =>
  (Array.isArray(v) ? v : []).map((x) => text(x, each)).filter(Boolean).slice(0, max);
const url = (v: unknown): string => {
  const s = text(v, 600);
  return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : "";
};

export function parseStory(raw: string | null | undefined): ProductStory | null {
  if (!raw) return null;
  let j: Json;
  try {
    j = obj(JSON.parse(raw));
  } catch {
    return null;
  }

  const how = obj(j.how);
  const steps = (Array.isArray(how.steps) ? how.steps : [])
    .map((s) => ({ title: text(obj(s).title, 60), text: text(obj(s).text, 200) }))
    .filter((s) => s.title)
    .slice(0, 8);

  const designs = obj(j.designs);
  const images = (Array.isArray(designs.images) ? designs.images : [])
    .map((i) => ({ url: url(obj(i).url), alt: text(obj(i).alt, 160), caption: text(obj(i).caption, 80) }))
    .filter((i) => i.url)
    .slice(0, 4);

  const features = (Array.isArray(j.features) ? j.features : [])
    .map((f) => ({
      eyebrow: text(obj(f).eyebrow, 40),
      title: text(obj(f).title, 100),
      text: text(obj(f).text, 400),
      image: url(obj(f).image),
      imageAlt: text(obj(f).imageAlt, 200),
    }))
    .filter((f) => f.image && f.title)
    .slice(0, 8);

  const info = (Array.isArray(j.info) ? j.info : [])
    .map((s) => ({ label: text(obj(s).label, 60), value: text(obj(s).value, 500) }))
    .filter((s) => s.label && s.value)
    .slice(0, 24);

  const details = obj(j.details);
  const occasions = list(details.occasions, 10);
  const recipients = list(details.recipients, 10);
  const holidays = list(details.holidays, 12);

  const labels = Object.fromEntries(
    Object.entries(obj(j.optionLabels))
      .map(([k, v]) => [text(k, 60), text(v, 60)] as const)
      .filter(([k, v]) => k && v),
  );

  const b = obj(j.bundle);
  const bundleMax = Number(b.max);
  const bundle =
    text(b.option, 60) && Number.isInteger(bundleMax) && bundleMax >= 2 && bundleMax <= 6
      ? {
          option: text(b.option, 60),
          secondary: text(b.secondary, 60) || null,
          max: bundleMax,
          noun: text(b.noun, 30) || "item",
          popular: Number.isInteger(Number(b.popular)) && Number(b.popular) >= 1 && Number(b.popular) <= bundleMax ? Number(b.popular) : null,
          // positional (index 0 = the 1-item offer), so empty entries must be kept
          tags: (Array.isArray(b.tags) ? b.tags : []).slice(0, 6).map((t) => text(t, 30)),
          discounts: (Array.isArray(b.discounts) ? b.discounts : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 90).slice(0, 6),
          codePrefix: /^[A-Z0-9]{2,12}$/.test(text(b.codePrefix, 12)) ? text(b.codePrefix, 12) : "",
        }
      : null;

  const valueLabels = Object.fromEntries(
    Object.entries(obj(j.valueLabels))
      .map(([k, v]) => [text(k, 80), text(v, 80)] as const)
      .filter(([k, v]) => k && v),
  );
  const videos = (Array.isArray(j.videos) ? j.videos : [])
    .map((v) => ({ src: url(obj(v).src), poster: url(obj(v).poster) || null, alt: text(obj(v).alt, 200) }))
    .filter((v) => v.src && /\.mp4(\?|$)/i.test(v.src))
    .slice(0, 12);

  const a = obj(j.addon);
  const addon = /^[a-z0-9-]{3,200}$/.test(text(a.handle, 200))
    ? {
        handle: text(a.handle, 200),
        name: text(a.name, 40) || "Add-on",
        intro: text(a.intro, 200),
      }
    : null;

  const m = obj(j.multi);
  const multi = text(m.option, 60)
    ? {
        option: text(m.option, 60),
        noun: text(m.noun, 30) || "item",
        discounts: (Array.isArray(m.discounts) ? m.discounts : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 90).slice(0, 6),
        codePrefix: /^[A-Z0-9]{2,12}$/.test(text(m.codePrefix, 12)) ? text(m.codePrefix, 12) : "",
      }
    : null;

  const dv = obj(j.delivery);
  const dMin = Number(dv.minDays);
  const dMax = Number(dv.maxDays);
  const delivery =
    Number.isInteger(dMin) && Number.isInteger(dMax) && dMin >= 1 && dMax >= dMin && dMax <= 60
      ? { minDays: dMin, maxDays: dMax, note: text(dv.note, 140) }
      : null;

  const bx = obj(j.box);
  const box =
    list(bx.included, 10, 80).length > 0
      ? { included: list(bx.included, 10, 80), separate: list(bx.separate, 6, 80) }
      : null;

  const story: ProductStory = {
    box,
    delivery,
    shortName: text(j.shortName, 60),
    addon,
    multi,
    optionLabels: labels,
    valueLabels,
    videos,
    bundle,
    how:
      steps.length > 0
        ? {
            eyebrow: text(how.eyebrow, 40) || "How it works",
            title: text(how.title, 100),
            accent: text(how.accent, 60),
            intro: text(how.intro, 240),
            image: url(how.image) || null,
            imageAlt: text(how.imageAlt, 200),
            steps,
          }
        : null,
    designs:
      images.length > 0
        ? {
            eyebrow: text(designs.eyebrow, 40),
            title: text(designs.title, 100),
            accent: text(designs.accent, 60),
            intro: text(designs.intro, 240),
            images,
            chips: list(designs.chips, 10),
          }
        : null,
    features,
    info,
    details:
      occasions.length + recipients.length + holidays.length > 0
        ? {
            eyebrow: text(details.eyebrow, 40),
            title: text(details.title, 100),
            accent: text(details.accent, 60),
            occasions,
            recipients,
            holidays,
          }
        : null,
  };
  return story.how || story.designs || story.details || story.addon || story.multi || story.box || story.delivery || story.shortName || features.length > 0 || info.length > 0 || videos.length > 0 ? story : null;
}
