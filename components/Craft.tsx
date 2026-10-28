"use client";

/**
 * Craft (About) — `<section id="craft">`.
 *
 * AESTHETIC.md phase 3: the empty cream between alternating bands is gone.
 * From `lg` the section is two columns. The copy (eyebrow row, word-by-word
 * title, numbered paragraphs and the stats row) sits in grid columns 3–6 at
 * `lg` and 2–5 from `xl` — the leading column(s) stay clear for the fixed,
 * labelled side index, exactly as the Collections text column does — and is
 * sticky while ONE tall photo (the first element of `images`) fills columns
 * 7–12 and bleeds to the right viewport edge (`PHOTO_COLUMN_BLEED`, the same
 * formula as the Collections photo column, so the two columns share one right
 * edge; the section's `overflow-x-clip` keeps the bleed from ever widening the
 * page). Below `lg` the copy stacks and the photo runs full-bleed (`-gutter`
 * on both sides) at `h-[70svh]`. The section ends 8px after the photo so the
 * PhotoBand that follows stacks back to back with it. No second band lives in
 * here.
 *
 * Motion (shared primitives from `@/lib/motion`, see MOTION.md):
 * - Title: `TextReveal` word masks. Eyebrow and paragraphs: `Reveal`
 *   (fade-up + blur-in) in 0.1s steps, capped at 0.4s. Stats: `Reveal` with
 *   the 0.07s card stagger around a `Counter` count-up.
 * - Photo: `ImageReveal` clip wipe + inner scale + 12% scroll parallax +
 *   scroll-velocity skew. It is editorial, not a link, so it carries neither
 *   the "View" cursor nor a hover scale (no false affordance).
 * - A 1px ink rule over the eyebrow row fills as the section travels through
 *   the viewport (`useScroll` → `useTransform` → `useSpring(SPRING_SOFT)`),
 *   the same device Collections uses over its index rows.
 * - Reduced motion: every primitive renders its final state at once and the
 *   rule is drawn in full. Nothing is ever left invisible.
 */

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import type { ImageAsset, SiteContent } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { Counter, ImageReveal, Reveal, SPRING_SOFT, TextReveal, cn } from "@/lib/motion";

type CraftProps = {
  craft: SiteContent["craft"];
  /** The first element is the section's photo (`about-01`); the rest are unused. */
  images: ImageAsset[];
};

/* -------------------------------------------------------------------------- */
/*  Motion vocabulary                                                         */
/* -------------------------------------------------------------------------- */

/** Delay between consecutive reveals inside the text block (MOTION.md: 0.1s steps). */
const STEP = 0.1;
/** Longest a stepped reveal waits after entering view. */
const MAX_STEP_DELAY = 0.4;
/** Card stagger from MOTION.md, used across the stats row. */
const STAT_STAGGER = 0.07;
/** MOTION.md: Craft images drift 12% against the scroll. */
const PHOTO_PARALLAX = 0.12;

/**
 * `next/image` sizes for the photo. From `lg` it spans grid columns 7–12 plus
 * the bleed to the right viewport edge: at 1440px that is 6 × 90px + 5 × 24px
 * + 48px ≈ 708px, and ≈ 49vw at every width from 1024px up (the container is
 * capped at 1440px but the bleed grows with the viewport). Full width below
 * `lg`. Identical to the Collections photo column.
 */
const PHOTO_SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * Photo box: full-bleed and 70svh below `lg`; from `lg` nearly a viewport
 * tall, capped so a very tall monitor does not get a 1600px photo. The paper
 * tone shows through the 1.3s clip wipe.
 */
const PHOTO_BOX_CLASS = "bg-paper-deep h-[70svh] w-full lg:h-[min(92svh,1100px)]";

/**
 * Below `lg` the photo escapes the container's gutter on both sides; from `lg`
 * the column itself carries the bleed (see `PHOTO_COLUMN_BLEED`).
 */
const PHOTO_FIGURE_CLASS = "-mx-[var(--gutter)] lg:mx-0";

/**
 * From `lg` the photo column (grid cols 7–12) bleeds to the right viewport
 * edge: past the container's gutter, and, on viewports wider than the 1440px
 * container, past the centred container's own margin as well
 * (`(100vw - 1440px) / 2`, never negative). The grid item stretches, so a
 * negative right margin widens its box rather than shifting it. On a browser
 * with a layout scrollbar `100vw` overshoots by the bar's width; the section's
 * `overflow-x-clip` swallows that. Same formula as Collections.
 */
const PHOTO_COLUMN_BLEED = "lg:mr-[calc(-1*(max(0px,(100vw_-_1440px)/2)+var(--gutter)))]";

/* -------------------------------------------------------------------------- */
/*  Stat: one count-up figure                                                 */
/* -------------------------------------------------------------------------- */

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
      <p className="font-display text-[clamp(36px,3.4vw,60px)] leading-none text-ink tabular-nums">
        {/* AT reads the author's exact string; the animating copy is decorative. */}
        <span className="sr-only">{value}</span>
        <span aria-hidden="true">{countable ? <Counter value={value} /> : value}</span>
      </p>
      <p className="label mt-3 text-ink-soft">{label}</p>
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Craft section                                                             */
/* -------------------------------------------------------------------------- */

export default function Craft({ craft, images }: CraftProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. Only used here to pin the progress rule at its final state.
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);

  // Thin ink rule over the eyebrow row that fills as the section travels
  // through the viewport; springs so it glides (MOTION.md).
  const { scrollYProgress: travel } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(useTransform(travel, [0.15, 0.85], [0, 1]), SPRING_SOFT);

  const photo: ImageAsset | undefined = images[0];
  const paragraphCount = craft.paragraphs.length;

  // The sticky block enters as one from `lg`, so its parts step after each
  // other: eyebrow (0), title (TextReveal's own stagger), paragraphs, then the
  // stats row. Each Reveal keeps its own in-view trigger, so on the stacked
  // layout a part that enters on its own never waits longer than it must.
  const stepDelay = (n: number) => Math.min(STEP * n, MAX_STEP_DELAY);

  return (
    <section
      ref={ref}
      id="craft"
      aria-labelledby="craft-heading"
      // `overflow-x-clip` (not hidden) gates the right-edge bleed and the
      // skewed photo frame without creating a scroll container, so the bleed
      // can never become horizontal page scroll at any width.
      className="relative w-full scroll-mt-16 overflow-x-clip bg-paper pt-[clamp(96px,12vw,200px)] pb-2 md:scroll-mt-20"
    >
      {/* The grid keeps its default `stretch` alignment on purpose: the text
          column's grid item grows to the photo's height, which is the room
          the sticky block inside it needs to travel. */}
      <div className="mx-auto w-full max-w-[1440px] px-[var(--gutter)] lg:grid lg:grid-cols-12 lg:gap-x-6">
        {/* Text column. `data-index-avoid`: the fixed side index fades while
            this copy sits under its own box (it never does from `lg`, where
            the leading column is kept clear, but the stacked layout and any
            future column shift stay covered). */}
        <div
          data-index-avoid
          // Bottom padding on the stretched grid item, not the sticky block:
          // the block's travel ends that much above the photo's bottom edge,
          // so the stats row never sits hard against the band that follows.
          className="lg:col-span-4 lg:col-start-3 lg:pb-[clamp(48px,6vw,96px)] xl:col-start-2"
        >
          <div className="lg:sticky lg:top-28">
            {/* Eyebrow row under a hairline that fills with section progress. */}
            <div className="relative rule pt-4">
              <motion.span
                aria-hidden
                className="absolute -top-px left-0 h-px w-full origin-left bg-ink"
                style={{ scaleX: reduce ? 1 : progress }}
              />
              <Reveal>
                <p className="label text-ink">{craft.eyebrow}</p>
              </Reveal>
            </div>

            {/* Word-by-word title: the shared TextReveal, like every other
                section title (same 0.045s/1.1s/EASE_OUT_EXPO timing,
                hydration-safe `initial`, final state at once under reduced
                motion). */}
            <TextReveal
              as="h2"
              id="craft-heading"
              text={craft.title}
              delay={STEP}
              className="font-display mt-8 text-balance text-[clamp(32px,4vw,56px)] text-ink lg:mt-12"
            />

            {/* Numbered paragraphs, `(1).` in the label style like the
                reference, separated by hairlines. */}
            {paragraphCount > 0 ? (
              <div className="mt-8 divide-y divide-hairline lg:mt-10">
                {craft.paragraphs.map((paragraph, i) => (
                  <Reveal
                    key={`${i}-${paragraph.slice(0, 24)}`}
                    delay={stepDelay(2 + i)}
                    className="grid grid-cols-[2.75rem_1fr] py-5 first:pt-0 last:pb-0"
                  >
                    <span className="label pt-[5px] text-stone-deep tabular-nums">({i + 1}).</span>
                    <p className="max-w-[44ch] text-[15px] leading-[1.7] text-ink-soft">{paragraph}</p>
                  </Reveal>
                ))}
              </div>
            ) : null}

            {/* Stats row with count-up, under the text. */}
            {craft.stats.length > 0 ? (
              <div className="rule mt-10 grid grid-cols-3 gap-x-4 pt-6 lg:mt-12">
                {craft.stats.map((stat, i) => (
                  <Stat
                    key={`${stat.label}-${i}`}
                    value={stat.value}
                    label={stat.label}
                    delay={stepDelay(2 + paragraphCount) + i * STAT_STAGGER}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Photo column. Below `lg` the figure bleeds past both gutters; from
            `lg` the column is grid cols 7–12 bleeding to the right viewport
            edge (AESTHETIC.md, like Collections). The grid item stretches to
            the row, so the sticky text column opposite has the photo's whole
            height to travel. ImageReveal's skew is a vertical shear and its
            parallax layer is vertical, both inside its own overflow-hidden
            box, so neither can widen the page. */}
        {photo ? (
          <div
            className={cn(
              "mt-[clamp(56px,10vw,96px)] lg:col-span-6 lg:col-start-7 lg:mt-0",
              PHOTO_COLUMN_BLEED,
            )}
          >
            <figure className={PHOTO_FIGURE_CLASS}>
              <ImageReveal parallax={PHOTO_PARALLAX} className={PHOTO_BOX_CLASS}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={PHOTO_SIZES}
                  className="object-cover"
                  style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
                />
              </ImageReveal>
            </figure>
          </div>
        ) : null}
      </div>
    </section>
  );
}
