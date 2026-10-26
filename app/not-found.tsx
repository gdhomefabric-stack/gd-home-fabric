import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for is not here.",
  // Replaces the layout's index/follow so the 404 does not carry two conflicting robots tags.
  robots: { index: false, follow: true },
  // No canonical: the layout's `/` would otherwise declare the home page as
  // this noindex page's canonical, a contradictory signal.
  alternates: { canonical: null },
};

/**
 * Root 404. A server component with no motion: the route panel in
 * app/template.tsx still wipes in over it, and `min-h-svh bg-paper` gives
 * that panel a full paper page to slide off rather than bare <body>. The copy
 * sits bottom-left like the hero headline, so the page reads as part of the
 * site rather than a form left half-filled.
 * Next injects `<meta name="robots" content="noindex">` for 404 responses.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-paper text-ink">
      <header className="px-[var(--gutter)]">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center md:h-20">
          <Link
            href="/"
            aria-label={`${SITE_NAME}, home`}
            className="font-display text-[22px] leading-none tracking-tight md:text-[24px]"
          >
            {SITE_NAME.toUpperCase()}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-end px-[var(--gutter)] pt-[clamp(64px,12vw,160px)] pb-[clamp(100px,14svh,112px)]">
        <div className="mx-auto w-full max-w-[1440px]">
          <p className="label text-stone-deep">404</p>
          <h1 className="font-display mt-6 max-w-[14ch] text-[clamp(32px,4vw,56px)] text-ink">
            This page has been slept through.
          </h1>
          <p className="mt-5 max-w-[46ch] text-ink-soft">
            The address you followed does not lead anywhere on this site.
          </p>
          <Link href="/" className="label link-line tap mt-10 inline-block py-2 text-ink">
            ← Back to the site
          </Link>
        </div>
      </main>
    </div>
  );
}
