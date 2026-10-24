import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { content } from "@/lib/content";
import { images, type ImageKey } from "@/lib/images";
import type { ImageAsset } from "@/lib/types";
import { Reveal } from "@/lib/motion";
import { SITE_URL } from "@/lib/site";
import Cursor from "@/components/Cursor";

export const metadata: Metadata = {
  title: "Image credits",
  description: `Photographers behind the pictures on ${new URL(SITE_URL).host}, all via Unsplash.`,
  alternates: { canonical: "/credits" },
  openGraph: { url: "/credits" },
};

/** "Photo by Jane Doe on Unsplash" → "Jane Doe"; anything else is passed through. */
function photographerOf(credit: string): string {
  const match = credit.match(/^photo by\s+(.+?)\s+on\s+unsplash\.?$/i);
  return match ? match[1] : credit;
}

/** Thumbnails sit in a fixed 72px column on phones and 96px from `sm` up. */
const THUMB_SIZES = "(min-width: 640px) 96px, 72px";

export default function CreditsPage() {
  const entries = Object.entries(images) as Array<[ImageKey, ImageAsset]>;
  const { wordmark } = content.brand;

  return (
    // `min-h-screen bg-paper`: the route panel in app/template.tsx slides up
    // off a full-height paper page rather than off bare <body>.
    <div className="min-h-screen bg-paper text-ink">
      <Cursor />
      <header className="px-[var(--gutter)]">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between md:h-20">
          <Link
            href="/"
            aria-label={`${wordmark} — home`}
            className="font-display text-[22px] leading-none tracking-tight md:text-[24px]"
          >
            {wordmark}
          </Link>
          <Link href="/" className="label link-line py-2">
            Back to the site
          </Link>
        </div>
      </header>

      <main className="px-[var(--gutter)] pt-[clamp(40px,6vw,96px)] pb-[clamp(72px,10vw,140px)]">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="rule flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Credits</span>
            <span className="label text-stone-deep">
              {entries.length} {entries.length === 1 ? "photograph" : "photographs"}
            </span>
          </div>

          <h1 className="font-display mt-6 text-[clamp(32px,4vw,56px)] text-ink">Image credits</h1>

          <p className="mt-5 max-w-[46ch] text-ink-soft">
            Photographs via{" "}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer"
              className="link-line text-ink"
            >
              Unsplash
            </a>
            , used under the{" "}
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noreferrer"
              className="link-line text-ink"
            >
              Unsplash License
            </a>
            . Our thanks to every photographer below.
          </p>

          {/* The list (~40 thumbnails) fades in once the route panel from
              app/template.tsx has cleared the header, so its arrival reads as
              part of the wipe rather than a page that was already sitting
              there; immediate under reduced motion. */}
          <Reveal trigger="immediate" delay={0.6} blur={false}>
          <ol className="mt-12 border-b border-hairline lg:mt-16">
            {entries.map(([key, asset], i) => (
              <li
                key={key}
                className="rule grid grid-cols-[72px_minmax(0,1fr)] gap-x-5 gap-y-3 py-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-x-8 sm:py-6"
              >
                <div className="img-matte relative aspect-[4/5] w-full overflow-hidden bg-paper-deep">
                  <Image
                    src={asset.src}
                    alt={asset.alt}
                    fill
                    sizes={THUMB_SIZES}
                    quality={70}
                    className="object-cover"
                    style={asset.objectPosition ? { objectPosition: asset.objectPosition } : undefined}
                  />
                </div>

                <div className="min-w-0">
                  <p className="label text-stone-deep tabular-nums">
                    ({i + 1}). <span className="normal-case tracking-normal">{key}</span>
                  </p>
                  <p className="mt-2 text-ink">{asset.alt}</p>
                  <p className="mt-2 text-[14px] text-ink-soft sm:hidden">
                    Photo by{" "}
                    <CreditLink asset={asset} />
                  </p>
                </div>

                <p className="hidden self-start text-right text-[14px] text-ink-soft sm:block sm:max-w-[22ch]">
                  Photo by <CreditLink asset={asset} />
                </p>
              </li>
            ))}
          </ol>
          </Reveal>

          <div className="mt-12 flex flex-wrap items-baseline justify-between gap-6 lg:mt-16">
            <Link href="/" className="label link-line py-2 text-ink">
              ← Back to the site
            </Link>
            <p className="label text-stone-deep">{content.footer.legal}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function CreditLink({ asset }: { asset: ImageAsset }) {
  const name = photographerOf(asset.credit);
  if (!asset.creditUrl) return <span className="text-ink">{name}</span>;
  return (
    <a
      href={asset.creditUrl}
      target="_blank"
      rel="noreferrer"
      className="link-line text-ink"
    >
      {name}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
