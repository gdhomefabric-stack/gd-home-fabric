"use client";

/**
 * Ticker — INTERACTIVE.md "word ticker" between the Range and the Materials.
 *
 * One slow marquee line in the display italic: the phrases joined with " · ",
 * drawn twice back to back inside an overflow-hidden track that translates
 * from 0 to −50% of its own width (exactly one copy) over 60s, linear,
 * forever, so the loop never shows a seam. The phrases come from the
 * integrator (FACTS.md copy); the component adds no words of its own.
 *
 * The visible copies are `aria-hidden`; a visually hidden list carries the
 * same words once for assistive tech. No background: the ScrollTint behind
 * it is already on its #efe9df stop here.
 *
 * Reduced motion: the track stands still at its first copy.
 */

import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

const SEPARATOR = " · ";
/** One full loop (one copy's width) in seconds. */
const LOOP_SECONDS = 60;

const TRACK_START = { x: "0%" };
// A plain (mutable) string array: motion's keyframe type rejects a readonly tuple.
const TRACK_LOOP: { x: string[] } = { x: ["0%", "-50%"] };

export default function Ticker({ phrases }: { phrases: string[] }) {
  const reduced = useReducedMotionSafe();
  const words = phrases.map((p) => p.trim()).filter(Boolean);
  if (words.length === 0) return null;

  const line = words.join(SEPARATOR) + SEPARATOR;

  return (
    <div className="relative w-full overflow-hidden py-[clamp(32px,5vw,72px)]">
      <p className="sr-only">{words.join(", ")}</p>
      <motion.div
        aria-hidden="true"
        className="flex w-max whitespace-nowrap will-change-transform"
        initial={TRACK_START}
        animate={reduced ? TRACK_START : TRACK_LOOP}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: LOOP_SECONDS, ease: "linear", repeat: Infinity, repeatType: "loop" }
        }
      >
        {[0, 1].map((copy) => (
          <span
            key={copy}
            className="font-display shrink-0 pr-[0.35em] text-[clamp(40px,6vw,96px)] font-light italic leading-none text-ink"
          >
            {line}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
