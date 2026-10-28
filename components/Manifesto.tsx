"use client";

/**
 * Manifesto: AESTHETIC.md phase 3, the full-viewport band right after the hero.
 *
 * A dark, blurred, full-bleed photo with one serif paragraph on the right half
 * whose words brighten as the band scrolls through. The photo is scaled 1.1 so
 * the 10px blur never shows a soft transparent edge, and sits on `bg-ink` so
 * the band is dark from the first paint, before the lazy photo arrives.
 *
 * Words. The paragraph is split on whitespace into inline spans, with the real
 * spaces between them, so it still reads, copies and finds as one sentence.
 * Each word's opacity goes 0.25 → 1 as the section's scroll progress
 * (`useScroll`, "start 80%" → "end 60%") passes its slot; one `useTransform`
 * per word, no spring, so the front tracks the scroll exactly. The slots
 * cover only the first `SPAN` of the range, so the last word is fully lit
 * while the band still fills 60% of the viewport, well before it leaves.
 * Neighbouring words overlap by `FEATHER` slots so the front is a soft
 * gradient rather than a step.
 *
 * Reduced motion: every word sits at 1. The blur and darkening are static CSS,
 * so there is nothing else to switch off. The server renders progress 0 (every
 * word at 0.25) and the preference is applied after hydration through the
 * bound motion values, so the markup never differs between server and client.
 */

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import type { ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { Reveal } from "@/lib/motion";

type ManifestoProps = {
  image: ImageAsset;
  eyebrow: string;
  text: string;
};

/** Opacity of a word the scroll has not reached yet. */
const DIM = 0.25;

/**
 * Share of the scroll range (0–1) across which the words light up. With the
 * section's offset "start 80%" → "end 60%", progress `SPAN` is reached while
 * 70% of the band is still on screen, so the whole paragraph is lit before
 * the band leaves.
 */
const SPAN = 0.9;

/** How many word-slots one word takes to brighten (neighbours overlap). */
const FEATHER = 2.5;

type WordProps = {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
  reduced: boolean;
};

function Word({ word, progress, start, end, reduced }: WordProps) {
  // `useTransform` clamps outside [start, end], so a word is never dimmer than
  // DIM nor brighter than 1 however far the band scrolls.
  const raw = useTransform(progress, [start, end], [DIM, 1]);
  // Reduced motion snaps to 1 through the same bound value (see Hero), so the
  // server-rendered 0.25 is overwritten as soon as the preference is known.
  const opacity = useTransform(raw, (v) => (reduced ? 1 : v));
  return <motion.span style={{ opacity }}>{word}</motion.span>;
}

export default function Manifesto({ image, eyebrow, text }: ManifestoProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();

  // 0 when the band's top meets 80% of the viewport height (it has just come
  // in from below), 1 when its bottom meets 60% (it is mostly past).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });

  const words = text.split(/\s+/).filter(Boolean);
  const slot = SPAN / Math.max(1, words.length);

  const children: ReactNode[] = [];
  words.forEach((word, i) => {
    if (i > 0) children.push(" ");
    const start = i * slot;
    const end = Math.min(SPAN, (i + FEATHER) * slot);
    children.push(
      <Word
        key={`${word}-${i}`}
        word={word}
        progress={scrollYProgress}
        start={start}
        end={end}
        reduced={reduced}
      />,
    );
  });

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-ink text-paper"
    >
      {/* Photo: darkened and blurred (static CSS), scaled 1.1 so the blur has no
          soft edge inside the box. Lazy, full-width sizes; only the hero is
          `priority`. The blur makes fine detail irrelevant, so quality 70
          (allow-listed in next.config) keeps the bytes down. */}
      <div className="img-matte absolute inset-0 scale-110 blur-[10px] brightness-[0.7]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          quality={70}
          sizes="100vw"
          className="object-cover"
          style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
        />
      </div>

      {/* Bottom-to-top scrim: anchors the eyebrow and settles the band's lower
          edge before the cream of the next section. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-ink/55 via-ink/20 via-50% to-transparent"
      />

      {/* Copy: paragraph on the right half (cols 7–12 from lg), centred in the
          band with enough bottom room to clear the eyebrow on any viewport. */}
      <div className="relative flex min-h-[100svh] flex-col justify-center px-[var(--gutter)] pt-[clamp(112px,16svh,180px)] pb-[clamp(128px,18svh,200px)]">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-12 gap-x-6">
          <p className="font-display col-span-12 text-pretty text-[clamp(28px,3.3vw,50px)] leading-[1.15] text-paper md:col-span-10 lg:col-span-6 lg:col-start-7 lg:indent-[2em]">
            {children}
          </p>
        </div>
      </div>

      {/* Eyebrow, bottom-left, on the site's text column from lg so it sits
          clear of the fixed side index; `data-index-avoid` fades the index if
          they ever do meet (narrow lg). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-[clamp(24px,4vw,48px)]">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-12 gap-x-6">
          <Reveal y={12} className="col-span-12 lg:col-span-4 lg:col-start-3 xl:col-start-2">
            <p data-index-avoid className="label text-paper/80">
              {eyebrow}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
