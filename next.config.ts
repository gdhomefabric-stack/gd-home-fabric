import type { NextConfig } from "next";

// `STATIC_EXPORT=1 pnpm build` writes a fully static site to `out/` for hosts
// that only serve files (no image optimisation, no response headers). The
// default build keeps the Node runtime for Vercel.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStaticExport ? { output: "export" as const, trailingSlash: true } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 only serves qualities on this allowlist; these are the
    // `quality` props used across the site (hero 85, swatches 82, footer 80,
    // credits thumbnails 70, default 75).
    qualities: [70, 75, 80, 82, 85],
    ...(isStaticExport ? { unoptimized: true } : {}),
  },
  // Response hardening (Node runtime only; a static host sets its own headers).
  // No CSP yet: the policy needs a nonce strategy for the JSON-LD script first.
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                { key: "X-Frame-Options", value: "DENY" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
