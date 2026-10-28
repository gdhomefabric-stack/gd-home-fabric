"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { frame, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import type Lenis from "lenis";
import type { SiteContent } from "@/lib/types";
import { EASE_SOFT, Reveal, SPRING_SOFT, useReady } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { replaceHash, scrollToTarget } from "@/lib/scroll";

declare global {
  interface Window {
    /**
     * Owned and assigned by `components/SmoothScroll.tsx`. Repeated here with
     * the identical type so `lib/scroll` (which reads it) typechecks when this
     * component is compiled on its own; interface merging accepts the duplicate
     * because the types match.
     */
    __lenis?: Lenis;
  }
}

/**
 * SideIndex — fixed bottom-left section index. Desktop only (`lg` and up):
 * below that it renders nothing at all.
 *
 * One row per section. The active row carries a filled dot (●) that glides
 * between rows on a shared `layoutId` with `SPRING_SOFT`; inactive rows sit at
 * 0.5 opacity. Active state comes from an IntersectionObserver watching the
 * `#id` sections through a thin band around the viewport centre
 * (`rootMargin: "-45% 0px -45% 0px"`). A hairline rail beside the rows fills
 * with overall page progress.
 *
 * Entrance: the index stays hidden while the preloader is up and while the
 * hero fills the viewport (no section is active yet — the index and the hero
 * headline share the bottom-left corner). The rows mount on that first
 * appearance and `Reveal` in with a card stagger; because the box is fixed to
 * the bottom edge, an in-view trigger would miss the lowest rows, so the
 * reveal is driven by the mount itself (`trigger="immediate"`).
 *
 * Footprint: the whole index has to live inside the grid's first column(s)
 * (the Collections text column starts in column 3 at `lg` and column 2 from
 * `xl`), so the rows use the compact `label-sm` (9px / 0.08em) with 8px gaps.
 * Labels are always visible from `lg` (CONTRACT.md): a rail and a lone dot
 * carry nothing on their own.
 *
 * Stays out of the way: fades out while a `[data-index-avoid]` block (section
 * headers and other left-column copy) sits under its own box, and while the
 * footer's `#enquire` section is in view. Photos are *not* avoided: the index
 * is `mix-blend-difference text-white` precisely so it can sit over them, and
 * the sections keep their first grid column clear of text at `lg` (Collections
 * through its grid, the others with a matching left padding), so the index is
 * present for the whole page like the reference's. Everything inside the fixed
 * curtain footer is ignored: it sits behind <main> for the whole page, and
 * IntersectionObserver ignores occlusion, so its blocks would otherwise count
 * as "covering" the index on any viewport short enough for the two boxes to
 * overlap. The footer is handled by the <main>-bottom check instead.
 *
 * Clicking a row scrolls to the section through `lib/scroll` (Lenis when
 * mounted, native otherwise). Rows are real `#id` anchors.
 *
 * Phase 4 (INTERACTIVE.md): the active label scales 1 → 1.08 from its left
 * edge (a transform, so the column never reflows) and the dot pulses once
 * (1 → 1.6 → 1, 0.5s) each time the active row changes: the pulse lives on a
 * child of the `layoutId` glyph, keyed on the active id, so it replays per
 * change without touching the layout projection.
 */

type SideIndexItem = SiteContent["nav"]["index"][number];

type SideIndexProps = {
  items: SideIndexItem[];
};

/** If the preloader never signals ready (or is absent), show the index anyway. */
const READY_FALLBACK_MS = 3200;
/** Elements the index must not overprint (text blocks only; photos are fine under the blend). */
const AVOID_SELECTOR = "[data-index-avoid]";
/** Tailwind `lg`: the index exists only at desktop widths. */
const LG_QUERY = "(min-width: 64rem)";
/** Row entrance (MOTION.md card stagger). */
const ROW_DELAY = 0.1;
const ROW_STAGGER = 0.07;
/** INTERACTIVE.md: the active label grows to this (a transform, so no reflow). */
const ACTIVE_SCALE = 1.08;
/** The dot pulses once on each change: 1 → 1.6 → 1 over 0.5s. */
const DOT_PULSE = [1, 1.6, 1];
const DOT_PULSE_SECONDS = 0.5;

const subscribeLg = (onChange: () => void) => {
  const query = window.matchMedia(LG_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * `true` / `false` once hydrated; `null` on the server and during hydration,
 * when the `hidden lg:flex` classes do the hiding so the markup still matches.
 */
function useLgUp(): boolean | null {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG_QUERY).matches,
    () => null,
  );
}

export default function SideIndex({ items }: SideIndexProps) {
  const reduce = useReducedMotionSafe();
  const lgUp = useLgUp();
  const navRef = useRef<HTMLElement>(null);

  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const setActiveId = useCallback((id: string | null) => {
    activeRef.current = id;
    setActive(id);
  }, []);

  // Appear as soon as the preloader starts to leave (`gdhf:exiting`) or has
  // left (`gdhf:ready`); `useReady` also covers a document already marked so.
  const preloaderReady = useReady();
  const [readyFallback, setReadyFallback] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReadyFallback(true), READY_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const ready = preloaderReady || readyFallback;

  // Fade out once the footer has reached the index. The footer is a fixed
  // curtain behind <main>, uncovered as the page scrolls off it, so an
  // IntersectionObserver on `#enquire` (which ignores occlusion) would report
  // it in view for most of the page. Compare the curtain's edge — <main>'s
  // bottom — with the index's own bottom edge instead, on every scroll. An
  // in-flow footer starts at exactly that edge, so the test holds either way.
  const [inEnquire, setInEnquire] = useState(false);
  const checkFooter = useCallback(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const curtain = main.getBoundingClientRect().bottom;
    const nav = navRef.current;
    const navBottom = nav ? nav.getBoundingClientRect().bottom : window.innerHeight;
    setInEnquire(curtain < navBottom);
  }, []);
  // Rects are read once per frame, in motion's read step (`frame.read` dedupes
  // the same callback within a frame), rather than inside the scroll handler.
  const scheduleCheckFooter = useCallback(() => frame.read(checkFooter), [checkFooter]);
  useEffect(() => {
    if (lgUp === false) return;
    checkFooter();
    window.addEventListener("resize", checkFooter);
    return () => window.removeEventListener("resize", checkFooter);
  }, [lgUp, checkFooter]);

  // Set once the index has been shown for the first time; the rows mount then.
  const [appeared, setAppeared] = useState(false);

  // Fade out while a text block sits under the index's own box. The root is
  // shrunk to that box with a negative rootMargin, re-measured on resize and
  // once the rows have mounted (the box is empty before that).
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    if (lgUp === false || typeof IntersectionObserver === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;

    let observer: IntersectionObserver | null = null;
    const hits = new Set<Element>();

    const build = () => {
      observer?.disconnect();
      observer = null;
      hits.clear();
      setCovered(false);

      const box = nav.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return; // display:none or no rows yet
      const px = (n: number) => `-${Math.max(0, Math.round(n))}px`;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) hits.add(entry.target);
            else hits.delete(entry.target);
          }
          setCovered(hits.size > 0);
        },
        {
          rootMargin: `${px(box.top)} ${px(window.innerWidth - box.right)} ${px(window.innerHeight - box.bottom)} ${px(box.left)}`,
          threshold: 0,
        },
      );
      for (const el of document.querySelectorAll(AVOID_SELECTOR)) {
        // The curtain footer is behind <main> until the very end of the page
        // (see the header); `checkFooter` owns that case.
        if (el.closest("footer")) continue;
        observer.observe(el);
      }
    };

    build();
    window.addEventListener("resize", build);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", build);
    };
  }, [lgUp, appeared]);

  // Stay out of the way while the hero fills the viewport (no section is
  // active yet): the index and the hero headline share the bottom-left corner.
  const show = (ready || reduce) && active !== null && !inEnquire && !covered;

  useEffect(() => {
    if (show) setAppeared(true);
  }, [show]);

  // Page progress rail (window scroll — Lenis scrolls the window natively).
  const { scrollY, scrollYProgress } = useScroll();
  const sprungProgress = useSpring(scrollYProgress, { ...SPRING_SOFT, restDelta: 0.001 });
  const progress = reduce ? scrollYProgress : sprungProgress;
  useMotionValueEvent(scrollY, "change", scheduleCheckFooter);

  // Active section via IntersectionObserver through the centre band.
  const idsKey = JSON.stringify(items.map((item) => item.id));
  useEffect(() => {
    if (lgUp === false || typeof IntersectionObserver === "undefined") return;
    const ids = JSON.parse(idsKey) as string[];
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hits = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (hits[0]) {
          setActiveId(hits[0].target.id);
          return;
        }
        // Nothing entered the band. If the active section left by dropping
        // below it (we scrolled back up above every section), clear the dot.
        for (const entry of entries) {
          if (entry.target.id !== activeRef.current) continue;
          const bandBottom =
            entry.rootBounds?.bottom ?? window.innerHeight * 0.55;
          if (entry.boundingClientRect.top >= bandBottom) setActiveId(null);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idsKey, setActiveId, lgUp]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      const el = document.getElementById(id);
      if (!el) return; // let the browser follow the hash normally
      event.preventDefault();
      scrollToTarget(el, reduce);
      replaceHash(`#${id}`);
    },
    [reduce],
  );

  // Nothing at all below `lg` (the classes below cover the server render).
  if (items.length === 0 || lgUp === false) return null;

  const fade = reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_SOFT };
  const dotTransition = reduce ? { duration: 0 } : { type: "spring" as const, ...SPRING_SOFT };
  const rowTransition = reduce ? { duration: 0 } : { duration: 0.5, ease: EASE_SOFT };
  const pulseTransition = reduce
    ? { duration: 0 }
    : { duration: DOT_PULSE_SECONDS, ease: EASE_SOFT, times: [0, 0.4, 1] };

  return (
    <motion.nav
      ref={navRef}
      aria-label="Page sections"
      inert={!show}
      className="pointer-events-none fixed bottom-[var(--gutter)] left-[var(--gutter)] z-30 hidden items-stretch gap-2 text-white mix-blend-difference lg:flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={fade}
    >
      {/* Progress rail */}
      <span aria-hidden className="relative w-px self-stretch bg-current/20">
        <motion.span
          className="absolute inset-0 origin-top bg-current"
          style={{ scaleY: progress }}
        />
      </span>

      {appeared ? (
        <ol className="pointer-events-auto flex flex-col gap-[6px]">
          {items.map((item, i) => {
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <Reveal trigger="immediate" delay={ROW_DELAY + i * ROW_STAGGER} y={10}>
                  <motion.a
                    href={`#${item.id}`}
                    onClick={(event) => handleClick(event, item.id)}
                    aria-current={isActive ? "location" : undefined}
                    className="label label-sm flex items-center gap-2 py-[4px] no-underline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current"
                    animate={{ opacity: isActive ? 1 : 0.5, x: isActive ? 2 : 0 }}
                    whileHover={{ opacity: 1 }}
                    whileFocus={{ opacity: 1 }}
                    transition={rowTransition}
                  >
                    <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
                      {isActive ? (
                        <motion.span
                          layoutId="index-dot"
                          aria-hidden
                          className="absolute inset-0 flex items-center justify-center text-[7px] leading-none"
                          transition={dotTransition}
                        >
                          <motion.span
                            key={`pulse-${active}`}
                            className="inline-block"
                            initial={{ scale: 1 }}
                            animate={{ scale: reduce ? 1 : DOT_PULSE }}
                            transition={pulseTransition}
                          >
                            ●
                          </motion.span>
                        </motion.span>
                      ) : null}
                    </span>
                    <motion.span
                      className="inline-block origin-left whitespace-nowrap will-change-transform"
                      animate={{ scale: isActive ? ACTIVE_SCALE : 1 }}
                      transition={rowTransition}
                    >
                      {item.label}
                    </motion.span>
                  </motion.a>
                </Reveal>
              </li>
            );
          })}
        </ol>
      ) : null}
    </motion.nav>
  );
}
