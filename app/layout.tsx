import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

/**
 * Root metadata. `openGraph` and `twitter` deliberately carry no title or
 * description: Next fills those from each route's own `title`/`description`
 * (postProcessMetadata → inheritFromMetadata), so /credits and the 404 get
 * their own share-card text while inheriting the image, locale and site name
 * set here. Twitter images likewise fall back to the Open Graph image.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    // Emits og:url (Next only does so when `url` is set); child routes override it.
    url: "/",
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts are self-hosted from /public/fonts (Cormorant Garamond 300/400 +
          italic, Hanken Grotesk variable; OFL) via a plain stylesheet rather
          than next/font so the build never needs network access. The latin
          faces that paint above the fold are preloaded (the Cormorant 300 and
          400 weights share one file, and the hero's italic accent needs the
          italic); the latin-ext subsets (₹ sign, accents) load on demand
          through unicode-range.
        */}
        <link
          rel="preload"
          href="/fonts/cormorant-garamond-400-normal-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/cormorant-garamond-400-italic-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/hanken-grotesk-variable-normal-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        {/*
          No-JS fallback. Every reveal primitive server-renders its hidden
          state (word masks at translateY(110%), fades at opacity 0, photo
          wipes clipped) and relies on hydration to play it; with scripts off,
          or a failed bundle, the visitor would see bare paper. This only
          applies when scripts are off, so motion is untouched. The footer's
          giant wordmark keeps its faded weight.
        */}
        <noscript>
          <style>{`[style]{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}footer [data-curtain="mark"] p{opacity:.06!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
