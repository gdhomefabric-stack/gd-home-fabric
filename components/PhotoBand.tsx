"use client";

/**
 * PhotoBand (INTERACTIVE.md §2, phase 4): a full-bleed photograph between
 * sections with one serif line bottom-left. Photos dominate; the cream is for
 * the text columns only, so the band has no padding of its own and runs edge
 * to edge.
 *
 * Pinned zoom (desktop, motion allowed). The band is a `h-[250svh]` scroll
 * track with a `sticky top-0 h-[100svh]` photo inside, so the photo holds the
 * viewport for 150 vh of scrolling. Across that pin (`useScroll` on the track,
 * "start start" to "end end", through SPRING_SOFT) the photo settles from
 * scale 1.35 to 1 and the line rises from below the fold (y 40 vh to 0,
 * opacity 0 to 1 over the first 40 % of the pin). After the pin the track
 * simply scrolls away.
 *
 * Below `lg`, and under reduced motion, there is no pin: a plain band at the
 * `height` prop (70 svh by default) with the phase-3 clip wipe, scale settle
 * and ±8 % drift (reduced motion: open, still, every word shown).
 *
 * Full bleed. The page content is centred inside the gutters, so the track
 * pulls itself out to the viewport width: `relative left-1/2 w-screen
 * -translate-x-1/2`. The bleed lives on the track, not on the sticky box:
 * `left` on a sticky element is a sticky inset, not an offset. `w-screen` is
 * 100vw, which on a desktop with a classic scrollbar is a little wider than
 * the usable viewport; the outer section is `overflow-x-clip` so that excess
 * is clipped rather than becoming horizontal scroll. (`clip`, never `hidden`:
 * an `overflow: hidden` ancestor would become the sticky box's scrollport and
 * the pin would never engage.)
 *
 * The photo is a lightbox trigger (`data-cursor="open"`): one button filling
 * the band, opening the viewer on this one photo.
 */

import { useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import type { ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { useLightbox } from "@/lib/lightbox";
import { EASE_IN_OUT, EASE_OUT_EXPO, Reveal, SPRING_SOFT, TextReveal, cn } from "@/lib/motion";

type BandHeight = "70svh" | "85svh";

type PhotoBandProps = {
  image: ImageAsset;
  /** one serif line, bottom-left, in paper (FACTS.md copy only; `*word*` sets an italic accent) */
  line: string;
  /** optional small caps label above the line */
  eyebrow?: string;
  /** viewport share the unpinned band takes; `70svh` by default */
  height?: BandHeight;
};

/** Literal class names so Tailwind can see them (no templating at runtime). */
const HEIGHT_CLASS: Record<BandHeight, string> = {
  "70svh": "h-[70svh]",
  "85svh": "h-[70svh] lg:h-[85svh]",
};

/** Fraction of the band height the unpinned photo drifts in each direction. */
const DRIFT = 0.08;

/** Inner scale at the start of the pin. */
const PIN_SCALE_FROM = 1.35;

/** Share of the pin over which the line rises and fades in. */
const LINE_RISE_END = 0.4;

/** vh the line starts below its resting place. */
const LINE_RISE_VH = 40;

const CLIP_CLOSED = { clipPath: "inset(0 0 100% 0)" } as const;
const CLIP_OPEN = { clipPath: "inset(0% 0 0% 0)" } as const;
const SCALE_HIDDEN = { scale: 1.08 } as const;
const SCALE_SHOWN = { scale: 1 } as const;
const INSTANT = { duration: 0 } as const;

/** The band is wider than it is tall and fills the viewport width everywhere. */
const SIZES = "100vw";

/** Tailwind's `lg` breakpoint, the width from which the band pins. */
const LG_QUERY = "(min-width: 64rem)";

const subscribeLg = (onChange: () => void) => {
  const mql = window.matchMedia(LG_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

/**
 * `true` from the `lg` breakpoint up; `false` on the server and during
 * hydration so the first client render matches the server markup (the pin
 * only changes classes and styles, never the element tree, but the sticky
 * height must not flip mid-hydration either).
 */
function useIsLarge(): boolean {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG_QUERY).matches,
    () => false,
  );
}

export default function PhotoBand({ image, line, eyebrow, height = "70svh" }: PhotoBandProps) {
  const reduce = useReducedMotionSafe();
  const large = useIsLarge();
  const pinned = large && !reduce;
  const { open } = useLightbox();

  // The scroll track: the observed, scroll-tracked box (never clip-path'd,
  // see ImageReveal for why an observed box must keep its full rect).
  const ref = useRef<HTMLDivElement>(null);

  // Reveal once the track's own (unclipped) box is a little inside the viewport.
  const inView = useInView(ref, { once: true, margin: "-6% 0px -6% 0px" });
  const show = reduce || inView;

  // Pin progress: 0 when the track's top meets the viewport top (the photo
  // takes the viewport), 1 when the track's bottom meets the viewport bottom
  // (the photo is about to scroll away). Only read while pinned.
  const { scrollYProgress: pinProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const pinScale = useSpring(useTransform(pinProgress, [0, 1], [PIN_SCALE_FROM, 1]), SPRING_SOFT);
  const lineRise = useSpring(
    useTransform(pinProgress, [0, LINE_RISE_END], [LINE_RISE_VH, 0], { clamp: true }),
    SPRING_SOFT,
  );
  const lineY = useTransform(lineRise, (vh) => `${vh}vh`);
  const lineOpacity = useSpring(
    useTransform(pinProgress, [0, LINE_RISE_END], [0, 1], { clamp: true }),
    SPRING_SOFT,
  );

  // Unpinned drift: 0 when the band's top meets the viewport bottom, 1 when
  // its bottom leaves the viewport top: the whole passage, so the drift is
  // symmetric. Only read while not pinned.
  const { scrollYProgress: passProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawY = useTransform(passProgress, [0, 1], [`${DRIFT * 100}%`, `-${DRIFT * 100}%`]);
  const driftY = useSpring(rawY, SPRING_SOFT);
  const useDrift = !reduce && !pinned;

  const photoStyle = pinned ? { scale: pinScale } : useDrift ? { y: driftY } : undefined;

  return (
    <section className="w-full overflow-x-clip">
      <div
        ref={ref}
        className={cn(
          "relative left-1/2 w-screen -translate-x-1/2",
          pinned ? "h-[250svh]" : cn("min-h-[360px]", HEIGHT_CLASS[height]),
        )}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden bg-stone",
            pinned ? "sticky top-0 h-[100svh] min-h-[360px]" : "h-full",
          )}
        >
          {/* Clip wipe. `initial` is the same object on every render (matches
              the server markup) and `animate` is always set; reduced motion
              snaps open through the instant transition rather than flipping
              `initial` to `false`, which would make motion skip the first pass. */}
          <motion.div
            className="img-matte absolute inset-0 overflow-hidden"
            initial={CLIP_CLOSED}
            animate={show ? CLIP_OPEN : CLIP_CLOSED}
            transition={reduce ? INSTANT : { duration: 1.3, ease: EASE_IN_OUT }}
          >
            {/* One button fills the band: the lightbox trigger. The photo
                layer inside is 10% taller than the band at each end when it
                drifts, so the parallax never exposes an edge; it settles 1.08
                to 1 on reveal, and while pinned the scroll-linked scale takes
                over from 1.35 (the reveal settle has long finished by then). */}
            <button
              type="button"
              data-cursor="open"
              aria-label={`Open photo: ${image.alt}`}
              onClick={() => open([image], 0)}
              className="absolute inset-0 block w-full cursor-pointer"
            >
              {/* Two layers so the reveal settle (`animate`) and the scroll-
                  linked scale or drift (`style` MotionValues) never share a
                  transform key on one element: an `animate` on a key that a
                  spring also drives would stop the spring. */}
              <motion.div
                className="absolute inset-0 will-change-transform"
                initial={SCALE_HIDDEN}
                animate={show ? SCALE_SHOWN : SCALE_HIDDEN}
                transition={reduce ? INSTANT : { duration: 1.6, ease: EASE_OUT_EXPO }}
              >
                <motion.div
                  className={cn(
                    "absolute inset-x-0 will-change-transform",
                    useDrift ? "-inset-y-[10%]" : "inset-y-0",
                  )}
                  style={photoStyle}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    loading="lazy"
                    quality={80}
                    sizes={SIZES}
                    draggable={false}
                    className="object-cover"
                    style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
                  />
                </motion.div>
              </motion.div>
            </button>
          </motion.div>

          {/* Bottom scrim so the paper line reads over any photo. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-ink/65 via-ink/25 via-45% to-transparent"
          />

          {/* Copy, bottom-left inside the page gutters. `pointer-events-none`
              on the block so the photo button underneath stays clickable
              through it. `data-index-avoid` on the text block (not the photo):
              the fixed side index sits over photos by design but fades while
              this line passes under its box. While pinned the whole block
              rises from below the fold with the pin's first 40 %. */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-[clamp(28px,5vw,72px)] will-change-transform"
            style={pinned ? { y: lineY, opacity: lineOpacity } : undefined}
          >
            <div data-index-avoid className="mx-auto w-full max-w-[1440px]">
              {eyebrow ? (
                <Reveal y={12} className="mb-4 lg:mb-6">
                  <span className="label block text-paper/80">{eyebrow}</span>
                </Reveal>
              ) : null}
              <TextReveal
                as="p"
                text={line}
                markup
                delay={eyebrow ? 0.1 : 0}
                className="font-display max-w-[22ch] text-balance text-[clamp(40px,6vw,104px)] font-light leading-[1.02] tracking-[-0.01em] text-paper"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
