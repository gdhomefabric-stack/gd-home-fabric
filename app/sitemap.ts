// Required for `output: "export"`; a no-op for the Node runtime build.
export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/credits`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
