"use client";

/**
 * Shared motion primitives. See MOTION.md for when to use each one.
 * Everything here degrades to the final (visible) state under prefers-reduced-motion.
 */

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefAttributes,
  type RefObject,
} from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.76, 0, 0.24, 1];
export const EASE_SOFT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const SPRING_SOFT = { stiffness: 120, damping: 30, mass: 1 };
export const SPRING_SNAPPY = { stiffness: 220, damping: 20, mass: 0.6 };

/** Standard whileInView viewport: fire once, slightly inside the viewport. */
export const VIEWPORT = { once: true, margin: "-12% 0px -12% 0px" } as const;

const IN_VIEW_MARGIN = "-10% 0px -10% 0px" as const;

/**
 * Reduced motion: every primitive keeps the same `initial` it rendered on the
 * server (so hydration is clean) and snaps to its final state through this.
 * `initial` must never flip between an object and `false` across renders —
 * motion drops the first pass of a newly created animation feature when
 * `initial === false`, which left reduced-motion visitors with content stuck
 * at the hidden server-rendered styles.
 */
const INSTANT = { duration: 0 } as const;

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * True once the preloader has started to leave (`gdhf:exiting`) or has left
 * (`gdhf:ready`), or had already done either before this mounted.
 */
export function useReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.ready === "true" || html.dataset.exiting === "true") {
      setReady(true);
      return;
    }
    const onReady = () => setReady(true);
    window.addEventListener("gdhf:exiting", onReady, { once: true });
    window.addEventListener("gdhf:ready", onReady, { once: true });
    return () => {
      window.removeEventListener("gdhf:exiting", onReady);
      window.removeEventListener("gdhf:ready", onReady);
    };
  }, []);
  return ready;
}

/** Spring-smoothed window scroll velocity in px/s. Positive = scrolling down. */
export function useScrollVelocity(): MotionValue<number> {
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  return useSpring(velocity, { stiffness: 200, damping: 50, mass: 1 });
}

/**
 * One scroll-velocity spring for the whole page. Every `ImageReveal` and the
 * Materials marquee read the same value through `useSharedScrollVelocity()`
 * instead of each owning a `useVelocity` + `useSpring` chain (≈27 of them on
 * the home page, all computing the same number on every scroll frame). Mount
 * once around the page (app/page.tsx).
 */
const VelocityCtx = createContext<MotionValue<number> | null>(null);

export function ScrollVelocityProvider({ children }: { children: ReactNode }) {
  const velocity = useScrollVelocity();
  return <VelocityCtx.Provider value={velocity}>{children}</VelocityCtx.Provider>;
}

/**
 * The provider's velocity, or a resting `0` when none is mounted (a page
 * without the provider simply renders unskewed — hooks cannot be called
 * conditionally, and a per-consumer fallback spring would undo the sharing).
 */
export function useSharedScrollVelocity(): MotionValue<number> {
  const shared = useContext(VelocityCtx);
  const still = useMotionValue(0);
  return shared ?? still;
}

/** Resolve the "should this be visible yet" question for a trigger mode. */
type Trigger = "view" | "ready" | "immediate";

function useTrigger(trigger: Trigger, inView: boolean, reduced: boolean): boolean {
  const ready = useReady();
  if (reduced || trigger === "immediate") return true;
  if (trigger === "ready") return ready;
  return inView;
}

// ---------------------------------------------------------------------------
// TextReveal — word mask
// ---------------------------------------------------------------------------

type TextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "blockquote";

export type TextRevealProps = {
  text: string;
  as?: TextTag;
  /** forwarded to the wrapper element, e.g. the target of an `aria-labelledby` */
  id?: string;
  className?: string;
  /** seconds before the first word starts */
  delay?: number;
  /** seconds between words */
  stagger?: number;
  duration?: number;
  trigger?: Trigger;
  once?: boolean;
  /** split on characters instead of words (wordmarks) */
  byLetter?: boolean;
  /**
   * Treat `*…*` in `text` as an italic accent: the words inside render in an
   * `<em>` (styled by `.font-display em`). One em may span several words;
   * the asterisks never reach the DOM, so the accessible text is the plain
   * sentence. Off by default so copy with literal asterisks is untouched.
   */
  markup?: boolean;
};

const WORD_HIDDEN = { y: "110%" } as const;
const WORD_SHOWN = { y: "0%" } as const;

/**
 * The copy without its `*…*` accent marks ("Find your *size*" → "Find your
 * size"). Use it wherever a marked-up string must render outside TextReveal
 * (JSON-LD, <title>, aria-labels, sr-only copies, the preloader, Nav), so an
 * asterisk never reaches the page.
 */
export function plain(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}

type Unit = { text: string; em: boolean };
/** One word of the copy: its reveal units (one per word, or one per letter). */
type Word = { units: Unit[]; em: boolean };

/**
 * Split copy into words, each a list of reveal units. `markup` first marks the
 * characters inside `*…*` runs as emphasised; the text then splits on
 * whitespace into words (so a word can never break apart across lines), and
 * `byLetter` splits every word into its characters. A word is emphasised when
 * all of its characters are.
 */
function splitWords(text: string, byLetter: boolean, markup: boolean): Word[] {
  const chars: Unit[] = [];
  if (markup) {
    text.split(/\*([^*]+)\*/).forEach((part, i) => {
      for (const ch of part) chars.push({ text: ch, em: i % 2 === 1 });
    });
  } else {
    for (const ch of text) chars.push({ text: ch, em: false });
  }

  const words: Word[] = [];
  let current: Unit[] = [];
  const flush = () => {
    if (current.length === 0) return;
    const em = current.every((c) => c.em);
    words.push({
      units: byLetter
        ? current.map((c) => ({ text: c.text, em }))
        : [{ text: current.map((c) => c.text).join(""), em }],
      em,
    });
    current = [];
  };
  for (const c of chars) {
    if (/\s/.test(c.text)) flush();
    else current.push(c);
  }
  flush();
  return words;
}

export function TextReveal({
  text,
  as = "span",
  id,
  className,
  delay = 0,
  stagger = 0.045,
  duration = 1.1,
  trigger = "view",
  once = true,
  byLetter = false,
  markup = false,
}: TextRevealProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, margin: IN_VIEW_MARGIN });
  const show = useTrigger(trigger, inView, reduced);

  const words = splitWords(text, byLetter, markup);
  const accessible = markup ? plain(text) : text;

  // One overflow-hidden mask per unit. The inter-word space is emitted
  // *between* the words, never inside a mask: a trailing space at the end of
  // an inline-block is collapsed by CSS, which used to run the words together.
  //
  // Word masks are the real, accessible text: the words and the spaces between
  // them read as one sentence, so copy, find-in-page, reader mode and search
  // snippets see the heading once. Only the by-letter variant hides its
  // per-letter spans (they would be read letter by letter) behind an sr-only
  // copy of the whole string; its letters are grouped per word in a
  // `whitespace-nowrap inline-block`, so a line can only break at the real
  // spaces between words, never between the letters of one word.
  //
  // With `markup`, consecutive emphasised words are grouped inside one <em>
  // (an inline element around the inline-block masks), so the italic run can
  // span several words while every word still rises on its own.
  let unitIndex = 0;
  const mask = (unit: Unit) => {
    const i = unitIndex++;
    return (
      <span
        key={`${unit.text}-${i}`}
        aria-hidden={byLetter || undefined}
        className={cn(
          "inline-block overflow-hidden align-bottom",
          // give descenders room inside the mask without changing layout
          "pb-[0.14em] -mb-[0.14em] pt-[0.06em] -mt-[0.06em]",
        )}
      >
        <motion.span
          className="inline-block will-change-transform"
          initial={WORD_HIDDEN}
          animate={show ? WORD_SHOWN : WORD_HIDDEN}
          transition={
            reduced ? INSTANT : { duration, delay: delay + i * stagger, ease: EASE_OUT_EXPO }
          }
        >
          {unit.text}
        </motion.span>
      </span>
    );
  };
  const renderWord = (word: Word, w: number): ReactNode =>
    byLetter ? (
      <span key={`w-${w}`} className="inline-block whitespace-nowrap">
        {word.units.map(mask)}
      </span>
    ) : (
      mask(word.units[0])
    );

  const children: ReactNode[] = [];
  let group: ReactNode[] = [];
  let groupStart = 0;
  const flushEm = () => {
    if (group.length === 0) return;
    children.push(<em key={`em-${groupStart}`}>{group}</em>);
    group = [];
  };
  words.forEach((word, w) => {
    const prev = w > 0 ? words[w - 1] : null;
    const spacer = w > 0 ? " " : null;
    if (word.em) {
      if (!prev?.em) {
        // the space before an em run sits outside it
        if (spacer) children.push(spacer);
        groupStart = w;
      } else if (spacer) {
        group.push(spacer);
      }
      group.push(renderWord(word, w));
      return;
    }
    if (prev?.em) flushEm();
    if (spacer) children.push(spacer);
    children.push(renderWord(word, w));
  });
  flushEm();

  // `aria-label` is not permitted on generic elements (span/div), so the
  // by-letter variant exposes its text through a visually-hidden span instead.
  const props: HTMLAttributes<HTMLElement> & RefAttributes<HTMLElement> = {
    ref,
    id,
    className,
  };
  return createElement(
    as,
    props,
    byLetter ? <span className="sr-only">{accessible}</span> : null,
    ...children,
  );
}

// ---------------------------------------------------------------------------
// Rule \u2014 a hairline that draws from the left on view
// ---------------------------------------------------------------------------

const RULE_HIDDEN = { scaleX: 0 } as const;
const RULE_SHOWN = { scaleX: 1 } as const;

export function Rule({ className }: { className?: string }) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: IN_VIEW_MARGIN });
  const show = reduced || inView;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={cn("h-px bg-hairline w-full origin-left will-change-transform", className)}
      initial={RULE_HIDDEN}
      animate={show ? RULE_SHOWN : RULE_HIDDEN}
      transition={reduced ? INSTANT : { duration: 1.2, ease: EASE_OUT_EXPO }}
    />
  );
}

// ---------------------------------------------------------------------------
// useCursorParallax \u2014 pointer-position translate + tilt for photo cards
// ---------------------------------------------------------------------------

export type CursorParallaxOptions = {
  /** px the inner layer translates at the element's edges (default 12) */
  max?: number;
  /** degrees the card tilts at the element's edges (default 2) */
  tilt?: number;
};

export type CursorParallax = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
};

/** True on a `(pointer: coarse)` device, false on the server and until mounted. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

/**
 * Cursor-follow parallax. Put `x`/`y` on the inner image layer and
 * `rotateX`/`rotateY` on the card, spread the handlers onto the element `ref`
 * points at (give the card `perspective` via its parent or `transformPerspective`).
 * Inert under reduced motion and on coarse pointers: the values rest at 0.
 */
export function useCursorParallax(
  ref: RefObject<HTMLElement | null>,
  opts?: CursorParallaxOptions,
): CursorParallax {
  const max = opts?.max ?? 12;
  const tilt = opts?.tilt ?? 2;
  const reduced = useReducedMotionSafe();
  const coarse = useCoarsePointer();
  const inert = reduced || coarse;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawRx = useMotionValue(0);
  const rawRy = useMotionValue(0);
  const x = useSpring(rawX, SPRING_SOFT);
  const y = useSpring(rawY, SPRING_SOFT);
  const rotateX = useSpring(rawRx, SPRING_SOFT);
  const rotateY = useSpring(rawRy, SPRING_SOFT);

  const rest = () => {
    rawX.set(0);
    rawY.set(0);
    rawRx.set(0);
    rawRy.set(0);
  };

  useEffect(() => {
    if (inert) rest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inert]);

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || inert || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // -1 \u2026 1 across the element, clamped so a fast exit never overshoots
    const px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    rawX.set(px * max);
    rawY.set(py * max);
    // tilt toward the pointer: right edge turns the card's right side away
    rawRy.set(px * tilt);
    rawRx.set(-py * tilt);
  };

  return { x, y, rotateX, rotateY, onPointerMove, onPointerLeave: rest };
}

// ---------------------------------------------------------------------------
// Reveal — fade-up with blur-in
// ---------------------------------------------------------------------------

export type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  /** px to rise from */
  y?: number;
  blur?: boolean;
  trigger?: Trigger;
  once?: boolean;
};

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 1,
  y = 28,
  blur = true,
  trigger = "view",
  once = true,
}: RevealProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: IN_VIEW_MARGIN });
  const show = useTrigger(trigger, inView, reduced);

  const hidden = { opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" };
  const visible = { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={show ? visible : hidden}
      transition={reduced ? INSTANT : { duration, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ImageReveal — clip wipe + scale + parallax + velocity skew
// ---------------------------------------------------------------------------

export type ImageRevealProps = {
  /** a `next/image fill` (or any absolutely-filled child) */
  children: ReactNode;
  /** sizing/aspect classes for the outer box, e.g. "aspect-[4/5]" */
  className?: string;
  /** 0–0.2: fraction of the box height the image drifts across the viewport */
  parallax?: number;
  /** skew with scroll velocity */
  skew?: boolean;
  /** inner scale at reveal start */
  scaleFrom?: number;
  delay?: number;
  once?: boolean;
  /** extra props for the outer box (data-cursor etc.) */
  cursor?: "view" | "link";
  /**
   * Edge the wipe starts from. `"top"` (default) uncovers downward; `"bottom"`
   * uncovers upward, for a box that is itself revealed from below (the curtain
   * footer's strip), so the wipe follows the edge that exposes it.
   */
  clipFrom?: "top" | "bottom";
};

const CLIP_CLOSED = {
  top: { clipPath: "inset(0 0 100% 0)" },
  bottom: { clipPath: "inset(100% 0 0 0)" },
} as const;
const CLIP_OPEN = { clipPath: "inset(0% 0 0% 0)" } as const;

export function ImageReveal({
  children,
  className,
  parallax = 0.08,
  skew = true,
  scaleFrom = 1.25,
  delay = 0,
  once = true,
  cursor,
  clipFrom = "top",
}: ImageRevealProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  // The observed box is the outer wrapper, which is never clip-path'd.
  // Chromium clips an IntersectionObserver target's rect by the target's own
  // clip-path, so a box that starts at `inset(0 0 100% 0)` is a zero-height
  // line at its top edge and only counts as "in view" while that edge sits
  // inside the band — a jump (anchor, side index) landing past it would never
  // reveal. The wrapper keeps the full box; the wipe lives on the layer inside.
  const inView = useInView(ref, { once, margin: "-6% 0px -6% 0px" });
  const show = reduced || inView;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = Math.max(0, Math.min(0.2, parallax)) * 100;
  const rawY = useTransform(scrollYProgress, [0, 1], [`${drift}%`, `-${drift}%`]);
  const y = useSpring(rawY, SPRING_SOFT);

  const velocity = useSharedScrollVelocity();
  const skewY = useTransform(velocity, [-2500, 0, 2500], [-2.5, 0, 2.5], { clamp: true });

  const useParallax = !reduced && drift > 0;
  const useSkew = !reduced && skew;

  const scaleHidden = { scale: scaleFrom };
  const scaleShown = { scale: 1 };
  const clipClosed = CLIP_CLOSED[clipFrom];

  return (
    <motion.div
      ref={ref}
      data-cursor={cursor}
      className={cn("relative img-matte", className)}
      style={useSkew ? { skewY } : undefined}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={clipClosed}
        animate={show ? CLIP_OPEN : clipClosed}
        transition={reduced ? INSTANT : { duration: 1.3, delay, ease: EASE_IN_OUT }}
      >
        <motion.div
          className={cn("absolute inset-x-0", useParallax ? "-inset-y-[12%]" : "inset-y-0")}
          style={useParallax ? { y } : undefined}
          initial={scaleHidden}
          animate={show ? scaleShown : scaleHidden}
          transition={reduced ? INSTANT : { duration: 1.6, delay, ease: EASE_OUT_EXPO }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Magnetic — pointer-following wrapper
// ---------------------------------------------------------------------------

export type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** 0–1: how far toward the pointer the child moves */
  strength?: number;
};

export function Magnetic({ children, className, strength = 0.35 }: MagneticProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING_SNAPPY);
  const sy = useSpring(y, SPRING_SNAPPY);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (reduced) return <div className={cn("inline-block", className)}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Counter — count-up for stat values like "6+" / "500" (never for prices)
//
// Renders only the counting copy. Callers own the accessible text: wrap the
// Counter in `aria-hidden` next to an sr-only copy of the final value (as
// Craft and Finder do) — `aria-label` is not permitted on a generic <span>.
// ---------------------------------------------------------------------------

function splitStat(value: string): { prefix: string; num: number; suffix: string; grouped: boolean; decimals: number } {
  const m = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return { prefix: "", num: 0, suffix: value, grouped: false, decimals: 0 };
  const [, prefix, raw, suffix] = m;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return { prefix, num: parseFloat(raw.replace(/,/g, "")), suffix, grouped: raw.includes(","), decimals };
}

export function Counter({
  value,
  className,
  duration = 1.8,
  trigger = "view",
}: {
  value: string;
  className?: string;
  duration?: number;
  /**
   * `"view"` (default) counts once the span enters the viewport band;
   * `"immediate"` counts from mount — for a value that appears in response to
   * the visitor's own action (the finder's price after a chip press), which
   * may sit just outside the band and would otherwise read as "₹0".
   */
  trigger?: Trigger;
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: IN_VIEW_MARGIN });
  const inView = useTrigger(trigger, seen, reduced);
  const { prefix, num, suffix, grouped, decimals } = splitStat(value);

  const format = (v: number) =>
    prefix +
    (grouped
      ? Math.round(v).toLocaleString("en-IN")
      : decimals
        ? v.toFixed(decimals)
        : String(Math.round(v))) +
    suffix;

  // Server and first client render show the final value, so the static HTML
  // (no-JS readers, crawlers) never reads "0". Once mounted with motion
  // allowed, the figure drops to zero until it counts up in view; reduced
  // motion keeps the final value.
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) {
      setDisplay(format(0));
      return;
    }
    const controls = animate(0, num, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => setDisplay(format(v)),
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
