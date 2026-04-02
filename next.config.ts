import type { NextConfig } from "next";

// ── Silo redirect mapping ──────────────────────────────────────
// Moved from /kosttilskud/SLUG → /SILO/SLUG
import { SLUG_TO_SILO } from "./src/lib/silo-config";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**.healthwell.dk" },
      { protocol: "https", hostname: "**.bodylab.dk" },
      { protocol: "https", hostname: "**.shopify.com" },
      { protocol: "https", hostname: "**.shopifycdn.com" },
    ],
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/authors/**" },
      { pathname: "/vendor/**" },
      { pathname: "/generated/**" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    // Redirect all old /kosttilskud/SLUG URLs to their new silo
    const siloRedirects = Object.entries(SLUG_TO_SILO).map(([slug, siloId]) => ({
      source: `/kosttilskud/${slug}`,
      destination: `/${siloId}/${slug}`,
      permanent: true,
    }))

    return [
      // Hub redirect: /kosttilskud → keep as-is (still exists as overview)
      ...siloRedirects,
    ]
  },
};

export default nextConfig;
