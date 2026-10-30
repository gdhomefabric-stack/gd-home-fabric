"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import type { HeroVideo as HeroVideoSource, ImageAsset } from "@/lib/types";
import HeroVideo from "@/components/HeroVideo";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import {
  EASE_IN_OUT,
  EASE_OUT_EXPO,
  EASE_SOFT,
  Reveal,
  SPRING_SOFT,
  TextReveal,
  useReady,
} from "@/lib/motion";

type HeroProps = {
  image: ImageAsset;
  /** When set, the brand film replaces the photo (no blur, no Ken Burns). */
  video?: HeroVideoSource;
  headline: string;
  sub: string;
};

/** Share of the first viewport scroll over which the image sharpens/settles. */
const FOCUS_END = 0.6;

/** Window scroll (px) over which the "scroll" hint fades out. */
const HINT_FADE_PX = 60;

/** One-off settle of the photo once the preloader lets go (MOTION.md: 1.12 → 1). */
const SETTLE_FROM = { scale: 1.12 } as const;
const SETTLE_TO = { scale: 1 } as const;

/**
 * Slow Ken Burns (INTERACTIVE.md): the photo breathes 1 → 1.08 over 20s and
 * back, forever, on its own layer under the settle so the two compose. Static
 * under reduced motion (the layer keeps the server's `scale: 1`).
 */
const KEN_BURNS_FROM = { scale: 1 } as const;
const KEN_BURNS_TO = { scale: 1.08 } as const;
const KEN_BURNS_TRANSITION = {
  duration: 20,
  ease: EASE_SOFT,
  repeat: Infinity,
  repeatType: "mirror",
} as const;

/** The headline's letters rise one by one once the preloader lets go (INTERACTIVE.md). */
const HEADLINE_STAGGER = 0.02;

/**
 * The preloader panel slides up over 1.1s and its bottom edge clears the
 * headline band roughly 0.4s in. The headline starts just before that so the
 * words are still rising as they are uncovered; the sub follows at 0.5s
 * (MOTION.md) and the hint last.
 */
const HEADLINE_DELAY = 0.3;
const SUB_DELAY = 0.5;
const HINT_DELAY = 0.9;

/**
 * Safety net: if no preloader ever fires `gdhf:exiting`/`gdhf:ready`, the
 * `trigger="ready"` primitives would otherwise keep the <h1> hidden forever.
 */
const READY_FALLBACK_MS = 4000;

export default function Hero({ image, video, headline, sub }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. The scroll hint below renders different markup under reduced
  // motion, so the value has to match the server on the first client render.
  const reduce = useReducedMotionSafe();

  // The copy stays hidden until the preloader starts to leave so the page is
  // already composed when it is uncovered (`useReady` also resolves at once
  // when the document is already marked exiting/ready, e.g. client-side nav).
  const ready = useReady();
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFallback(true), READY_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, []);
  const trigger = fallback ? "immediate" : "ready";
  const show = ready || fallback || reduce;

  // Scroll-linked image treatment: 0 when the section top meets the viewport
  // top, 1 when the section bottom reaches the viewport top.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, SPRING_SOFT);

  // Under reduced motion every scroll-linked value sits at its rest state. The
  // values stay bound to `style` either way, so the server-rendered styles are
  // overwritten as soon as the preference is known (see useReducedMotionSafe).
  const blurRaw = useTransform(progress, [0, FOCUS_END], ["blur(28px)", "blur(0px)"]);
  const scaleRaw = useTransform(progress, [0, FOCUS_END], [1.12, 1]);
  // Gentle parallax as the hero leaves; never exposes the top edge because
  // the shift is always smaller than the portion already scrolled past.
  const imageYRaw = useTransform(progress, [0, 1], ["0%", "12%"]);
  const filter = useTransform(blurRaw, (v) => (reduce ? "blur(0px)" : v));
  const scale = useTransform(scaleRaw, (v) => (reduce ? 1 : v));
  const imageY = useTransform(imageYRaw, (v) => (reduce ? "0%" : v));

  // The scroll hint is gone after 60px of window scroll (the hero sits at the
  // very top of the page, so window scroll == hero scroll).
  const { scrollY } = useScroll();
  const hintOpacityRaw = useTransform(scrollY, [0, HINT_FADE_PX], [1, 0]);
  const hintOpacity = useSpring(hintOpacityRaw, SPRING_SOFT);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative h-svh min-h-[560px] w-full overflow-hidden bg-stone"
    >
      {video ? (
        // Brand film: full-bleed, sharp from the first frame; only the gentle
        // parallax remains so the hero still leaves the screen softly.
        <motion.div className="absolute inset-0 bg-ink will-change-transform" style={{ y: imageY }}>
          <HeroVideo video={video} label={`${image.alt}. GD Home Fabric brand film.`} />
        </motion.div>
      ) : (
      <>
      {/* Photo. Outer wrapper: scroll-linked blur/scale/parallax. Middle
          wrapper: one-off settle `scale 1.12 → 1` once the preloader lets go.
          Inner wrapper: the 20s Ken Burns loop. All three compose because they
          live on separate elements. */}
      <motion.div
        className="img-matte absolute inset-0 will-change-[transform,filter]"
        style={{ filter, scale, y: imageY }}
      >
        {/* `initial` is the same object on every render (it matches the server
            markup) and `animate` is always set; reduced motion snaps to 1 through
            the instant transition instead of flipping `initial` to `false`,
            which would make motion skip the first pass and leave the 1.12. */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={SETTLE_FROM}
          animate={show ? SETTLE_TO : SETTLE_FROM}
          transition={reduce ? { duration: 0 } : { duration: 1.6, ease: EASE_OUT_EXPO }}
        >
          {/* Ken Burns. `initial` matches the server (scale 1) on every render;
              reduced motion simply never animates away from it. */}
          <motion.div
            className="absolute inset-0 will-change-transform"
            initial={KEN_BURNS_FROM}
            animate={reduce ? KEN_BURNS_FROM : KEN_BURNS_TO}
            transition={reduce ? { duration: 0 } : KEN_BURNS_TRANSITION}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              quality={85}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </motion.div>
      </>
      )}

      {/* Bottom scrim: fades the photo into the paper so the next section blends. */}
      <div
        aria-hidden="true"
        className={
          video
            ? "pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-ink/75 via-ink/30 via-45% to-transparent"
            : "pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-paper via-paper/55 via-45% to-transparent"
        }
      />

      {/* Copy. Bottom padding clears the 51px scroll hint by ≥29px even on a 667px-tall phone. */}
      <div className="absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-[clamp(100px,14svh,112px)]">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-12 items-end gap-x-6 gap-y-8">
          {/* Letter by letter (INTERACTIVE.md); `markup` sets the author's
              `*word*` in italic. */}
          <TextReveal
            as="h1"
            text={headline}
            trigger={trigger}
            delay={HEADLINE_DELAY}
            stagger={HEADLINE_STAGGER}
            byLetter
            markup
            className={`font-display col-span-12 text-balance text-[clamp(64px,10vw,168px)] font-light leading-[0.95] tracking-[-0.02em] md:col-span-8 lg:col-span-9 ${video ? "text-paper" : "text-ink"}`}
          />

          <Reveal
            trigger={trigger}
            delay={SUB_DELAY}
            className={`col-span-12 max-w-[32ch] md:col-span-4 md:col-start-9 md:mb-2 md:justify-self-end lg:col-span-3 lg:col-start-10 ${video ? "text-paper/85" : "text-ink-soft"}`}
          >
            <p>{sub}</p>
          </Reveal>
        </div>
      </div>

      {/* Scroll hint, bottom-centre. Outer: entrance reveal. Inner: fades out on scroll. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <Reveal trigger={trigger} delay={HINT_DELAY} y={12}>
          <motion.div
            className={`flex flex-col items-center gap-2 ${video ? "text-paper" : "text-ink"}`}
            style={{ opacity: hintOpacity }}
          >
            <span className="label">Scroll</span>
            {/* 1px track; the ink line inside grows from the top on a 2s loop
                (MOTION.md), then fades out before the next pass so the reset
                is never a hard cut back to zero. */}
            <span className={`relative block h-8 w-px overflow-hidden ${video ? "bg-paper/30" : "bg-ink/25"}`} aria-hidden="true">
              {reduce ? (
                <span className={`absolute inset-0 ${video ? "bg-paper" : "bg-ink"}`} />
              ) : (
                <motion.span
                  className={`absolute inset-0 origin-top will-change-transform ${video ? "bg-paper" : "bg-ink"}`}
                  animate={{ scaleY: [0, 1, 1], opacity: [1, 1, 0] }}
                  transition={{
                    duration: 2,
                    times: [0, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 0.3,
                    ease: EASE_IN_OUT,
                  }}
                />
              )}
            </span>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
