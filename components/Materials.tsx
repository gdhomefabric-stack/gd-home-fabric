"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { ImageAsset, Material } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { cn, Reveal, TextReveal, useSharedScrollVelocity } from "@/lib/motion";

type MaterialsProps = {
  materials: Material[];
  images: Record<string, ImageAsset>;
};

/** Marquee drift when the page is still, in px/s (MOTION.md). */
const BASE_SPEED = 60;

/** How much of the window's scroll velocity (px/s) the marquee borrows. */
const VELOCITY_FACTOR = 0.25;

/**
 * Scroll velocity below this (px/s) does not change the marquee's direction,
 * so the spring settling back to 0 never flips it.
 */
const DIRECTION_THRESHOLD = 10;

/** Exponential smoothing rates (per second) for the base speed and direction. */
const BASE_SMOOTHING = 8;
const DIRECTION_SMOOTHING = 4;

/** Largest frame step the marquee integrates, so a hidden tab cannot teleport it. */
const MAX_FRAME_MS = 64;

/**
 * Each half of the track repeats the list until it holds at least this many
 * cards, so on very wide screens the loop never exposes empty track.
 * With cards capped at 340px this covers viewports up to ~2900px.
 */
const MIN_CARDS_PER_HALF = 8;

/** 1 - e^(-rate * dt): frame-rate independent lerp factor. */
function smoothing(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

export default function Materials({ materials, images }: MaterialsProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. The marquee and the swipeable strip are different markup, so
  // the value has to match the server on the first client render. Touch
  // screens keep the marquee — scroll velocity is highest there and the
  // coupling is the point of the section; a finger on the track pauses the
  // base drift (pointer events) and vertical scrolling passes through
  // (`touch-action: pan-y`). Only reduced motion gets the static strip.
  const reduce = useReducedMotionSafe();
  const strip = reduce;

  // The motion primitives read the reduced-motion preference at mount
  // (`initial={false}` renders the final state directly). Because the safe
  // hook resolves to `true` only after hydration, remount them when it flips
  // so a reduced-motion visitor never keeps the hidden hydration state.
  const motionKey = reduce ? "reduced" : "motion";

  const marqueeRef = useRef<HTMLDivElement>(null);
  const inView = useInView(marqueeRef);
  const active = inView && !strip;

  // Hover / press pause the base drift. Refs rather than state: nothing in the
  // render depends on them, the frame loop just reads them.
  const hoverRef = useRef(false);
  const pressRef = useRef(false);

  // Width of one copy of the track (including its trailing gap); the loop
  // wraps modulo this so the seam is invisible. 0 until measured.
  const firstCopyRef = useRef<HTMLUListElement>(null);
  const halfRef = useRef(0);

  // Smoothed base speed (px/s) and direction (-1..1, +1 = track moves left).
  const baseRef = useRef(0);
  const directionRef = useRef(1);
  const directionTargetRef = useRef(1);

  // Track offset in px, owned by the frame loop below.
  const x = useMotionValue(0);
  const velocity = useSharedScrollVelocity();
  const skewX = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: true });

  useEffect(() => {
    const el = firstCopyRef.current;
    if (!el || strip) return;
    const measure = () => {
      halfRef.current = el.getBoundingClientRect().width;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      halfRef.current = 0;
    };
  }, [strip]);

  const onFrame = useCallback(
    (_time: number, delta: number) => {
      const half = halfRef.current;
      if (!active || half <= 0) return;
      const dt = Math.min(delta, MAX_FRAME_MS) / 1000;

      // Direction follows the scroll direction; idle keeps the last one.
      const v = velocity.get();
      if (v > DIRECTION_THRESHOLD) directionTargetRef.current = 1;
      else if (v < -DIRECTION_THRESHOLD) directionTargetRef.current = -1;
      directionRef.current +=
        (directionTargetRef.current - directionRef.current) * smoothing(DIRECTION_SMOOTHING, dt);

      // Hover pauses only the base drift; scrolling still moves the track.
      const paused = hoverRef.current || pressRef.current;
      baseRef.current += ((paused ? 0 : BASE_SPEED) - baseRef.current) * smoothing(BASE_SMOOTHING, dt);

      // Signed speed: the base drift in the current direction plus a share of
      // the (signed) scroll velocity, i.e. |velocity| * 0.25 along its sign.
      const speed = directionRef.current * baseRef.current + v * VELOCITY_FACTOR;

      // Keep the travelled distance in [0, half) and render it as a negative x.
      let travelled = -x.get() + speed * dt;
      travelled = ((travelled % half) + half) % half;
      x.set(-travelled);
    },
    [active, velocity, x],
  );
  useAnimationFrame(onFrame);

  const reps = Math.max(1, Math.ceil(MIN_CARDS_PER_HALF / Math.max(1, materials.length)));
  const count = String(materials.length).padStart(2, "0");

  // Only the first repetition of the first copy is exposed to assistive tech;
  // every other card is a visual duplicate for the seamless loop. The strip
  // shows a single, non-repeating copy.
  const renderCards = (copy: number) =>
    Array.from({ length: strip ? 1 : reps }, (_, rep) =>
      materials.map((material, i) => (
        <SwatchCard
          key={`${copy}-${rep}-${material.slug}`}
          material={material}
          image={images[material.imageKey]}
          index={i + 1}
          primary={copy === 0 && rep === 0}
          skewX={strip ? undefined : skewX}
        />
      )),
    );

  return (
    <section
      id="materials"
      className="relative w-full scroll-mt-16 overflow-hidden bg-paper pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,10vw,140px)] md:scroll-mt-20"
    >
      {/* Heading, left-aligned inside the gutter */}
      <div className="px-[var(--gutter)]">
        <div
          key={motionKey}
          data-index-avoid
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="flex flex-col gap-4">
            <Reveal>
              <p className="label text-stone-deep">Curtain fabrics and pillow cotton</p>
            </Reveal>
            <TextReveal
              as="h2"
              text="Materials"
              delay={0.08}
              className="font-display text-balance text-[clamp(32px,4vw,56px)] text-ink"
            />
          </div>
          <Reveal delay={0.16}>
            <p className="label text-stone-deep md:mb-2">
              <span className="sr-only">{materials.length} fabrics</span>
              <span aria-hidden="true">{count} fabrics</span>
            </p>
          </Reveal>
        </div>
      </div>

      {/* Marquee, full-bleed. No blur on the reveal: it would re-filter a
          viewport-wide strip of photos every frame while the track moves. */}
      <Reveal key={motionKey} delay={0.2} blur={false} className="mt-10 md:mt-14">
        <div ref={marqueeRef}>
          {strip ? (
            // Reduced motion: a plain, swipeable strip. Nothing moves on its own.
            <div className="w-full overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-3 [scrollbar-width:thin]">
              <ul className="flex w-max gap-6">{renderCards(0)}</ul>
            </div>
          ) : (
            <div
              className="w-full overflow-hidden [touch-action:pan-y]"
              onMouseEnter={() => {
                hoverRef.current = true;
              }}
              onMouseLeave={() => {
                hoverRef.current = false;
              }}
              onPointerDown={() => {
                pressRef.current = true;
              }}
              onPointerUp={() => {
                pressRef.current = false;
              }}
              onPointerCancel={() => {
                pressRef.current = false;
              }}
              // A touch that turns into a scroll ends with `pointercancel`; a
              // plain lift ends with `touchend` without a `pointerup` on some
              // browsers, so release the pause on both.
              onTouchEnd={() => {
                pressRef.current = false;
              }}
            >
              <motion.div
                className="flex w-max select-none will-change-transform"
                style={{ x }}
              >
                {/* Two identical copies; each carries its trailing gap so one copy's
                    width is exactly the wrap length measured above. */}
                <ul ref={firstCopyRef} className="flex gap-6 pr-6">
                  {renderCards(0)}
                </ul>
                <ul className="flex gap-6 pr-6" aria-hidden="true">
                  {renderCards(1)}
                </ul>
              </motion.div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

type SwatchCardProps = {
  material: Material;
  image: ImageAsset | undefined;
  index: number;
  /** The one copy that belongs in the accessibility tree and heading outline. */
  primary: boolean;
  /** Scroll-velocity skew shared by every card in the marquee; absent in the strip. */
  skewX?: MotionValue<number>;
};

function SwatchCard({ material, image, index, primary, skewX }: SwatchCardProps) {
  const nameClass = "font-display text-[clamp(22px,2vw,28px)] text-ink";
  return (
    <motion.li
      className={cn(
        "group w-[clamp(220px,62vw,340px)] shrink-0",
        skewX !== undefined && "will-change-transform",
      )}
      style={skewX ? { skewX } : undefined}
      aria-hidden={primary ? undefined : true}
    >
      <figure className="flex flex-col">
        <div className="img-matte relative aspect-[3/4] w-full overflow-hidden bg-sand">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 560px) 340px, 62vw"
              quality={82}
              draggable={false}
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
            />
          ) : null}
        </div>
        <figcaption className="rule mt-5 flex flex-col gap-2 pt-4">
          <div className="flex items-baseline gap-3">
            <span className="label text-stone-deep">({index}).</span>
            {primary ? (
              <h3 className={nameClass}>{material.name}</h3>
            ) : (
              <p className={nameClass}>{material.name}</p>
            )}
          </div>
          <p className="max-w-[30ch] text-[14px] leading-relaxed text-ink-soft">
            {material.note}
          </p>
        </figcaption>
      </figure>
    </motion.li>
  );
}
