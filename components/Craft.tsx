"use client";

import Image from "next/image";
import type { ImageAsset, SiteContent } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { Counter, ImageReveal, Reveal, TextReveal, cn } from "@/lib/motion";

type CraftProps = {
  craft: SiteContent["craft"];
  images: ImageAsset[];
};

/** Card stagger from MOTION.md. */
const STAT_STAGGER = 0.07;

/** `next/image` sizes for the half-width band photo (full width below lg). */
const BAND_SIZES = "(min-width: 1440px) 720px, (min-width: 1024px) 50vw, 100vw";

/**
 * Keeps the first grid column clear for the fixed side index at `lg`, like the
 * Collections text column (see ProductGrid for the arithmetic).
 */
const INDEX_CLEAR =
  "lg:pl-[calc(min(100%,1440px)/12_+_24px)] xl:pl-[calc(min(100%,1440px)/12_+_2px)]";

/* ---------------------------------------------------------------------------
   Band: one alternating image / text row
   --------------------------------------------------------------------------- */

type BandProps = {
  index: number;
  paragraph: string | undefined;
  image: ImageAsset | undefined;
  reduce: boolean;
};

function Band({ index, paragraph, image, reduce }: BandProps) {
  const flip = index % 2 === 1;

  return (
    <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-6">
      {image ? (
        // Clip wipe + inner scale + 12% parallax + velocity skew, all from the
        // shared primitive. The primitive's outer box is `overflow-hidden`, so
        // the oversized parallax layer never bleeds out of the band.
        <ImageReveal
          parallax={0.12}
          skew
          cursor="view"
          className={cn(
            "aspect-[4/5] w-full bg-stone",
            "lg:col-span-6 lg:row-start-1",
            flip ? "lg:col-start-7" : "lg:col-start-1",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 will-change-transform",
              !reduce &&
                "transition-transform duration-[1200ms] ease-out-expo hover:scale-[1.04]",
            )}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={BAND_SIZES}
              className="object-cover"
            />
          </div>
        </ImageReveal>
      ) : null}

      {paragraph ? (
        <Reveal
          delay={0.15}
          className={cn(
            "lg:row-start-1",
            image ? "lg:col-span-4 lg:self-center" : "lg:col-span-6 lg:col-start-4",
            image && (flip ? "lg:col-start-2" : "lg:col-start-8"),
          )}
        >
          <p className="label text-stone-deep">({index + 1}).</p>
          <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.7] text-ink-soft">
            {paragraph}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Stat: one count-up figure
   --------------------------------------------------------------------------- */

type StatProps = {
  value: string;
  label: string;
  delay: number;
};

function Stat({ value, label, delay }: StatProps) {
  // Values without a digit have nothing to count; render them as static text.
  const countable = /\d/.test(value);

  return (
    <Reveal delay={delay} className="min-w-0">
      <p className="font-display text-[clamp(40px,5vw,76px)] leading-none text-ink tabular-nums">
        {/* AT reads the author's exact string; the animating copy is decorative. */}
        <span className="sr-only">{value}</span>
        <span aria-hidden="true">
          {countable ? <Counter value={value} /> : value}
        </span>
      </p>
      <p className="label mt-3 text-ink-soft">{label}</p>
    </Reveal>
  );
}

/* ---------------------------------------------------------------------------
   Craft section
   --------------------------------------------------------------------------- */

export default function Craft({ craft, images }: CraftProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. Only used here to switch off the hover scale.
  const reduce = useReducedMotionSafe();

  const bandCount = Math.max(craft.paragraphs.length, images.length);

  return (
    <section
      id="craft"
      aria-labelledby="craft-heading"
      // `overflow-x-clip` (not hidden) keeps the skewed photo frames from ever
      // widening the page at 375px without creating a scroll container.
      className="relative w-full scroll-mt-16 overflow-x-clip bg-paper px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,10vw,140px)] md:scroll-mt-20"
    >
      <div className={cn("mx-auto w-full max-w-[1440px]", INDEX_CLEAR)}>
        {/* Header: eyebrow + word-by-word title (the shared TextReveal, like
            every other section title: same 0.045s/1.1s/EASE_OUT_EXPO timing,
            hydration-safe `initial`, final state at once under reduced motion). */}
        <div data-index-avoid className="rule grid grid-cols-1 gap-y-6 pt-6 lg:grid-cols-12 lg:gap-x-6">
          <Reveal className="lg:col-span-2">
            <p className="label text-stone-deep">{craft.eyebrow}</p>
          </Reveal>

          <TextReveal
            as="h2"
            id="craft-heading"
            text={craft.title}
            className="font-display text-balance text-[clamp(32px,4vw,56px)] text-ink lg:col-span-9 lg:col-start-3"
          />
        </div>

        {/* Alternating image / text bands */}
        {bandCount > 0 ? (
          <div className="mt-[clamp(56px,8vw,120px)] space-y-[clamp(64px,10vw,140px)]">
            {Array.from({ length: bandCount }, (_, i) => (
              <Band
                key={i}
                index={i}
                paragraph={craft.paragraphs[i]}
                image={images[i]}
                reduce={reduce}
              />
            ))}
          </div>
        ) : null}

        {/* Stats row with count-up */}
        {craft.stats.length > 0 ? (
          <div
            data-index-avoid
            className="rule mt-[clamp(64px,10vw,140px)] grid grid-cols-2 gap-x-6 gap-y-10 pt-8 md:grid-cols-4"
          >
            {craft.stats.map((stat, i) => (
              <Stat
                key={`${stat.label}-${i}`}
                value={stat.value}
                label={stat.label}
                delay={i * STAT_STAGGER}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
