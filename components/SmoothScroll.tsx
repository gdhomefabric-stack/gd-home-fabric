"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { scrollToTarget } from "@/lib/scroll";

declare global {
  interface Window {
    /**
     * The live Lenis instance driving window scroll. Exposed so test tooling
     * (and sibling components such as SideIndex) can drive or inspect scroll.
     * Undefined before mount and after unmount.
     */
    __lenis?: Lenis;
  }
}

type SmoothScrollProps = {
  children: ReactNode;
};

/** Dispatched on `window` by the Preloader once it has left the stage. */
const READY_EVENT = "gdhf:ready";

/**
 * Lenis smooth scroll on `window`.
 *
 * - `lerp: 0.08`, driven by our own `requestAnimationFrame` loop (cancelled on unmount).
 * - Starts stopped while `<html>` lacks `data-ready="true"` (the Preloader is up) and
 *   resumes on the `gdhf:ready` event. Keeping Lenis itself stopped during that window
 *   matters: Lenis rewrites every `lenis-*` class on `<html>` whenever its state changes,
 *   and only re-adds `lenis-stopped` while `isStopped` is true.
 * - Reduced motion: `lerp` is forced to 1 so scroll tracks input 1:1, and Lenis's own
 *   `respectReducedMotion` makes programmatic scrolls instant. Content is never gated
 *   on motion here — children render immediately and unchanged.
 * - No Lenis `anchors`: every in-page link already scrolls through `lib/scroll.ts`
 *   (one duration and easing for all of them). Lenis's own anchor handler listens on
 *   `window`, ignores `preventDefault`, and targets the element's viewport rect — for
 *   `#enquire` inside the fixed curtain footer that is the wrong page position, and it
 *   would override the scripted scroll that fired just before it.
 * - Hash landings: a hard load of `/#enquire` (or any `/#section` the links write to
 *   the URL) gets the browser's native fragment jump while the preloader still holds
 *   `overflow: hidden` on <html>, and `#enquire` lives in the fixed footer, which has
 *   no page position to jump to. So once `gdhf:ready` fires the hash is re-applied
 *   through `lib/scroll` (instantly; `pagePositionOf` maps the footer to the page end).
 */

/** Jump (no glide) to the element `location.hash` names, if any. */
function landOnHash(): void {
  const hash = window.location.hash;
  if (hash.length < 2) return;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep the raw fragment */
  }
  const el = document.getElementById(id);
  if (el) scrollToTarget(el, true);
}
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;

    const lenis = new Lenis({
      lerp: reducedMotion ? 1 : 0.08,
      smoothWheel: true,
      autoRaf: false,
      respectReducedMotion: true,
    });
    window.__lenis = lenis;

    // Hold scroll until the preloader has exited, then honour any hash.
    const onReady = () => {
      lenis.start();
      landOnHash();
    };
    if (root.dataset.ready !== "true") {
      lenis.stop();
      window.addEventListener(READY_EVENT, onReady, { once: true });
    }

    let rafId = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener(READY_EVENT, onReady);
      lenis.destroy();
      if (window.__lenis === lenis) {
        delete window.__lenis;
      }
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
