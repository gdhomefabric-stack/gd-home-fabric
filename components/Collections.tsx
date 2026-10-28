"use client";

/**
 * Collections — `<section id="collection">`.
 *
 * An editorial intro line followed by one `CollectionSection` per collection
 * (`#collection-<slug>`). Phase 3 (AESTHETIC.md): the photographs dominate.
 *
 * Layout ≥lg: the text sits in grid columns 3–6 (`lg`) or 2–5 (`xl`), the
 * leading column(s) kept clear for the fixed, labelled side index (which needs
 * two columns' width between 1024 and 1279px), and stays sticky while the
 * photo column (cols 7–12) runs past the gutter to the right viewport edge.
 * The photos stack back to back (8px gaps), each nearly a viewport tall
 * (`min(92svh, 1100px)`), so consecutive collections read as one continuous
 * strip of photography beside a narrow cream text column. The bleed is a
 * negative right margin on the column, clipped by the outer section's
 * `overflow-x-clip` (clip, not hidden: it must not become a scroll container,
 * or the sticky text would stop sticking and the page could scroll sideways).
 *
 * Layout <lg: the text stacks first, then the photos full-bleed
 * (`-mx-[var(--gutter)]`) at `70svh`, 8px apart. Only the first two show
 * there (`hidden lg:block` on the third): three 70svh photos back to back
 * would be a 210svh wall with the copy long scrolled away, and a
 * `display:none` lazy image is never fetched, so phones skip those bytes.
 *
 * Photos: two or three per collection (`imageKeys`, in order). A key missing
 * from the `images` map is skipped, never a crash and never an empty box.
 *
 * Motion (shared primitives from `@/lib/motion`, see MOTION.md):
 * - Titles: `TextReveal` word masks. The h3 observes itself, an unclipped,
 *   full-height box with a vertical-only viewport margin, so it fires at every
 *   width. Every element carries its own trigger, so no title can be left
 *   hidden by a wrapper that never fired or by a clipped observation rect.
 * - Body, list rows and the CTA: `Reveal` (fade-up + blur-in) in 0.1s delay
 *   steps, capped at 0.4s. The list rows are triggered by the `<ul>` entering
 *   view, not each by itself: a row that lands in the bottom 10% of the
 *   viewport would otherwise sit as an empty ruled line at the fold until the
 *   next scroll. The steps start after the title and body where the sticky
 *   block enters as one (≥lg), and from the first row on the stacked layout.
 *   The `(N).` index and the "N items" label slide in from the left
 *   (`x -16 → 0`, opacity) once their row is in view.
 * - Photos: `ImageReveal` clip wipe + inner scale + scroll parallax (0.08) +
 *   scroll-velocity skew, with `data-cursor="view"` for the custom cursor.
 *   Hover scales the photo 1.04 / 1.2s. Each photo is a real `#range` link
 *   ("View <title> in the range"), so the "View" cursor leads somewhere: the
 *   same glide as "See sizes and prices". The skew is a vertical shear and the
 *   parallax is vertical, both inside the reveal's own overflow-hidden box, so
 *   neither can widen the page.
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
import type Lenis from "lenis";
import type { Collection, ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { useMediaQuery } from "@/lib/media";
import { replaceHash, scrollToTarget } from "@/lib/scroll";
import { cn, EASE_OUT_EXPO, ImageReveal, Reveal, SPRING_SOFT, TextReveal } from "@/lib/motion";

declare global {
  interface Window {
    /**
     * Owned and assigned by `components/SmoothScroll.tsx`. Repeated here with
     * the identical type (as `SideIndex.tsx` does) so `lib/scroll`, which
     * reads it for the `#range` glide, typechecks when this component is
     * compiled on its own; interface merging accepts the duplicate because
     * the types match.
     */
    __lenis?: Lenis;
  }
}

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

/** Scroll parallax for every column photo (AESTHETIC.md: 0.08, skew on). */
const PHOTO_PARALLAX = 0.08;

/**
 * Responsive `sizes` for a portrait photo, which `object-cover` fits to the
 * column's width. From `lg` the column is grid columns 7–12 plus the bleed to
 * the right viewport edge, which works out at ~49vw at every width from
 * 1024px up (the container is capped at 1440px but the bleed grows with the
 * viewport); below `lg` each photo is full-bleed.
 */
const PORTRAIT_SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * A landscape photo in the tall box is fitted by *height* instead, so the
 * pixels it needs are the box height times its aspect: about the viewport's
 * width from `lg` (92svh at 3:2 on a 16:10 screen) and well over it on a
 * phone (70svh of a tall screen). A width-only `sizes` would fetch a 750px
 * variant and stretch it 1.6x across an 828px box.
 */
const LANDSCAPE_SIZES = "(min-width: 1024px) 100vw, 160vw";

/** The `sizes` that keep a cover-fitted photo sharp for its orientation. */
const photoSizes = (asset: ImageAsset): string =>
  asset.width > asset.height ? LANDSCAPE_SIZES : PORTRAIT_SIZES;

/**
 * Photo boxes: full-bleed and 70svh below `lg`; from `lg` nearly a viewport
 * tall, capped so a very tall monitor does not get a 1600px photo. The paper
 * tone shows through the 1.3s clip wipe.
 */
const PHOTO_BOX_CLASS = "bg-paper-deep h-[70svh] lg:h-[min(92svh,1100px)]";

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
 * `overflow-x-clip` swallows that.
 */
const PHOTO_COLUMN_BLEED = "lg:mr-[calc(-1*(max(0px,(100vw_-_1440px)/2)+var(--gutter)))]";

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

type Photo = { key: string; asset: ImageAsset };

/**
 * The collection's photos in `imageKeys` order, dropping any key the manifest
 * does not carry (the integrator only passes the entries it has; a missing
 * file must not break the section or leave a blank box).
 */
function resolvePhotos(keys: readonly string[], images: Record<string, ImageAsset>): Photo[] {
  const photos: Photo[] = [];
  for (const key of keys) {
    const asset = images[key];
    if (asset) photos.push({ key, asset });
  }
  return photos;
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
      // `overflow-x-clip` (not hidden): the photo column's right bleed and the
      // sub-lg full-bleed photos end at the viewport edge, and anything past it
      // (a layout scrollbar's width) is clipped without a scroll container, so
      // the sticky text column keeps sticking to the window.
      className="relative overflow-x-clip scroll-mt-16 bg-paper text-ink md:scroll-mt-20"
    >
      {/* Intro */}
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[clamp(96px,12vw,200px)] pb-[clamp(24px,3vw,48px)]">
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
            className="font-display mt-8 text-balance text-[clamp(22px,2.2vw,32px)] lg:col-span-8 lg:col-start-3 lg:mt-10 xl:col-start-2"
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

  // "See sizes and prices" and every photo lead to the range: plain `#range`
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

  const photos = resolvePhotos(collection.imageKeys, images);
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
      {/* Almost no cream between collections: from `lg` the row ends 8px
          (`pb-2`, the same as the photo gap) before the next collection's
          first photo, and starts flush so its text sits level with the top of
          its first photo until the sticky offset takes over. Below `lg` the
          text block gets its own breathing space above and the photos end the
          section flush. */}
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[clamp(48px,7vh,72px)] lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pt-0 lg:pb-2">
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

        {/* Photo column: the photos stack back to back, 8px apart. Full-bleed
            below `lg`; from `lg` grid cols 7–12 bleeding to the right viewport
            edge. The grid item stretches to the row, so the sticky text column
            opposite has the whole stack's height to travel. */}
        {photos.length > 0 ? (
          <div
            className={cn(
              "mt-10 flex flex-col gap-2 lg:col-span-6 lg:col-start-7 lg:mt-0",
              PHOTO_COLUMN_BLEED,
            )}
          >
            {photos.map(({ key, asset }, i) => (
              <figure
                key={`${key}-${i}`}
                className={cn(PHOTO_FIGURE_CLASS, i >= 2 && "hidden lg:block")}
              >
                <a href="#range" onClick={goToRange} aria-label={viewLabel} className={PHOTO_LINK_CLASS}>
                  <ImageReveal parallax={PHOTO_PARALLAX} cursor="view" className={PHOTO_BOX_CLASS}>
                    <Image
                      src={asset.src}
                      alt={asset.alt}
                      fill
                      sizes={photoSizes(asset)}
                      className={PHOTO_IMG_CLASS}
                      style={asset.objectPosition ? { objectPosition: asset.objectPosition } : undefined}
                    />
                  </ImageReveal>
                </a>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
