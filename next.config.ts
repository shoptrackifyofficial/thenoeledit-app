import type { NextConfig } from "next";

/** Static security headers, applied to every route. */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Shopify's CDN (and the Unsplash placeholders) resize + negotiate
    // AVIF/WebP on the fly, so there is no second optimisation hop.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2400],
    imageSizes: [64, 96, 128, 200, 320],
  },
  experimental: {
    optimizePackageImports: ["yet-another-react-lightbox"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/(cart|search)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/collections", destination: "/shop", permanent: true },
      { source: "/collections/all", destination: "/shop", permanent: true },
      { source: "/collections/:slug", destination: "/shop/:slug", permanent: true },
      { source: "/products", destination: "/shop", permanent: true },
      { source: "/checkout", destination: "/cart", permanent: false },
    ];
  },
};

export default nextConfig;
