"use client";

/**
 * SectionIndex — the oversized outlined numeral ("01") that sits behind or
 * above a section title. Stroke only (`.text-outline`), half opacity, and a
 * scroll-linked ±20 px drift so it floats against the title as the section
 * passes. Decorative: aria-hidden, no pointer events, not selectable. Reduced
 * motion renders it still.
 */

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { cn, SPRING_SOFT } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

export type SectionIndexProps = {
  /** "01", "02" … as in `Collection.index` */
  index: string;
  className?: string;
};

export default function SectionIndex({ index, className }: SectionIndexProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rawY = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const y = useSpring(rawY, SPRING_SOFT);

  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={cn(
        "block font-display text-outline text-[clamp(96px,14vw,220px)] leading-none",
        "opacity-50 select-none pointer-events-none will-change-transform",
        className,
      )}
      style={reduced ? undefined : { y }}
    >
      {index}
    </motion.span>
  );
}

export { SectionIndex };
