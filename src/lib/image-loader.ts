/**
 * next/image loader. Shopify's CDN resizes on the fly (`?width=`) and serves
 * WebP/AVIF from the Accept header; the Unsplash placeholders (imgix) do the
 * same with `w` + `auto=format`. Local /public files are small SVG brand assets
 * and pass through unchanged.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("https://cdn.shopify.com/")) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 68));
    url.searchParams.set("auto", "format");
    if (!url.searchParams.has("fit")) url.searchParams.set("fit", "max");
    return url.toString();
  }
  return src;
}
