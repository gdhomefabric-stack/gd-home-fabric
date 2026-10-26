"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SizeRow } from "@/lib/types";
import { EASE_SOFT, Reveal, SPRING_SOFT, TextReveal, cn } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

type SizeGuideProps = {
  rows: SizeRow[];
};

/** The canvas the outline is drawn on, in viewBox units. */
const VIEW_W = 240;
const VIEW_H = 160;
/** Breathing room so the largest size's stroke never touches the edge. */
const PAD = 16;
/** Inset of the inner "piping" line that makes the outline read as a pillow. */
const PIPING = 6;

/** MOTION.md: table rows `Reveal` with a 0.06s stagger. */
const ROW_STAGGER = 0.06;
/** Rows rise a little less than a paragraph so they stay inside their cells. */
const ROW_Y = 20;
/** Readout crossfade: `y 8 → 0` with opacity, old value leaves upward. */
const READOUT_Y = 8;
const READOUT_DURATION = 0.35;

/**
 * Keeps the first grid column clear for the fixed side index at `lg`, like the
 * Collections text column (see ProductGrid for the arithmetic).
 */
const INDEX_CLEAR =
  "lg:pl-[calc(min(100%,1440px)/12_+_24px)] xl:pl-[calc(min(100%,1440px)/12_+_2px)]";

/** A pillow footprint in inches. `w` is the long edge and is drawn horizontally. */
type Dims = { w: number; h: number };

/** Fallback for a row whose size string has no "A × B" pair in it. */
const DEFAULT_DIMS: Dims = { w: 30, h: 20 };

/**
 * Pull the two inch figures out of strings like "17 × 27 in", "16 x 16 in"
 * or "20×36". Pillows are shown lying flat, so the larger figure is the width.
 */
function parseInches(size: string): Dims | null {
  const match = /(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)/i.exec(size);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { w: Math.max(a, b), h: Math.min(a, b) };
}

/** Two-decimal rounding so server and client emit identical attribute strings. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function SizeGuide({ rows }: SizeGuideProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference, so `initial` matches the server-rendered styles.
  const reduceMotion = useReducedMotionSafe();
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * One scale for every row, derived from the largest size, so hovering
   * between rows shows true relative proportions rather than each size
   * filling the box on its own.
   */
  const { dims, scale, largest } = useMemo(() => {
    const parsed = rows.map((row) => parseInches(row.size) ?? DEFAULT_DIMS);
    const pool = parsed.length > 0 ? parsed : [DEFAULT_DIMS];
    const maxW = Math.max(...pool.map((d) => d.w));
    const maxH = Math.max(...pool.map((d) => d.h));
    const fit = Math.min((VIEW_W - PAD * 2) / maxW, (VIEW_H - PAD * 2) / maxH);
    return { dims: parsed, scale: fit, largest: { w: maxW, h: maxH } };
  }, [rows]);

  const safeIndex = rows.length > 0 ? Math.min(activeIndex, rows.length - 1) : 0;
  const activeRow: SizeRow | undefined = rows[safeIndex];
  const activeDims = dims[safeIndex] ?? DEFAULT_DIMS;

  const rectW = round2(activeDims.w * scale);
  const rectH = round2(activeDims.h * scale);
  const rectX = round2((VIEW_W - rectW) / 2);
  const rectY = round2((VIEW_H - rectH) / 2);

  const ghostW = round2(largest.w * scale);
  const ghostH = round2(largest.h * scale);
  const ghostX = round2((VIEW_W - ghostW) / 2);
  const ghostY = round2((VIEW_H - ghostH) / 2);

  // The one place the site animates width/height (MOTION.md): the SVG outline
  // glides between sizes on the shared soft spring.
  const morphTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, ...SPRING_SOFT };

  // Readout crossfade. `AnimatePresence initial={false}` means the first
  // (server) render already carries the final styles, so hydration is clean.
  const readoutTransition = {
    duration: reduceMotion ? 0 : READOUT_DURATION,
    ease: EASE_SOFT,
  };
  const readoutKey = activeRow
    ? `${safeIndex}-${activeRow.size}-${activeRow.label}`
    : "none";

  const count = rows.length;

  return (
    <section
      id="sizes"
      aria-labelledby="sizes-heading"
      className="scroll-mt-16 bg-paper px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className={cn("mx-auto w-full max-w-[1440px]", INDEX_CLEAR)}>
        {/* `data-index-avoid`: the fixed side index fades while these pass under it. */}
        <div data-index-avoid>
          <Reveal className="rule flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Size guide</span>
            <span className="label text-stone-deep">
              {count} {count === 1 ? "size" : "sizes"}
            </span>
          </Reveal>
        </div>

        <h2
          id="sizes-heading"
          data-index-avoid
          className="font-display mt-6 text-[clamp(32px,4vw,56px)] text-ink"
        >
          <TextReveal text="Sizes, to scale" />
        </h2>

        <div data-index-avoid>
          <Reveal delay={0.1} className="mt-5 max-w-[48ch]">
            <p className="text-[15px] leading-[1.7] text-ink-soft">
              Tap a row (or hover, or focus it from the keyboard) and the outline
              redraws to that size. The dashed line is our largest, so you can see
              how much smaller each one sits.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 lg:mt-16 lg:grid-cols-12 lg:gap-y-0">
          {/* Illustration: left of the table at lg, above it below. The sticky
              box is a plain div so the Reveal's transform never interferes
              with `position: sticky`. */}
          <div
            data-index-avoid
            className="lg:col-span-4 lg:self-start lg:sticky lg:top-28"
          >
            <Reveal>
              <div className="border border-hairline bg-paper-deep p-5 sm:p-6">
                <svg
                  viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                  aria-hidden="true"
                  focusable="false"
                  className="block h-auto w-full"
                >
                  {/* Largest size, for comparison. */}
                  <rect
                    x={ghostX}
                    y={ghostY}
                    width={ghostW}
                    height={ghostH}
                    rx={6}
                    className="fill-none stroke-ink/25"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* The hovered size. */}
                  <motion.rect
                    initial={false}
                    animate={{
                      width: rectW,
                      height: rectH,
                      attrX: rectX,
                      attrY: rectY,
                    }}
                    transition={morphTransition}
                    rx={6}
                    className="fill-sand/60 stroke-ink"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Inner piping line. */}
                  <motion.rect
                    initial={false}
                    animate={{
                      width: Math.max(rectW - PIPING * 2, 0),
                      height: Math.max(rectH - PIPING * 2, 0),
                      attrX: rectX + PIPING,
                      attrY: rectY + PIPING,
                    }}
                    transition={morphTransition}
                    rx={3}
                    className="fill-none stroke-ink/35"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>

              {activeRow ? (
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  {/* `mode="wait"`: the old value leaves before the new one
                      rises in, and the swap happens in one commit so the row
                      never collapses. */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={`label-${readoutKey}`}
                      initial={reduceMotion ? false : { opacity: 0, y: READOUT_Y }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -READOUT_Y }}
                      transition={readoutTransition}
                      className="font-display m-0 text-[clamp(22px,2vw,28px)] text-ink"
                    >
                      {activeRow.label}
                    </motion.p>
                  </AnimatePresence>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={`dims-${readoutKey}`}
                      initial={reduceMotion ? false : { opacity: 0, y: READOUT_Y }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -READOUT_Y }}
                      transition={readoutTransition}
                      className="label m-0 tabular-nums text-stone-deep"
                    >
                      {activeRow.size} · {activeRow.sizeMetric}
                    </motion.p>
                  </AnimatePresence>
                </div>
              ) : null}
            </Reveal>
          </div>

          {/* Table. A <div> cannot sit inside <tbody>/<tr> in server HTML, so
              each cell's content gets its own Reveal; cells in a row share a
              delay, so a row still rises as one, header first. */}
          <div className="min-w-0 lg:col-span-7 lg:col-start-6">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Pillow sizes in inches and centimetres, with the packs each size is
                sold in.
              </caption>
              <thead>
                <tr className="border-t border-hairline">
                  <th scope="col" className="label py-4 pr-4 text-stone-deep">
                    <Reveal y={ROW_Y}>Size</Reveal>
                  </th>
                  <th
                    scope="col"
                    className="label hidden py-4 pr-4 text-stone-deep sm:table-cell"
                  >
                    <Reveal y={ROW_Y}>Metric</Reveal>
                  </th>
                  <th scope="col" className="label py-4 pr-4 text-stone-deep">
                    <Reveal y={ROW_Y}>Name</Reveal>
                  </th>
                  <th scope="col" className="label py-4 text-stone-deep">
                    <Reveal y={ROW_Y}>Packs</Reveal>
                  </th>
                </tr>
              </thead>

              <tbody className="border-b border-hairline">
                {rows.map((row, index) => {
                  const active = index === safeIndex;
                  const delay = (index + 1) * ROW_STAGGER;
                  return (
                    <tr
                      key={`${row.size}-${row.label}-${index}`}
                      // Rows are focusable so the outline can be driven from the keyboard too.
                      tabIndex={0}
                      onFocus={() => setActiveIndex(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => setActiveIndex(index)}
                      data-active={active ? "true" : undefined}
                      className={cn(
                        "cursor-default border-t border-hairline align-top outline-none focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ink",
                        !reduceMotion && "transition-colors duration-500 ease-in-out-soft",
                        active ? "bg-sand/40" : "hover:bg-sand/40",
                      )}
                    >
                      <td className="whitespace-nowrap py-5 pr-4">
                        <Reveal delay={delay} y={ROW_Y}>
                          <span className="block text-[15px] tabular-nums text-ink">
                            {row.size}
                          </span>
                          <span className="mt-1 block text-[13px] tabular-nums text-stone-deep sm:hidden">
                            {row.sizeMetric}
                          </span>
                        </Reveal>
                      </td>
                      <td className="hidden whitespace-nowrap py-5 pr-4 text-[15px] tabular-nums text-ink-soft sm:table-cell">
                        <Reveal delay={delay} y={ROW_Y}>
                          {row.sizeMetric}
                        </Reveal>
                      </td>
                      <td className="py-5 pr-4">
                        <Reveal delay={delay} y={ROW_Y}>
                          <span className="font-display block text-[clamp(20px,2vw,24px)] text-ink">
                            {row.label}
                          </span>
                        </Reveal>
                      </td>
                      <td className="py-5 text-[14px] leading-[1.6] text-ink-soft">
                        <Reveal delay={delay} y={ROW_Y}>
                          {row.bestFor}
                        </Reveal>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
