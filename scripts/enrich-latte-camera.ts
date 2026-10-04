/**
 * Content script for the "One-Touch 3D Printed Latte Art Camera" product:
 * turns its supplier description (a flat spec list plus five supplier photos)
 * into the structured `custom.noel_story` metafield the storefront renders.
 * Idempotent — safe to re-run.
 *
 *   npx tsx --env-file=.env scripts/enrich-latte-camera.ts            # preview only
 *   npx tsx --env-file=.env scripts/enrich-latte-camera.ts --apply    # write to Shopify
 *
 * Writes (only with --apply):
 *   • Files: the supplier photos re-hosted on Shopify's CDN (the supplier CDN can vanish)
 *   • Metafields: custom.noel_story (json), custom.perks (list), custom.gift_for (text)
 *   • Tags: noel-edit (so the sync imports it), category:cosy-home
 */
import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { adminRequest } from "../src/lib/shopify/admin";

const PRODUCT_ID = "gid://shopify/Product/15405838401763";
const APPLY = process.argv.includes("--apply");

const SHOP_FILES = "https://cdn.shopify.com/s/files/1/0721/8869/0659/files";
const SUPPLIER = "https://oss-cf.cjdropshipping.com/product/2026/10/03/01";

/** Description photos worth showing. Two others (a footballer's portrait in powder) are deliberately left out. */
const PHOTOS = [
  { id: "c9d0ca8b-d314-4514-8311-846c9ac725c5", alt: "Four numbered photos: filling the powder tray, loading a stencil, pressing the camera over a cup, and a finished SUMMER latte" },
  { id: "1d3a8e24-7d6e-4753-b5fb-675b995912c1", alt: "A latte with a QR-style pattern in cocoa powder beside stencil cards and the camera" },
  { id: "18953ff4-cd3d-4350-ad15-a1ea8f74805d", alt: "A sheet of stencil cards reading Chill, But first coffee, You got this and Pretty" },
] as const;

/** A clean product shot already on Shopify's CDN (product media #6) for the "How it works" header; the numbered collage is feature 01. */
const HOW_IMAGE = `${SHOP_FILES}/e2dbccbf-a672-476c-9858-b30bb09de7ae_fine.jpg`;

/** The supplier's spec list, exactly as it appears in the product description. */
const INFO: { label: string; value: string }[] = [
  { label: "Color", value: "12 random stencils (with camera), 4 random stencils (with camera), DIY stencil image (without camera), camera only, 30 stencils (without camera), filter screen only" },
  { label: "Manufacturing process", value: "3D printing" },
  { label: "Occasion for gifting", value: "Wedding, birthday, travel souvenir, graduation, housewarming, party" },
  { label: "Material", value: "3D-printed PLA" },
  { label: "Size", value: "White camera, dark green camera, black camera, custom-color camera" },
  { label: "Recipient relationship", value: "Younger generation, couple, spouse, colleague, friend, elder, child, classmate, mentor" },
  { label: "Applicable holidays", value: "Christmas, Valentine’s Day, Father’s Day, Mother’s Day, Teacher’s Day, New Year’s Day, Halloween, Easter, Children’s Day, Women’s Day" },
  { label: "Display method", value: "Decoration" },
];

/**
 * Demo clips for the "See it in action" row, uploaded from assets-src/videos.
 * Left out on purpose (celebrity portraits / a trademarked character):
 * latte-art-camera-portrait-NOT-USED.mp4 and latte-art-camera-cup-NOT-USED.mp4.
 */
const VIDEOS = [
  { file: "latte-art-camera-demo.mp4", alt: "Coffee art in one click: the latte art camera printing a design onto a cappuccino" },
  { file: "latte-art-camera-demo-2.mp4", alt: "Loading a stencil card into the white latte art camera" },
] as const;

type HostedVideo = { src: string; poster: string | null; alt: string };

/** Shopify's processed copy of an uploaded clip (best mp4 rendition + poster), if one exists. */
async function findVideo(file: string): Promise<{ src: string; poster: string | null } | null> {
  const stem = file.replace(/\.mp4$/, "");
  const r = await adminRequest<{ files: { nodes: { fileStatus?: string; sources?: { url: string; mimeType: string; width: number }[]; preview?: { image: { url: string } | null } | null }[] } }>(
    `query($q: String!) { files(first: 5, query: $q) { nodes { ... on Video { fileStatus sources { url mimeType width } preview { image { url } } } } } }`,
    { q: `media_type:VIDEO filename:${stem}*` },
  );
  const video = r.files.nodes.find((n) => n.fileStatus === "READY" && n.sources?.length);
  if (!video) return null;
  const mp4 = video.sources!.filter((x) => x.mimeType === "video/mp4").sort((a, b) => b.width - a.width);
  const best = mp4.find((x) => x.width <= 720) ?? mp4[mp4.length - 1];
  return best ? { src: best.url, poster: video.preview?.image?.url ?? null } : null;
}

/** Staged upload → fileCreate → wait until Shopify has transcoded it. */
async function uploadVideo(file: string, alt: string): Promise<{ src: string; poster: string | null }> {
  const path = join("assets-src", "videos", file);
  const size = statSync(path).size;
  const staged = await adminRequest<{
    stagedUploadsCreate: { stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[]; userErrors: { message: string }[] };
  }>(
    `mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } }
    }`,
    { input: [{ filename: basename(path), mimeType: "video/mp4", resource: "VIDEO", fileSize: String(size), httpMethod: "POST" }] },
  );
  const err = staged.stagedUploadsCreate.userErrors[0]?.message;
  if (err) throw new Error(`stagedUploadsCreate: ${err}`);
  const target = staged.stagedUploadsCreate.stagedTargets[0]!;
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([readFileSync(path)], { type: "video/mp4" }), basename(path));
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`upload failed: ${up.status} ${(await up.text()).slice(0, 200)}`);

  const created = await adminRequest<{ fileCreate: { files: { id: string }[]; userErrors: { message: string }[] } }>(
    `mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } userErrors { message } } }`,
    { files: [{ originalSource: target.resourceUrl, contentType: "VIDEO", alt }] },
  );
  const cerr = created.fileCreate.userErrors[0]?.message;
  if (cerr) throw new Error(`fileCreate: ${cerr}`);
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const found = await findVideo(file);
    if (found) return found;
  }
  throw new Error(`Timed out waiting for Shopify to process ${file}`);
}

async function ensureVideos(preview: boolean): Promise<HostedVideo[]> {
  const out: HostedVideo[] = [];
  for (const v of VIDEOS) {
    if (preview) {
      out.push({ src: `<shopify-cdn>/${v.file}`, poster: null, alt: v.alt });
      continue;
    }
    const hosted = (await findVideo(v.file)) ?? (console.log(`  uploading ${v.file}…`), await uploadVideo(v.file, v.alt));
    out.push({ ...hosted, alt: v.alt });
  }
  return out;
}

/** One band per photo (same order as PHOTOS); the storefront alternates image left / right. */
const FEATURES = [
  {
    eyebrow: "Step by step",
    title: "From powder to pattern in four moves",
    text: "Spoon cocoa or fine coffee powder into the holder, slide a stencil card into the camera, press it over your cup, and lift. Your design is left in the foam.",
  },
  {
    eyebrow: "Beyond words",
    title: "Even QR-style patterns",
    text: "Stencils go well past lettering: shapes, patterns and QR-style designs dust onto the foam just as easily.",
  },
  {
    eyebrow: "Endless moods",
    title: "Short phrases for every moment",
    text: "Chill, But first coffee, You got this, Pretty. Swap the card to match the mood, the guest or the occasion.",
  },
] as const;

async function hostOnShopify(url: string, alt: string): Promise<string> {
  const created = await adminRequest<{
    fileCreate: { files: { id: string }[]; userErrors: { message: string }[] };
  }>(
    `mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { id } userErrors { message } }
    }`,
    { files: [{ originalSource: url, contentType: "IMAGE", alt }] },
  );
  const err = created.fileCreate.userErrors[0]?.message;
  if (err) throw new Error(`fileCreate: ${err}`);
  const id = created.fileCreate.files[0]!.id;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await adminRequest<{ node: { fileStatus: string; image?: { url: string } | null } }>(
      `query($id: ID!) { node(id: $id) { ... on MediaImage { fileStatus image { url } } } }`,
      { id },
    );
    if (r.node.fileStatus === "FAILED") throw new Error(`Shopify could not fetch ${url}`);
    if (r.node.fileStatus === "READY" && r.node.image?.url) return r.node.image.url.split("?")[0]!;
  }
  throw new Error("Timed out waiting for Shopify to process the image.");
}

/** The Shopify-hosted copy if it already exists, otherwise upload it now. */
async function ensureHosted(photo: (typeof PHOTOS)[number], preview: boolean): Promise<string> {
  const hosted = `${SHOP_FILES}/${photo.id}_fine.jpg`;
  if (preview) return hosted;
  const exists = await fetch(hosted, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
  return exists ? hosted : hostOnShopify(`${SUPPLIER}/${photo.id}_fine.jpeg`, photo.alt);
}

async function main() {
  const urls = await Promise.all(PHOTOS.map((p) => ensureHosted(p, !APPLY)));
  const videos = await ensureVideos(!APPLY);

  const story = {
    version: 2,
    optionLabels: { Color: "Stencil pack", Size: "Camera colour" },
    // Shopify's values say "Templates"; the cards are stencils, so the storefront renames them.
    valueLabels: { "4 Templates": "4 Stencils", "12 Templates": "12 Stencils" },
    // Camera colour becomes a "how many cameras, and which colours" picker (1–3).
    bundle: { option: "Size", secondary: "Color", max: 3, noun: "camera", popular: 2, tags: ["", "One to gift", "Share the joy"] },
    how: {
      eyebrow: "How it works",
      title: "Latte art in four easy steps",
      accent: "four easy steps",
      intro: "No barista skills needed. Load a stencil, press, and your design appears in the foam.",
      image: HOW_IMAGE,
      imageAlt: "The cream latte art camera on a table with a stencil card loaded",
      steps: [
        { title: "Fill the tray", text: "Spoon cocoa, cinnamon or fine coffee powder into the holder." },
        { title: "Load a stencil", text: "Slide a stencil card into the camera, like loading film." },
        { title: "Press over the cup", text: "Hold the camera above your drink and press the button." },
        { title: "Sip and share", text: "A name, a pattern or a greeting appears in the foam." },
      ],
    },
    videos,
    features: FEATURES.map((f, i) => ({ ...f, image: urls[i]!, imageAlt: PHOTOS[i]!.alt })),
    info: INFO,
    details: {
      eyebrow: "At a glance",
      title: "Made to be gifted",
      accent: "gifted",
      occasions: ["Birthday", "Wedding", "Housewarming", "Graduation", "Party", "Travel souvenir"],
      recipients: ["Couples", "Friends", "Colleagues", "Parents & grandparents", "Kids", "Teachers & mentors"],
      holidays: ["Christmas", "Valentine's Day", "Mother's Day", "Father's Day", "Teacher's Day", "New Year's Day", "Halloween", "Easter"],
    },
  };

  const perks = [
    "3D-printed in durable PLA",
    "Interchangeable stencil cards",
    "Handheld — no machine or skills needed",
    "Choose white, dark green or black",
  ];
  const giftFor = "Coffee lovers, couples, friends, colleagues and anyone who likes a little café magic at home";

  if (!APPLY) {
    console.log(JSON.stringify({ story, perks, giftFor }, null, 2));
    console.log("\nPreview only. Re-run with --apply to write this to Shopify.");
    return;
  }

  console.log("Writing metafields…");
  const set = await adminRequest<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $m) { userErrors { field message } }
    }`,
    {
      m: [
        { ownerId: PRODUCT_ID, namespace: "custom", key: "noel_story", type: "json", value: JSON.stringify(story) },
        { ownerId: PRODUCT_ID, namespace: "custom", key: "perks", type: "list.single_line_text_field", value: JSON.stringify(perks) },
        { ownerId: PRODUCT_ID, namespace: "custom", key: "gift_for", type: "single_line_text_field", value: giftFor },
      ],
    },
  );
  if (set.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(set.metafieldsSet.userErrors));

  const tag = await adminRequest<{ tagsAdd: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`,
    { id: PRODUCT_ID, tags: ["noel-edit", "category:cosy-home"] },
  );
  if (tag.tagsAdd.userErrors.length) throw new Error(JSON.stringify(tag.tagsAdd.userErrors));
  console.log("Done. Videos:", videos.length, "· photos:", urls.length, "· features:", story.features.length, "· info rows:", story.info.length);
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error("✖", m);
  if (/access|scope|permission/i.test(m)) {
    console.error("\nThe app needs the write_products and write_files scopes (Shopify Dev Dashboard → your app → Versions), then re-install.");
  }
  process.exit(1);
});
