"use client";

/**
 * Materials (INTERACTIVE.md §2, phase 4): a drag-scrub gallery of fabric
 * swatches on top of the phase-2 velocity marquee.
 *
 * One source of truth for the track position: the `x` MotionValue. The drag
 * gesture writes to it while the visitor holds the track (and during the
 * inertia that follows a release); the frame loop advances it the rest of the
 * time, at 0.4× the phase-2 base speed plus a share of the window's scroll
 * velocity, direction following the scroll. The loop never touches `x` while
 * the drag or its inertia owns it, and resumes from wherever the drag left it.
 *
 * Wrapping. The track holds three identical copies of the card list, each at
 * least MIN_CARDS_PER_HALF cards wide, and the loop keeps `x` inside the
 * middle copy (`x` in (-2·half, -half]) by stepping it by exactly one copy's
 * width, which the eye cannot see. A drag therefore always starts with at
 * least one copy of room to the right and one to the left before the
 * `dragConstraints` (the real ends of the track) resist, and the loop re-wraps
 * it into the middle once the inertia settles, so dragging never reaches an
 * empty end.
 *
 * Each swatch is a lightbox trigger (`data-cursor="open"`, the section's
 * photos as the set) with cursor-follow parallax (`useCursorParallax`).
 * A click that ends a drag is swallowed so a scrub never opens the viewer.
 *
 * Reduced motion: a plain, swipeable strip; nothing moves on its own and
 * nothing is draggable, but the photos still open the lightbox.
 *
 * The section paints no background: the ScrollTint behind <main>'s content
 * holds #efe9df here and ramps to ink as the About below enters. Its last
 * captions are still in view while that happens, so every text colour has a
 * `[[data-theme=dark]_&]:text-paper` twin (and the hairlines `paper/20`) like
 * Craft, eased over 0.7s, and the copy never sits ink on ink.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
import { useLightbox } from "@/lib/lightbox";
import {
  cn,
  Reveal,
  Rule,
  TextReveal,
  useCursorParallax,
  useSharedScrollVelocity,
} from "@/lib/motion";

type MaterialsProps = {
  materials: Material[];
  images: Record<string, ImageAsset>;
};

/** Dark-theme twins (see the header): text to paper, hairlines to paper/20. */
const DARK = "transition-colors duration-700 ease-in-out-soft [[data-theme=dark]_&]:text-paper";
const DARK_RULE = "[[data-theme=dark]_&]:bg-paper/20";

/** Phase-2 marquee drift in px/s (MOTION.md); the gallery idles at a share of it. */
const BASE_SPEED = 60;

/** INTERACTIVE.md §2: the marquee keeps running underneath at 0.4× when idle. */
const IDLE_FACTOR = 0.4;

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
 * Each copy of the track repeats the list until it holds at least this many
 * cards, so on very wide screens one copy always covers the viewport. With
 * cards capped at 560px (plus the 24px gap) one copy is at least ~4600px
 * wide, more than any viewport the card clamp is sized for.
 */
const MIN_CARDS_PER_HALF = 8;

/** Copies of the card list on the track: the middle one is where `x` rests. */
const COPIES = 3;

/** Gap between cards, px (`gap-6`), carried by each copy as trailing padding. */
const GAP = 24;

/** ms after a drag ends during which a click on a swatch is ignored. */
const CLICK_GUARD_MS = 120;

/** 1 - e^(-rate * dt): frame-rate independent lerp factor. */
function smoothing(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

type Constraints = { left: number; right: number };

export default function Materials({ materials, images }: MaterialsProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. The gallery and the swipeable strip are different markup, so
  // the value has to match the server on the first client render. Touch
  // screens keep the gallery (a finger drags it; vertical scrolling passes
  // through, motion sets `touch-action: pan-y` for `drag="x"`). Only reduced
  // motion gets the static strip.
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

  // A press pauses the base drift before the drag threshold is crossed; the
  // drag itself (and its inertia) takes `x` away from the loop entirely.
  // Refs rather than state: nothing in the render depends on them, the frame
  // loop just reads them.
  const pressRef = useRef(false);
  const draggingRef = useRef(false);
  const dragEndedAtRef = useRef(0);

  // Width of one copy of the track (including its trailing gap); the loop
  // wraps modulo this so the seam is invisible. 0 until measured.
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstCopyRef = useRef<HTMLUListElement>(null);
  const halfRef = useRef(0);

  // The real ends of the track, for the drag: three copies wide, less the
  // viewport. Re-measured when either resizes.
  const [constraints, setConstraints] = useState<Constraints>({ left: 0, right: 0 });

  // Smoothed base speed (px/s) and direction (-1..1, +1 = track moves left).
  const baseRef = useRef(0);
  const directionRef = useRef(1);
  const directionTargetRef = useRef(1);

  // Track offset in px: the drag's MotionValue, advanced by the loop when idle.
  const x = useMotionValue(0);
  const velocity = useSharedScrollVelocity();
  const skewX = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: true });

  useEffect(() => {
    const copy = firstCopyRef.current;
    const viewport = viewportRef.current;
    if (!copy || !viewport || strip) return;
    const measure = () => {
      const half = copy.getBoundingClientRect().width;
      halfRef.current = half;
      const track = half * COPIES - GAP;
      const left = Math.min(0, viewport.clientWidth - track);
      setConstraints((c) => (c.left === left && c.right === 0 ? c : { left, right: 0 }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      halfRef.current = 0;
    };
  }, [strip]);

  const onFrame = useCallback(
    (_time: number, delta: number) => {
      const half = halfRef.current;
      if (!active || half <= 0) return;
      // The drag, and the inertia after it, own `x` until they settle.
      if (draggingRef.current || x.isAnimating()) return;
      const dt = Math.min(delta, MAX_FRAME_MS) / 1000;

      // Direction follows the scroll direction; idle keeps the last one.
      const v = velocity.get();
      if (v > DIRECTION_THRESHOLD) directionTargetRef.current = 1;
      else if (v < -DIRECTION_THRESHOLD) directionTargetRef.current = -1;
      directionRef.current +=
        (directionTargetRef.current - directionRef.current) * smoothing(DIRECTION_SMOOTHING, dt);

      // A press pauses only the base drift; scrolling still moves the track.
      const idle = pressRef.current ? 0 : BASE_SPEED * IDLE_FACTOR;
      baseRef.current += (idle - baseRef.current) * smoothing(BASE_SMOOTHING, dt);

      // Signed speed: the base drift in the current direction plus a share of
      // the (signed) scroll velocity, i.e. |velocity| * 0.25 along its sign.
      const speed = directionRef.current * baseRef.current + v * VELOCITY_FACTOR;

      // Keep the travelled distance inside the middle copy, [half, 2·half),
      // and render it as a negative x. Stepping by exactly `half` is invisible.
      let travelled = -x.get() + speed * dt;
      travelled = ((((travelled - half) % half) + half) % half) + half;
      x.set(-travelled);
    },
    [active, velocity, x],
  );
  useAnimationFrame(onFrame);

  const reps = Math.max(1, Math.ceil(MIN_CARDS_PER_HALF / Math.max(1, materials.length)));
  const count = String(materials.length).padStart(2, "0");

  // The section's photos, in order, as one lightbox set; a swatch whose image
  // the manifest does not carry is not a trigger and has no place in the set.
  const gallery = useMemo(() => {
    const list: ImageAsset[] = [];
    const indexBySlug = new Map<string, number>();
    for (const m of materials) {
      const image = images[m.imageKey];
      if (!image) continue;
      indexBySlug.set(m.slug, list.length);
      list.push(image);
    }
    return { list, indexBySlug };
  }, [materials, images]);

  // A click that finishes a drag must not open the viewer. Motion fires the
  // click after the pointer lifts, so a short guard after `onDragEnd` covers it.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current || performance.now() - dragEndedAtRef.current < CLICK_GUARD_MS) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

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
          gallery={gallery.list}
          galleryIndex={gallery.indexBySlug.get(material.slug) ?? -1}
        />
      )),
    );

  return (
    <section
      id="materials"
      // No background: the ScrollTint holds its #efe9df stop through here.
      className="relative w-full scroll-mt-16 overflow-hidden py-[clamp(96px,12vw,200px)] md:scroll-mt-20"
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
              <p className={cn("label text-stone-deep", DARK)}>Curtain fabrics and pillow cotton</p>
            </Reveal>
            <TextReveal
              as="h2"
              text="Materials"
              markup
              delay={0.08}
              className={cn(
                "font-display text-balance text-[clamp(48px,6.5vw,104px)] font-light leading-[0.95] tracking-[-0.02em] text-ink",
                DARK,
              )}
            />
          </div>
          <Reveal delay={0.16}>
            <p className={cn("label text-stone-deep md:mb-2", DARK)}>
              <span className="sr-only">{materials.length} fabrics</span>
              <span aria-hidden="true">{count} fabrics</span>
            </p>
          </Reveal>
        </div>
      </div>

      {/* Gallery, full-bleed. No blur on the reveal: it would re-filter a
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
              ref={viewportRef}
              data-cursor="drag"
              className="w-full cursor-grab overflow-hidden active:cursor-grabbing [perspective:1200px]"
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
              onClickCapture={onClickCapture}
            >
              <motion.div
                className="flex w-max select-none will-change-transform"
                style={{ x }}
                drag="x"
                dragConstraints={constraints}
                dragElastic={0.08}
                dragTransition={{ power: 0.3, timeConstant: 250 }}
                onDragStart={() => {
                  draggingRef.current = true;
                }}
                onDragEnd={() => {
                  draggingRef.current = false;
                  dragEndedAtRef.current = performance.now();
                }}
              >
                {/* Three identical copies; each carries its trailing gap so one
                    copy's width is exactly the wrap length measured above. */}
                <ul ref={firstCopyRef} className="flex gap-6 pr-6">
                  {renderCards(0)}
                </ul>
                <ul className="flex gap-6 pr-6" aria-hidden="true">
                  {renderCards(1)}
                </ul>
                <ul className="flex gap-6 pr-6" aria-hidden="true">
                  {renderCards(2)}
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
  /** Scroll-velocity skew shared by every card in the gallery; absent in the strip. */
  skewX?: MotionValue<number>;
  /** The section's photos, the lightbox set this swatch opens into. */
  gallery: ImageAsset[];
  /** This swatch's place in `gallery`; -1 when its photo is missing. */
  galleryIndex: number;
};

function SwatchCard({ material, image, index, primary, skewX, gallery, galleryIndex }: SwatchCardProps) {
  const { open } = useLightbox();
  const cardRef = useRef<HTMLLIElement>(null);
  const { x, y, rotateX, rotateY, onPointerMove, onPointerLeave } = useCursorParallax(cardRef);
  const nameClass = cn("font-display text-[clamp(28px,2.6vw,40px)] font-light leading-tight text-ink", DARK);

  return (
    <motion.li
      ref={cardRef}
      className="group w-[clamp(340px,40vw,560px)] shrink-0 will-change-transform"
      style={{ skewX, rotateX, rotateY, transformPerspective: 1200 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden={primary ? undefined : true}
    >
      <figure className="flex flex-col">
        {image && galleryIndex >= 0 ? (
          <button
            type="button"
            data-cursor="open"
            aria-label={`Open photo: ${image.alt}`}
            // Duplicate copies stay out of the tab order (they are aria-hidden).
            tabIndex={primary ? 0 : -1}
            onClick={() => open(gallery, galleryIndex)}
            className="img-matte relative block aspect-[3/4] w-full cursor-pointer overflow-hidden bg-sand"
          >
            {/* The inner layer overhangs by the parallax reach so the ±12px
                translate never shows the matte behind it. */}
            <motion.div className="absolute -inset-3" style={{ x, y }}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1400px) 560px, (min-width: 850px) 40vw, 340px"
                quality={82}
                draggable={false}
                className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              />
            </motion.div>
          </button>
        ) : (
          <div className="img-matte relative aspect-[3/4] w-full overflow-hidden bg-sand" />
        )}
        <figcaption className="mt-5 flex flex-col gap-2">
          <Rule className={DARK_RULE} />
          <div className="flex items-baseline gap-3 pt-2">
            <span className={cn("label text-stone-deep", DARK)}>({index}).</span>
            {primary ? (
              <h3 className={nameClass}>{material.name}</h3>
            ) : (
              <p className={nameClass}>{material.name}</p>
            )}
          </div>
          <p className={cn("max-w-[30ch] text-[14px] leading-relaxed text-ink-soft", DARK)}>
            {material.note}
          </p>
        </figcaption>
      </figure>
    </motion.li>
  );
}
