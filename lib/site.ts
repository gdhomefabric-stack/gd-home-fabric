/**
 * Site-wide constants for metadata, robots, sitemap and structured data.
 *
 * Kept free of imports so the metadata route handlers (`app/robots.ts`,
 * `app/sitemap.ts`) stay tiny. Brand copy that renders on the page itself
 * lives in `lib/content.ts`; this file only holds what the <head> and the
 * crawlers need.
 */

/**
 * Canonical origin, no trailing slash. Override per deployment with
 * NEXT_PUBLIC_SITE_URL. `||` rather than `??`: CI passes the variable as an
 * empty string when it is not configured, and `new URL("")` throws.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gdhomefabric.in").replace(/\/+$/, "");

export const SITE_NAME = "GD Home Fabric";

/** Default <title> for the home page; child routes use `"%s | GD Home Fabric"`. */
export const SITE_TITLE = "GD Home Fabric | Goose feather pillows on Amazon.in";

export const SITE_DESCRIPTION =
  "GD Home Fabric goose feather pillows with a 500 thread count pure cotton shell, in Standard 17 × 27 in, Queen 20 × 30 in and King 20 × 36 in. Sold only on Amazon.in.";

export const SITE_LOCALE = "en_IN";

/** Legal entity behind the brand, used in Organization structured data. */
export const SITE_LEGAL_NAME = "HiChoice Exports";

export const SITE_KEYWORDS = [
  "goose feather pillow",
  "feather pillow",
  "500 thread count cotton pillow",
  "17 x 27 pillow",
  "20 x 30 pillow",
  "20 x 36 pillow",
  "pillow cover 17 x 27",
  "GD Home Fabric",
];

/** Social preview image (1200×630), served from /public. */
export const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: "Two plump white pillows against a pale wooden headboard in soft morning light, GD Home Fabric",
} as const;
