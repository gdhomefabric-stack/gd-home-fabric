"use client";

/**
 * Scroll progress — MOTION.md "Global (new files)".
 *
 * A 1px `ink` hairline fixed at the very top of the viewport. Its `scaleX` is
 * the page's `scrollYProgress` passed through `SPRING_SOFT`, so it glides
 * rather than tracks the wheel step by step. Under reduced motion the spring is
 * skipped and the line follows the scroll position directly.
 */

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";

export default function ScrollProgress() {
  const reduced = useReducedMotion() === true;
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, SPRING_SOFT);

  // Both motion values start at 0, so server and client markup match whichever
  // one ends up driving the style.
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-px origin-left bg-ink will-change-transform"
      style={{ scaleX: reduced ? scrollYProgress : smooth }}
    />
  );
}
