"use client";

/**
 * Collections — `<section id="collection">`.
 *
 * An editorial intro line followed by one `CollectionSection` per collection
 * (`#collection-<slug>`). On ≥lg the text sits in grid columns 3–6 (`lg`) or
 * 2–5 (`xl`) — the leading column(s) are kept clear for the fixed, labelled
 * side index, which needs two columns' width between 1024 and 1279px — and
 * stays sticky while two photos (cols 7–12) stack and drift against the
 * scroll. Below lg the text stacks with a compact rhythm and the two photos
 * share one row (side by side): stacked full-width they alone were ~950px of
 * scrolling per collection on a phone, both linking to the same `#range`.
 *
 * Motion (shared primitives from `@/lib/motion`, see MOTION.md):
 * - Titles: `TextReveal` word masks. The h3 observes itself — an unclipped,
 *   full-height box with a vertical-only viewport margin — so it fires at every
 *   width. The previous build drove the whole text block from one parent
 *   `whileInView` with a `clip-path` wipe on the heading; every element now
 *   carries its own trigger, so no title can be left hidden by a wrapper that
 *   never fired or by a clipped observation rect.
 * - Body, list rows and the CTA: `Reveal` (fade-up + blur-in) in 0.1s delay
 *   steps, capped at 0.4s. The list rows are triggered by the `<ul>` entering
 *   view, not each by itself: a row that lands in the bottom 10% of the
 *   viewport would otherwise sit as an empty ruled line at the fold until the
 *   next scroll. The steps start after the title and body where the sticky
 *   block enters as one (≥lg), and from the first row on the stacked layout.
 *   The `(N).` index and the "N items" label slide in from the left
 *   (`x -16 → 0`, opacity) once their row is in view.
 * - Photos: `ImageReveal` clip wipe + inner scale + scroll parallax (`0.1` for
 *   the upper photo, `0.06` for the lower) + scroll-velocity skew, with
 *   `data-cursor="view"` for the custom cursor. Hover scales the photo 1.04 / 1.2s.
 *   Each photo is a real `#range` link ("View <title> in the range"), so the
 *   "View" cursor leads somewhere: the same glide as "See sizes and prices".
 * - Text column (≥lg): opacity 1 → 0.25 and y 0 → -24px (through `SPRING_SOFT`)
 *   as the sticky block is pushed out by the end of its grid row. The fade is
 *   keyed to the *measured* push point (sticky top + block height + bottom
 *   padding), not to a fixed viewport fraction, so the copy never slides under
 *   the nav at full opacity however tall the block or short the viewport. The
 *   band is biased past the push point so the copy dims as it slides under the
 *   bar, not while it is still standing and fully readable.
 * - Reduced motion: the primitives render their final state; the scroll-linked
 *   values are replaced with their resting values. Nothing stays hidden.
 */

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import type { Collection, ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { useMediaQuery } from "@/lib/media";
import { replaceHash, scrollToTarget } from "@/lib/scroll";
import { EASE_OUT_EXPO, ImageReveal, Reveal, SPRING_SOFT, TextReveal } from "@/lib/motion";

type CollectionsProps = {
  intro: string;
  collections: Collection[];
  images: Record<string, ImageAsset>;
};

/* -------------------------------------------------------------------------- */
/*  Motion vocabulary                                                         */
/* -------------------------------------------------------------------------- */

/** Delay between consecutive reveals inside one text block (MOTION.md: 0.1s steps). */
const STEP = 0.1;
/** Longest a stepped row waits after entering view (rows 1–2 keep full steps). */
const MAX_STEP_DELAY = 0.4;

/**
 * In-view band for the index row: vertical only, so a narrow viewport never
 * shrinks the horizontal band past the content (the primitives use the same).
 */
const ROW_MARGIN = "-10% 0px -10% 0px" as const;

/**
 * The text column fades across this band (px) around the measured push point:
 * it starts just before the push and finishes once ~260px has gone under the
 * bar, so most of the dimming happens while the block is actually leaving.
 */
const FADE_LEAD_PX = 40;
const FADE_TAIL_PX = 260;
/** Push point used until the real one has been measured on the client. */
const DEFAULT_PUSH_AT = 900;

/** Tailwind `lg`: the grid and the sticky column only exist from here. */
const WIDE_QUERY = "(min-width: 1024px)";

/** Responsive `sizes` for the photo column: cols 7–12 of a 1440px grid at ≥lg, half width (two across) below. */
const PHOTO_SIZES = "(min-width: 1440px) 640px, (min-width: 1024px) 46vw, 50vw";

/** The `(N).` index and the "N items" label slide in from the left. */
const SLIDE_HIDDEN = { x: -16, opacity: 0 } as const;
const SLIDE_SHOWN = { x: 0, opacity: 1 } as const;

/** Photo hover (and keyboard focus on its link): 1.04 over 1.2s on the expo curve (MOTION.md). */
const PHOTO_IMG_CLASS =
  "object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04] group-focus-visible:scale-[1.04]";

/** The photo links: the hover group lives here, plus a visible keyboard focus ring. */
const PHOTO_LINK_CLASS =
  "group block focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/** "01" → "(1)." exactly like the reference site. */
function formatIndex(index: string): string {
  const n = Number(index);
  return `(${Number.isFinite(n) ? n : index}).`;
}

/* -------------------------------------------------------------------------- */
/*  Collections                                                               */
/* -------------------------------------------------------------------------- */

export default function Collections({ intro, collections, images }: CollectionsProps) {
  const reduce = useReducedMotionSafe();
  const wide = useMediaQuery(WIDE_QUERY);

  const count = collections.length;
  const countLabel = `${COUNT_WORDS[count] ?? count} ${count === 1 ? "collection" : "collections"}`;

  return (
    <section
      id="collection"
      aria-labelledby="collections-heading"
      className="relative scroll-mt-16 bg-paper text-ink md:scroll-mt-20"
    >
      {/* Intro */}
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[10vh] pb-[4vh] lg:pt-[20vh] lg:pb-[8vh]">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          {/* `data-index-avoid`: the fixed side index fades while this passes under it. */}
          <div data-index-avoid className="lg:col-span-12">
            <Reveal className="flex items-baseline justify-between border-t border-hairline pt-4">
              <h2 id="collections-heading" className="label text-ink">
                Collections
              </h2>
              <span className="label text-stone-deep">{countLabel}</span>
            </Reveal>
          </div>

          <TextReveal
            as="p"
            text={intro}
            delay={STEP}
            className="font-display mt-10 text-balance text-[clamp(32px,4vw,56px)] lg:col-span-9 lg:col-start-3 lg:mt-16 xl:col-start-2"
          />
        </div>
      </div>

      {collections.map((collection) => (
        <CollectionSection
          key={collection.slug}
          collection={collection}
          images={images}
          reduce={reduce}
          wide={wide}
        />
      ))}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CollectionSection                                                         */
/* -------------------------------------------------------------------------- */

type CollectionSectionProps = {
  collection: Collection;
  images: Record<string, ImageAsset>;
  reduce: boolean;
  /** ≥lg: grid layout with the sticky column. */
  wide: boolean;
};

function CollectionSection({ collection, images, reduce, wide }: CollectionSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const headingId = `collection-${collection.slug}-heading`;

  // Where (in viewport px, measured from the top) the section's bottom edge sits
  // at the moment the sticky block starts being pushed out of its grid row:
  // sticky `top` + block height + the row's bottom padding.
  const [pushAt, setPushAt] = useState(DEFAULT_PUSH_AT);
  useEffect(() => {
    const section = ref.current;
    const column = columnRef.current;
    const sticky = stickyRef.current;
    if (!section || !column || !sticky) return;

    const measure = () => {
      const top = Number.parseFloat(getComputedStyle(sticky).top) || 0;
      const tail =
        section.getBoundingClientRect().bottom - column.getBoundingClientRect().bottom;
      setPushAt(Math.round(top + sticky.offsetHeight + Math.max(0, tail)));
    };
    measure();

    window.addEventListener("resize", measure);
    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(sticky);
    observer.observe(section);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Text column: 1 → 0.25 opacity, 0 → -24px across the push point.
  // `useScroll` re-subscribes when the offset strings change.
  const { scrollYProgress: leaving } = useScroll({
    target: ref,
    offset: [`end ${pushAt + FADE_LEAD_PX}px`, `end ${pushAt - FADE_TAIL_PX}px`],
  });
  const textOpacity = useSpring(useTransform(leaving, [0, 1], [1, 0.25]), SPRING_SOFT);
  const textY = useSpring(useTransform(leaving, [0, 1], [0, -24]), SPRING_SOFT);

  // Thin ink rule over the index row that fills as you move through the section.
  const { scrollYProgress: travel } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useTransform(travel, [0.15, 0.85], [0, 1]);

  // Scroll-linked values only apply on the wide layout with motion allowed;
  // stacked and reduced-motion layouts get the resting values.
  const scrollLinked = wide && !reduce;

  // The index row observes itself (it has height and is never clipped) and
  // slides its two labels in from the left. `initial` stays the same object
  // on every render (it matches the server markup) and `animate` is always
  // set; reduced motion snaps to the shown state through an instant
  // transition. Flipping `initial` to `false` once the preference is known
  // would make motion skip the first pass and leave the labels at opacity 0.
  const rowInView = useInView(rowRef, { once: true, margin: ROW_MARGIN });
  const rowShow = reduce || rowInView;
  const slideIn = (delay: number) => ({
    initial: SLIDE_HIDDEN,
    animate: rowShow ? SLIDE_SHOWN : SLIDE_HIDDEN,
    transition: reduce ? { duration: 0 } : { duration: 1, delay, ease: EASE_OUT_EXPO },
  });

  // "See sizes and prices" and both photos lead to the range: plain `#range`
  // anchors, upgraded to the shared glide (`lib/scroll`) when JS is on. The
  // photos carry the "View" cursor, so they have to go somewhere; they are
  // named for the collection they show.
  const goToRange = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("range");
    if (!target) return; // let the browser follow the hash normally
    event.preventDefault();
    scrollToTarget(target, reduce);
    replaceHash("#range");
  };
  const viewLabel = `View ${collection.title} in the range`;

  const [keyA, keyB] = collection.imageKeys;
  const photoA = images[keyA];
  const photoB = images[keyB];
  const productCount = collection.productSlugs.length;
  const itemCount = collection.items.length;

  // Stepped delays only where the sticky block enters as one (≥lg), and never
  // more than MAX_STEP_DELAY; stacked blocks each scroll in on their own and
  // get a single step. Each Reveal has its own `useInView`, so a larger delay
  // would just be dead time after the block has appeared.
  const stepDelay = (n: number) => (wide ? Math.min(STEP * n, MAX_STEP_DELAY) : STEP);

  // The list reveals as one: once the <ul> enters the band every row plays
  // (`trigger="immediate"` from then on), each a step after the last, so no
  // row is left as an empty rule at the fold. Rows keep their own in-view
  // trigger until then, which can only ever show a row earlier.
  const listInView = useInView(listRef, { once: true, margin: ROW_MARGIN });
  const rowTrigger = listInView ? "immediate" : "view";
  const rowDelay = (i: number) => Math.min(STEP * (wide ? 2 + i : 1 + i), MAX_STEP_DELAY);

  return (
    <section
      ref={ref}
      id={`collection-${collection.slug}`}
      aria-labelledby={headingId}
      className="relative scroll-mt-16 md:scroll-mt-20"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[clamp(32px,5vh,56px)] pb-[clamp(56px,8vh,96px)] lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pt-[10vh] lg:pb-[16vh]">
        {/* Text column (see the header: one column further in at `lg` so the
            labelled side index has room; back to column 2 from `xl`). */}
        <div ref={columnRef} className="lg:col-span-4 lg:col-start-3 xl:col-start-2">
          <div ref={stickyRef} className="lg:sticky lg:top-28">
            <motion.div
              style={{
                opacity: scrollLinked ? textOpacity : 1,
                y: scrollLinked ? textY : 0,
              }}
            >
              <div
                ref={rowRef}
                className="relative flex items-baseline justify-between border-t border-hairline pt-4"
              >
                <motion.span
                  aria-hidden
                  className="absolute -top-px left-0 h-px w-full origin-left bg-ink"
                  style={{ scaleX: reduce ? 1 : progress }}
                />
                <motion.span className="label text-ink" {...slideIn(0)}>
                  {formatIndex(collection.index)}
                </motion.span>
                <motion.span className="label text-stone-deep" {...slideIn(STEP)}>
                  {productCount} {productCount === 1 ? "item" : "items"}
                </motion.span>
              </div>

              <TextReveal
                as="h3"
                id={headingId}
                text={collection.title}
                className="font-display mt-8 text-balance text-[clamp(32px,4vw,56px)] lg:mt-12"
              />

              <Reveal delay={STEP}>
                <p className="mt-6 max-w-[46ch] text-ink-soft lg:mt-8">{collection.body}</p>
              </Reveal>

              <ul ref={listRef} className="mt-8 lg:mt-10">
                {collection.items.map((item, i) => (
                  <li key={`${i}-${item}`} className="border-t border-hairline last:border-b">
                    <Reveal
                      trigger={rowTrigger}
                      delay={rowDelay(i)}
                      className="flex items-start gap-5 py-3"
                    >
                      <span className="label w-6 shrink-0 pt-[5px] text-stone-deep tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{item}</span>
                    </Reveal>
                  </li>
                ))}
              </ul>

              <Reveal delay={stepDelay(2 + itemCount)} className="mt-8 lg:mt-10">
                <a
                  href="#range"
                  onClick={goToRange}
                  className="link-line label tap inline-block py-1 text-ink"
                >
                  See sizes and prices
                </a>
              </Reveal>
            </motion.div>
          </div>
        </div>

        {/* Photo column: two across below `lg`, stacked with an offset from
            `lg`. ImageReveal's skew is a vertical shear and its parallax is
            vertical, both inside its own overflow-hidden box, so nothing can
            widen the page. */}
        <div className="mt-12 grid grid-cols-2 items-start gap-3 lg:col-span-6 lg:col-start-7 lg:mt-0 lg:block">
          {photoA ? (
            <figure className="lg:w-[88%]">
              <a href="#range" onClick={goToRange} aria-label={viewLabel} className={PHOTO_LINK_CLASS}>
                <ImageReveal parallax={0.1} cursor="view" className="aspect-[4/5] bg-paper-deep">
                  <Image
                    src={photoA.src}
                    alt={photoA.alt}
                    fill
                    sizes={PHOTO_SIZES}
                    className={PHOTO_IMG_CLASS}
                    style={photoA.objectPosition ? { objectPosition: photoA.objectPosition } : undefined}
                  />
                </ImageReveal>
              </a>
            </figure>
          ) : null}

          {photoB ? (
            <figure className="lg:mt-[20vh] lg:ml-auto lg:w-[88%]">
              <a href="#range" onClick={goToRange} aria-label={viewLabel} className={PHOTO_LINK_CLASS}>
                <ImageReveal parallax={0.06} cursor="view" className="aspect-[3/4] bg-paper-deep">
                  <Image
                    src={photoB.src}
                    alt={photoB.alt}
                    fill
                    sizes={PHOTO_SIZES}
                    className={PHOTO_IMG_CLASS}
                    style={photoB.objectPosition ? { objectPosition: photoB.objectPosition } : undefined}
                  />
                </ImageReveal>
              </a>
            </figure>
          ) : null}
        </div>
      </div>
    </section>
  );
}
