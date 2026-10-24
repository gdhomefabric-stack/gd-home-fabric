/**
 * Site-wide constants for metadata, robots, sitemap and structured data.
 *
 * Kept free of imports so the metadata route handlers (`app/robots.ts`,
 * `app/sitemap.ts`) stay tiny. Brand copy that renders on the page itself
 * lives in `lib/content.ts`; this file only holds what the <head> and the
 * crawlers need.
 */

/** Canonical origin, no trailing slash. Override per deployment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gdhomefabric.in").replace(/\/+$/, "");

export const SITE_NAME = "GD Home Fabric";

/** Default <title> for the home page; child routes use `"%s | GD Home Fabric"`. */
export const SITE_TITLE = "GD Home Fabric | Pillows, tailored by hand";

export const SITE_DESCRIPTION =
  "Goose-feather, down-alternative, memory-foam and natural-fill pillows, bolsters and cushion fillers, weighed to the gram and hand-finished in our own New Delhi workshop.";

export const SITE_LOCALE = "en_IN";

/** Legal entity behind the brand, used in Organization structured data. */
export const SITE_LEGAL_NAME = "HiChoice Exports";

export const SITE_KEYWORDS = [
  "pillows",
  "goose feather pillow",
  "down pillow",
  "microfibre pillow",
  "memory foam pillow",
  "cervical pillow",
  "kapok pillow",
  "body pillow",
  "bolster",
  "cushion fillers",
  "handmade pillows India",
  "New Delhi",
  "GD Home Fabric",
];

/** Social preview image (1200×630), served from /public. */
export const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: "Two plump white pillows against a pale wooden headboard in soft morning light — GD Home Fabric",
} as const;
