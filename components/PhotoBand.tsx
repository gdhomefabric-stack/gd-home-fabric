"use client";

/**
 * PhotoBand (AESTHETIC.md, phase 3): a full-bleed photograph between sections
 * with one serif line bottom-left. Photos dominate; the cream is for the text
 * columns only, so the band has no padding of its own and runs edge to edge.
 *
 * Full bleed. The page content is centred inside the gutters, so the band
 * pulls itself out to the viewport width: `relative left-1/2 w-screen
 * -translate-x-1/2`. `w-screen` is 100vw, which on a desktop with a classic
 * scrollbar is a little wider than the usable viewport; the outer wrapper is
 * `overflow-x-clip` so that excess is clipped rather than becoming horizontal
 * scroll (the bar for every bleed on the page).
 *
 * Motion. The outer band box is observed and tracked (never clip-path'd, see
 * ImageReveal for why an observed box must keep its full rect). Inside it:
 * a clip layer that wipes open from the top (`inset(0 0 100% 0)` to open,
 * 1.3s EASE_IN_OUT) and, inside that, the photo layer, which is 10% taller
 * than the band at each end and drifts y 8% to -8% across the band's passage
 * through the viewport (useScroll "start end" to "end start", through
 * SPRING_SOFT) while settling scale 1.08 to 1 on reveal. Reduced motion: the
 * clip is open, the scale is 1, the layer sits still, every word is shown.
 */

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import type { ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { EASE_IN_OUT, EASE_OUT_EXPO, Reveal, SPRING_SOFT, TextReveal, cn } from "@/lib/motion";

type BandHeight = "70svh" | "85svh";

type PhotoBandProps = {
  image: ImageAsset;
  /** one serif line, bottom-left, in paper (FACTS.md copy only) */
  line: string;
  /** optional small caps label above the line */
  eyebrow?: string;
  /** viewport share the band takes; `70svh` by default */
  height?: BandHeight;
};

/** Literal class names so Tailwind can see them (no templating at runtime). */
const HEIGHT_CLASS: Record<BandHeight, string> = {
  "70svh": "h-[70svh]",
  "85svh": "h-[70svh] lg:h-[85svh]",
};

/** Fraction of the band height the photo drifts in each direction. */
const DRIFT = 0.08;

const CLIP_CLOSED = { clipPath: "inset(0 0 100% 0)" } as const;
const CLIP_OPEN = { clipPath: "inset(0% 0 0% 0)" } as const;
const SCALE_HIDDEN = { scale: 1.08 } as const;
const SCALE_SHOWN = { scale: 1 } as const;
const INSTANT = { duration: 0 } as const;

/** The band is wider than it is tall and fills the viewport width everywhere. */
const SIZES = "100vw";

export default function PhotoBand({ image, line, eyebrow, height = "70svh" }: PhotoBandProps) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);

  // Reveal once the band's own (unclipped) box is a little inside the viewport.
  const inView = useInView(ref, { once: true, margin: "-6% 0px -6% 0px" });
  const show = reduce || inView;

  // 0 when the band's top meets the viewport bottom, 1 when its bottom leaves
  // the viewport top: the whole passage, so the drift is symmetric.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rawY = useTransform(scrollYProgress, [0, 1], [`${DRIFT * 100}%`, `-${DRIFT * 100}%`]);
  const y = useSpring(rawY, SPRING_SOFT);
  const useParallax = !reduce;

  return (
    <section className="w-full overflow-x-clip">
      <div
        ref={ref}
        className={cn(
          "relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-stone",
          "min-h-[360px]",
          HEIGHT_CLASS[height],
        )}
      >
        {/* Clip wipe. `initial` is the same object on every render (matches the
            server markup) and `animate` is always set; reduced motion snaps
            open through the instant transition rather than flipping `initial`
            to `false`, which would make motion skip the first pass. */}
        <motion.div
          className="img-matte absolute inset-0 overflow-hidden"
          initial={CLIP_CLOSED}
          animate={show ? CLIP_OPEN : CLIP_CLOSED}
          transition={reduce ? INSTANT : { duration: 1.3, ease: EASE_IN_OUT }}
        >
          {/* Photo layer: 10% taller than the band at each end so the parallax
              drift never exposes an edge; settles 1.08 to 1 on reveal. */}
          <motion.div
            className={cn(
              "absolute inset-x-0 will-change-transform",
              useParallax ? "-inset-y-[10%]" : "inset-y-0",
            )}
            style={useParallax ? { y } : undefined}
            initial={SCALE_HIDDEN}
            animate={show ? SCALE_SHOWN : SCALE_HIDDEN}
            transition={reduce ? INSTANT : { duration: 1.6, ease: EASE_OUT_EXPO }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              loading="lazy"
              quality={80}
              sizes={SIZES}
              className="object-cover"
              style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
            />
          </motion.div>
        </motion.div>

        {/* Bottom scrim so the paper line reads over any photo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-ink/65 via-ink/25 via-45% to-transparent"
        />

        {/* Copy, bottom-left inside the page gutters. `data-index-avoid` on the
            text block (not the photo): the fixed side index sits over photos
            by design but fades while this line passes under its box. */}
        <div className="absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-[clamp(28px,5vw,72px)]">
          <div data-index-avoid className="mx-auto w-full max-w-[1440px]">
            {eyebrow ? (
              <Reveal y={12} className="mb-4 lg:mb-6">
                <span className="label block text-paper/80">{eyebrow}</span>
              </Reveal>
            ) : null}
            <TextReveal
              as="p"
              text={line}
              delay={eyebrow ? 0.1 : 0}
              className="font-display max-w-[24ch] text-balance text-[clamp(28px,4vw,64px)] text-paper"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
