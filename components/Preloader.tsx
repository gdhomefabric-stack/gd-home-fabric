"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { EASE_IN_OUT, EASE_OUT_EXPO, EASE_SOFT, Reveal, TextReveal } from "@/lib/motion";

type PreloaderProps = {
  wordmark: string;
  line: string;
};

/**
 * How long the choreography runs on a fresh visit, measured from hydration
 * (the letters cannot start before then). The server-rendered panel is on
 * screen before that too, so the total hold is always ≥ this.
 */
const HOLD_MS = 1600;
/** Shorter hold once this tab has already seen the preloader. */
const HOLD_SEEN_MS = 600;
/** Extra grace we are willing to wait for web fonts so the wordmark reveals in serif. */
const FONT_WAIT_CAP_MS = 800;
const SEEN_KEY = "gdhf_seen";

/**
 * Content choreography per hold length, sized so the last letter has landed
 * and the tagline is sharp before the counter reaches 100 and the panel lifts.
 * First visit (1.6s hold): 14 letters × 0.03s + 1.1s → last letter ≈1.5s,
 * line 0.35 + 1.0 = 1.35s. Repeat (0.6s hold): 14 × 0.012 + 0.45 → ≈0.61s,
 * line 0.08 + 0.4 = 0.48s.
 */
const TIMING = {
  first: { letter: 1.1, lineDelay: 0.35, line: 1.0, stagger: 0.03 },
  seen: { letter: 0.45, lineDelay: 0.08, line: 0.4, stagger: 0.012 },
} as const;

/** Sent the moment the panel starts to slide away: the page underneath can start composing. */
const EXITING_EVENT = "gdhf:exiting";
/** Sent once the panel has fully left: scroll unlocks. */
const READY_EVENT = "gdhf:ready";

function hasSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage unavailable (private mode, blocked) — ignore */
  }
}

/** Resolves when web fonts are ready, or after `cap` ms, whichever is first. */
function fontsReady(cap: number): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, cap)),
  ]);
}

/** `0 → "000"`, `7.4 → "007"`, `100 → "100"`: the counter keeps three digits throughout. */
function padCount(value: number): string {
  return String(Math.round(Math.max(0, Math.min(100, value)))).padStart(3, "0");
}

export default function Preloader({ wordmark, line }: PreloaderProps) {
  // `null` on the server, boolean on the client. We only let it drive
  // transitions/exit (never `initial`), so server and client markup match.
  const reduceMotion = useReducedMotion() === true;
  // Server always renders the panel (so nothing flashes underneath); the
  // client decides the hold length once mounted.
  const [seen] = useState<boolean>(hasSeen);
  // A client-side navigation back to this page (e.g. from /credits) mounts a
  // fresh Preloader on a document the first visit already marked
  // `data-ready="true"`. The entrance then belongs to the route panel in
  // app/template.tsx: this instance renders nothing and leaves the flags
  // alone, so `useReady()` consumers resolve at once and Lenis keeps running.
  // Hydration-safe: a fresh document never carries the flag, so the server
  // (no `document`) and the hydrating client agree on `false`.
  const [skipped] = useState<boolean>(
    () => typeof document !== "undefined" && document.documentElement.dataset.ready === "true",
  );
  const [visible, setVisible] = useState(!skipped);
  const firedRef = useRef(false);

  // Hold progress, 0 → 100 over the whole hold. A motion value (not
  // `initial`/`animate`) so its completion can end the hold at the very same
  // instant it reads 100. The span below renders the MotionValue directly:
  // textContent updates per frame without a React re-render.
  const count = useMotionValue(0);
  const countText = useTransform(count, padCount);

  const holdMs = seen ? HOLD_SEEN_MS : HOLD_MS;
  const timing = seen ? TIMING.seen : TIMING.first;

  useEffect(() => {
    if (skipped || typeof document === "undefined") return;
    const html = document.documentElement;
    // A hard load: this instance owns the handshake. Clear any stale flags
    // (e.g. a bfcache restore) so `useReady` consumers and Lenis wait for
    // *this* exit instead of treating the page as already revealed. (This
    // effect runs before those of every later sibling and of the SmoothScroll
    // parent, so they all read the cleared state.)
    delete html.dataset.ready;
    delete html.dataset.exiting;
    html.classList.add("lenis-stopped");

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let countAnimation: { stop: () => void } | undefined;

    const minHold = new Promise<void>((resolve) => {
      if (reduceMotion) {
        // Final state immediately; the hold itself still runs on a timer.
        count.set(100);
        timer = setTimeout(resolve, holdMs);
        return;
      }
      // The counter's completion *is* the hold signal, so it reads 100 at the
      // exact moment the panel is released. (It ticks on the frameloop, so in
      // a background tab it pauses and the panel waits to be seen leaving.)
      count.set(0);
      countAnimation = animate(count, 100, {
        duration: holdMs / 1000,
        ease: "linear",
        onComplete: resolve,
      });
    });

    Promise.all([minHold, fontsReady(FONT_WAIT_CAP_MS)]).then(() => {
      if (cancelled) return;
      count.set(100);
      // Early signal: the panel is about to lift, so the hero/nav underneath
      // start composing now and are mid-rise as the panel edge clears them.
      html.dataset.exiting = "true";
      window.dispatchEvent(new CustomEvent(EXITING_EVENT));
      setVisible(false);
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
      countAnimation?.stop();
      // Only release the scroll lock here; the ready signal is sent from
      // onExitComplete so it never fires before the panel has left.
      html.classList.remove("lenis-stopped");
    };
  }, [skipped, count, holdMs, reduceMotion]);

  if (skipped) return null;

  const handleExitComplete = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.remove("lenis-stopped");
    delete html.dataset.exiting;
    html.dataset.ready = "true";
    markSeen();
    window.dispatchEvent(new CustomEvent(READY_EVENT));
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          key="gdhf-preloader"
          role="status"
          aria-live="polite"
          data-gdhf-preloader=""
          data-lenis-prevent
          className="fixed inset-0 z-[100] flex touch-none flex-col justify-end overflow-hidden overscroll-contain bg-stone text-white will-change-transform"
          initial={false}
          exit={
            reduceMotion
              ? { opacity: 0, transition: { duration: 0.35, ease: EASE_SOFT } }
              : { y: "-100%", transition: { duration: 1.1, ease: EASE_IN_OUT } }
          }
        >
          {/* Without JavaScript the panel would never leave — hide it instead. */}
          <noscript>
            <style>{`[data-gdhf-preloader]{display:none !important}`}</style>
          </noscript>

          <motion.div
            className="w-full max-w-[1440px] self-center px-[var(--gutter)] pb-[calc(var(--gutter)_+_6px)]"
            exit={
              reduceMotion
                ? undefined
                : { opacity: 0, y: -28, transition: { duration: 0.6, ease: EASE_SOFT } }
            }
          >
            {/* Hairline draws in from the left as the letters arrive. */}
            <motion.span
              aria-hidden="true"
              className="block h-px w-full origin-left bg-white/40"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: EASE_OUT_EXPO }}
            />

            <div className="flex items-end justify-between gap-x-8 pt-5">
              {/* Bottom-left: wordmark letters stagger up through a mask, then the line. */}
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-2">
                <TextReveal
                  text={wordmark}
                  as="span"
                  byLetter
                  trigger="immediate"
                  stagger={timing.stagger}
                  duration={timing.letter}
                  // `whitespace-pre`: the wordmark never wraps at the spaces between its
                  // per-word letter groups, whatever the width.
                  className="font-display block max-w-full whitespace-pre text-[clamp(28px,4vw,44px)] leading-none text-white"
                />

                <Reveal
                  trigger="immediate"
                  delay={timing.lineDelay}
                  duration={timing.line}
                  y={12}
                  className="max-w-[46ch] text-[13px] leading-relaxed text-white/80 sm:text-[15px]"
                >
                  {line}
                </Reveal>
              </div>

              {/* Bottom-right: 000 → 100 over the hold. Hidden from AT because it
                  changes every frame inside a live region; the panel's text already
                  announces the brand. */}
              <motion.span
                aria-hidden="true"
                className="label shrink-0 tabular-nums text-white/70"
              >
                {countText}
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
