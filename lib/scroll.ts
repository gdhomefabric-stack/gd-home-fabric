/**
 * One way to scroll the page, so every in-page link, the side index, the
 * menu, the bar CTA and "back to top" share the same easing and duration.
 *
 * `SmoothScroll.tsx` publishes its Lenis instance on `window.__lenis`; when it
 * is present we scroll through it (Lenis honours `scroll-margin-top` on the
 * target, and `immediate` makes reduced-motion scrolls a plain jump). Without
 * Lenis (e.g. a route that does not mount it) we fall back to the native API.
 */

/** Default glide for programmatic scrolls, in seconds. */
export const SCROLL_DURATION = 1.4;

/** Ease-out quartic, close to the reveal curve used across the site. */
export const scrollEasing = (t: number): number => 1 - Math.pow(1 - t, 4);

/**
 * Dispatched on `window` the moment a scripted scroll starts (every caller of
 * `scrollToTarget`, whether or not Lenis is mounted). Fixed chrome that hides
 * on scroll-down — the nav bar — listens for it: a jump the visitor asked for
 * (a menu link, the side index, "Browse the pillows", back to top) reads as a
 * downward scroll and would otherwise take the bar away. Lenis itself cannot
 * tell the two apart (wheel and `scrollTo` both report `isScrolling: "smooth"`).
 */
export const SCROLL_START_EVENT = "gdhf:scroll-start";

export type ScrollStartDetail = {
  /** Planned glide length in seconds; `0` for an instant (reduced-motion) jump. */
  duration: number;
  reduce: boolean;
};

function announceScroll(duration: number, reduce: boolean): void {
  window.dispatchEvent(
    new CustomEvent<ScrollStartDetail>(SCROLL_START_EVENT, {
      detail: { duration: reduce ? 0 : duration, reduce },
    }),
  );
}

/**
 * An element inside the curtain footer (`position: fixed` behind <main>,
 * uncovered as the page scrolls off it) has no page position of its own: its
 * rect is a viewport position, so scrolling "to" it would land wherever the
 * page happens to be. It is on screen once the page is at its end, so that is
 * the target. Everything else scrolls to the element itself.
 */
function pagePositionOf(el: HTMLElement): HTMLElement | number {
  const footer = el.closest("footer");
  if (footer && getComputedStyle(footer).position === "fixed") {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  return el;
}

export function scrollToTarget(
  target: HTMLElement | number,
  reduce: boolean,
  duration: number = SCROLL_DURATION,
): void {
  if (typeof window === "undefined") return;
  const to = typeof target === "number" ? target : pagePositionOf(target);
  announceScroll(duration, reduce);
  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(to, reduce ? { immediate: true } : { duration, easing: scrollEasing });
    return;
  }
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  if (typeof to === "number") {
    window.scrollTo({ top: to, behavior });
  } else {
    to.scrollIntoView({ behavior, block: "start" });
  }
}

/** Mirror the hash in the address bar without triggering a native jump. */
export function replaceHash(hash: string): void {
  try {
    window.history.replaceState(window.history.state, "", hash);
  } catch {
    /* history may be unavailable in some embedded contexts */
  }
}
