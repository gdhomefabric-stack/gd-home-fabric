"use client";

/**
 * ScrollTint — INTERACTIVE.md "background colour shift".
 *
 * Wraps <main>'s content. Its own background glides with the page: paper
 * (#faf7f2) at the top, to #efe9df as the Range (`#range`) passes the centre
 * of the viewport, held there through the ticker and the materials, to ink
 * (#1c2230) as the About section (`#craft`) arrives, and back to paper as it
 * leaves. The stops are measured from the live positions of those two sections
 * inside this wrapper (on mount, resize, and whenever the wrapper's height
 * changes — fonts, images and the footer's room all move them), expressed as
 * fractions of the wrapper's own scroll travel, and mapped through motion's
 * `transform` into one colour MotionValue. No section inside is required to
 * exist: a missing anchor just drops its stops (a page without an About stays
 * on #efe9df to the end, one without a Range starts its ramp at the About).
 *
 * Text colour flips with the background: while `#craft` crosses the central
 * band of the viewport (`rootMargin: -35% 0px -35% 0px`) the wrapper carries
 * `data-theme="dark"`, so Craft can style itself `[[data-theme=dark]_&]:text-paper`.
 * The ink ramp is centred on the same crossing (it runs from the section's top
 * at 95% of the viewport to 35%, so it is half-way at 65% — where the observer
 * flips), and Craft eases its colours over 0.7s, so the text never sits ink on
 * ink or paper on paper.
 *
 * Sections that paint their own `bg-paper` hide the tint; the Range, the
 * ticker, the materials and the About must be transparent for it to show.
 *
 * Reduced motion: static paper, no theme flip, no observers.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, transform, useMotionValue, useMotionValueEvent, useScroll } from "motion/react";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

const PAPER = "#faf7f2";
const SAND = "#efe9df";
const INK = "#1c2230";

/** The two anchors the stops are measured from. */
const RANGE_ID = "range";
const ABOUT_ID = "craft";

/** Viewport band (as a fraction from the top) the About must cross to flip the theme. */
const THEME_BAND = 0.35;

type Stop = { at: number; colour: string };

/** Strictly increasing inputs for `transform`: later equal stops get nudged up. */
function monotonic(stops: Stop[]): Stop[] {
  const out: Stop[] = [];
  for (const stop of stops) {
    const prev = out[out.length - 1];
    const at = prev && stop.at <= prev.at ? prev.at + 1e-4 : stop.at;
    out.push({ at, colour: stop.colour });
  }
  return out;
}

export default function ScrollTint({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);

  // Progress 0 → 1 as the wrapper scrolls from its top at the viewport top to
  // its bottom at the viewport bottom: p = (scrollY - top) / (height - vh).
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const backgroundColor = useMotionValue(PAPER);
  const mapRef = useRef<(p: number) => string>(() => PAPER);

  const measure = useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const vh = window.innerHeight;
    const rootRect = root.getBoundingClientRect();
    const travel = Math.max(1, rootRect.height - vh);

    // Progress at which the point `frac` down `node` sits `f` of the viewport
    // from its top (0 = viewport top, 1 = viewport bottom).
    const at = (node: Element, frac: number, f: number) => {
      const r = node.getBoundingClientRect();
      const offset = r.top - rootRect.top + frac * r.height;
      return (offset - f * vh) / travel;
    };

    const range = document.getElementById(RANGE_ID);
    const about = document.getElementById(ABOUT_ID);
    const stops: Stop[] = [{ at: 0, colour: PAPER }];
    if (range) {
      // Paper as the Range enters, #efe9df once its middle reaches the middle.
      stops.push({ at: at(range, 0, 1), colour: PAPER });
      stops.push({ at: at(range, 0.5, 0.5), colour: SAND });
    }
    if (about) {
      // Hold until the About enters; ink as its top reaches 35% of the viewport.
      stops.push({ at: at(about, 0, 1), colour: range ? SAND : PAPER });
      stops.push({ at: at(about, 0, THEME_BAND), colour: INK });
      // Ink until its bottom reaches 65%; paper again by the time it reaches 10%.
      stops.push({ at: at(about, 1, 1 - THEME_BAND), colour: INK });
      stops.push({ at: at(about, 1, 0.1), colour: PAPER });
    }
    const ordered = monotonic(stops);
    mapRef.current = transform(
      ordered.map((s) => s.at),
      ordered.map((s) => s.colour),
      { clamp: true },
    );
    backgroundColor.set(mapRef.current(scrollYProgress.get()));
  }, [backgroundColor, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!reduced) backgroundColor.set(mapRef.current(p));
  });

  useEffect(() => {
    if (reduced) {
      backgroundColor.set(PAPER);
      return;
    }
    const root = ref.current;
    if (!root) return;
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [reduced, measure, backgroundColor]);

  // Dark theme while the About crosses the centre band of the viewport.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDark(false);
      return;
    }
    const about = document.getElementById(ABOUT_ID);
    if (!about) return;
    const pct = `-${Math.round(THEME_BAND * 100)}%`;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setDark(entry.isIntersecting);
      },
      { rootMargin: `${pct} 0px ${pct} 0px`, threshold: 0 },
    );
    observer.observe(about);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <motion.div
      ref={ref}
      data-theme={dark ? "dark" : undefined}
      style={{ backgroundColor }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}
