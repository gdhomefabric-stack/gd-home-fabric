"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import type { SiteContent } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import {
  SCROLL_DURATION,
  SCROLL_START_EVENT,
  replaceHash,
  scrollToTarget,
  type ScrollStartDetail,
} from "@/lib/scroll";
import { EASE_IN_OUT, EASE_OUT_EXPO, Magnetic, TextReveal, cn, useReady } from "@/lib/motion";
// `window.__lenis` is declared (`declare global`) by SmoothScroll. This
// type-only import — erased at build time — keeps that augmentation in scope
// when this file is type-checked on its own.
import type {} from "@/components/SmoothScroll";

type NavProps = {
  wordmark: string;
  menu: SiteContent["nav"]["menu"];
  cta: SiteContent["nav"]["cta"];
};

/** Overlay unfurls downward like a blind and retracts upward on close. */
const CLIP_CLOSED = "inset(0% 0% 100% 0%)";
const CLIP_OPEN = "inset(0% 0% 0% 0%)";

/** Never hide the bar within this many px of the top of the page. */
const HIDE_AFTER_PX = 80;
/** Ignore scroll jitter smaller than this when deciding the direction. */
const DIRECTION_THRESHOLD_PX = 8;
/** After a scripted scroll or jump, the bar is back once scrolling has paused this long. */
const SETTLE_MS = 700;
/**
 * One scroll step at least this many viewports tall can only be a jump (an
 * `immediate` Lenis scroll, a hash landing): Lenis's lerp moves 8% of the
 * remaining distance per frame, so real wheel input never covers a whole
 * viewport in a single step.
 */
const JUMP_VIEWPORTS = 1;
/** If no preloader ever signals ready (another route, a failure), show the bar anyway. */
const READY_FALLBACK_MS = 4000;

/** Overlay links: first one starts here, each next one this much later. */
const LINK_DELAY = 0.35;
const LINK_STAGGER = 0.07;

const isExternal = (href: string) => /^https?:\/\//i.test(href);

export default function Nav({ wordmark, menu, cta }: NavProps) {
  const reduce = useReducedMotionSafe();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  /* ------------------------------------------------------------------
     Bar reveal: starts as soon as the preloader panel begins to slide
     away (`gdhf:exiting`; the top of the page is uncovered first) via
     the shared `useReady()`. It never stays hidden: if no preloader is
     present on this page a hard fallback shows it after 4s.
     ------------------------------------------------------------------ */
  const ready = useReady();
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFallback(true), READY_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, []);

  /* ------------------------------------------------------------------
     Scroll behaviour.
     - Hide on scroll-down, return on scroll-up (`scrollY` vs its previous
       value, 8px jitter threshold, never within the first 80px). Never
       hides while the menu is open or something inside it has focus.
     - A scripted scroll never hides it. `lib/scroll` announces every
       programmatic glide (`gdhf:scroll-start`, with its planned duration)
       — menu links, the side index, "See sizes and prices", back to
       top: the bar is shown at once and downward movement is ignored for
       that long plus a settle margin, then shown again once scrolling has
       paused for 700ms. A single step a whole viewport tall can only be a
       jump (an `immediate` Lenis scroll, a hash landing), so it gets the
       same treatment even when nothing announced it. A direction flip
       upward always brings the bar back; real wheel / touch scrolling
       down still hides it.
     - The bar blends (`mix-blend-difference`) at every scroll position:
       white over photos, ink over paper. Past the first viewport it only
       becomes clickable as a whole (`pointer-events-auto`).
     ------------------------------------------------------------------ */
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  // Downward movement before this time (`performance.now()` ms) is scripted.
  const scriptedUntil = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const clearSettle = useCallback(() => {
    if (settleTimer.current === null) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = null;
  }, []);
  // (Re)start the settle clock: once scrolling has paused for SETTLE_MS
  // after a jump, the scripted window closes and the bar is shown.
  const armSettle = useCallback(() => {
    clearSettle();
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null;
      scriptedUntil.current = 0;
      setHidden(false);
    }, SETTLE_MS);
  }, [clearSettle]);

  useEffect(() => {
    // Scroll restoration / hash landings: sync before the first scroll event.
    setPastHero(window.scrollY > window.innerHeight);

    const onScripted = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ScrollStartDetail>>).detail;
      const seconds = typeof detail?.duration === "number" ? detail.duration : SCROLL_DURATION;
      scriptedUntil.current = performance.now() + seconds * 1000 + SETTLE_MS;
      setHidden(false);
      armSettle();
    };
    window.addEventListener(SCROLL_START_EVENT, onScripted);
    return () => {
      window.removeEventListener(SCROLL_START_EVENT, onScripted);
      clearSettle();
    };
  }, [armSettle, clearSettle]);

  useMotionValueEvent(scrollY, "change", (y) => {
    setPastHero(y > window.innerHeight);
    const prev = scrollY.getPrevious() ?? y;
    const delta = y - prev;
    if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return;
    if (delta < 0 || y <= HIDE_AFTER_PX) {
      setHidden(false);
      return;
    }
    // Scrolling down. Scripted (announced, or a jump nothing announced): keep
    // the bar and wait for the scroll to settle. Real input: hide, and drop
    // any pending settle so an old jump cannot bring the bar straight back.
    const now = performance.now();
    if (delta >= window.innerHeight * JUMP_VIEWPORTS) {
      scriptedUntil.current = Math.max(scriptedUntil.current, now + SETTLE_MS);
    }
    if (now < scriptedUntil.current) {
      setHidden(false);
      armSettle();
      return;
    }
    clearSettle();
    setHidden(true);
  });

  /* ------------------------------------------------------------------
     Scroll lock + keyboard while the overlay is open.
     Lenis is stopped (and `lenis-stopped` set on <html>), `data-lenis-prevent`
     goes on <body>, plus an inline overflow lock so the page is held even on a
     route where Lenis is not mounted. <main> and <footer> become `inert` so
     the dialog is truly modal for assistive tech. Escape closes; Tab is
     trapped between the bar's toggle and the overlay's links; focus returns
     to the toggle on close.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const toggleEl = toggleRef.current;
    const overlayEl = overlayRef.current;
    const prevOverflow = html.style.overflow;
    const behind = [document.querySelector("main"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    const lenis = window.__lenis;

    html.classList.add("lenis-stopped");
    html.style.overflow = "hidden";
    body.setAttribute("data-lenis-prevent", "");
    for (const el of behind) el.setAttribute("inert", "");
    lenis?.stop();

    const raf = window.requestAnimationFrame(() => {
      overlayEl?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !overlayEl) return;
      const nodes = Array.from(
        overlayEl.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (toggleEl) nodes.unshift(toggleEl);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && nodes.includes(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.classList.remove("lenis-stopped");
      html.style.overflow = prevOverflow;
      body.removeAttribute("data-lenis-prevent");
      for (const el of behind) el.removeAttribute("inert");
      // Only hand scroll back if the preloader is not still holding it.
      if (lenis && html.dataset.ready === "true") lenis.start();
      toggleEl?.focus({ preventScroll: true });
    };
  }, [open]);

  /* Same-page hash links glide (via lib/scroll) after the overlay starts closing. */
  const onMenuLink = (e: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) {
      close();
      return;
    }
    const target = document.getElementById(href.slice(1));
    if (!target) {
      close();
      return;
    }
    e.preventDefault();
    close();
    replaceHash(href);
    window.setTimeout(() => scrollToTarget(target, reduce), 60);
  };

  /* The bar's CTA is a plain anchor; upgrade it to the shared smooth scroll. */
  const onBarLink = (e: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target, reduce);
    replaceHash(href);
  };

  const onWordmark = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== "/") return;
    e.preventDefault();
    close();
    scrollToTarget(0, reduce);
  };

  /* Overlay chrome: fades up on open, and reverses (shorter, undelayed) on close. */
  const fadeUp = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: reduce
      ? undefined
      : { opacity: 0, y: -10, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
    transition: reduce ? { duration: 0 } : { duration: 0.9, delay, ease: EASE_OUT_EXPO },
  });

  const barShown = reduce || ready || fallback;
  const barVisible = barShown && (open || !hidden);
  // First reveal rides in with the preloader exit (0.15s after it starts);
  // later show/hide moves are shorter and undelayed.
  const [intro, setIntro] = useState(true);
  const ctaExternal = isExternal(cta.href);

  return (
    <>
      {/* ------------------------------------------------------------
          Fixed bar. `text-white mix-blend-difference` at every scroll
          position: it inverts over photos and renders as ink over paper
          (no paper strip, no blur: a translucent bar would wash a cream
          band over every full-bleed photo). The blend lives on <header>
          and nothing else is rendered inside it, so the overlay below
          never breaks it.
          `initial` is identical on server and client (hydration-safe);
          reduced motion simply snaps to the shown state.
          ------------------------------------------------------------ */}
      <header
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50",
          "text-white mix-blend-difference",
        )}
        onFocusCapture={() => setHidden(false)}
      >
        <motion.div
          className={cn(pastHero && "pointer-events-auto")}
          initial={{ opacity: 0, y: "-15%" }}
          animate={
            !barShown
              ? { opacity: 0, y: "-15%" }
              : barVisible
                ? { opacity: 1, y: "0%" }
                : { opacity: 1, y: "-100%" }
          }
          transition={
            reduce
              ? { duration: 0 }
              : intro
                ? { duration: 0.9, delay: 0.15, ease: EASE_OUT_EXPO }
                : { duration: 0.6, ease: EASE_OUT_EXPO }
          }
          onAnimationComplete={() => {
            if (barShown) setIntro(false);
          }}
        >
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-[var(--gutter)] md:h-20">
            {/* Magnetic strengths: 0.35 (the default) is tuned for compact
                buttons; on a ~140px wordmark / ~55px text link it would carry
                the text tens of px. `tap` lifts the 29px-tall wordmark to a
                ≥44px target (it is the only back-to-top on phones). */}
            <Magnetic strength={0.18} className="pointer-events-auto">
              <a
                href="/"
                onClick={onWordmark}
                aria-label={`${wordmark}, back to top`}
                className="font-display tap inline-block text-[22px] leading-none tracking-tight md:text-[24px]"
              >
                {wordmark}
              </a>
            </Magnetic>

            <div className="flex items-center gap-6 md:gap-10">
              <div className="hidden sm:block">
                <Magnetic strength={0.25} className="pointer-events-auto">
                  <a
                    href={cta.href}
                    onClick={(e) => onBarLink(e, cta.href)}
                    target={ctaExternal ? "_blank" : undefined}
                    rel={ctaExternal ? "noopener noreferrer" : undefined}
                    className="label link-line tap inline-block py-1"
                  >
                    {cta.label}
                  </a>
                </Magnetic>
              </div>

              {/* Negative margins cancel the padding, so the ≥45px-tall hit
                  area (label + 2×17px) does not change the bar's layout. */}
              <button
                ref={toggleRef}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls="site-menu"
                className="label pointer-events-auto -mx-3 -my-[17px] flex items-center gap-3 px-3 py-[17px]"
              >
                <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
                {/* two hairlines that fold into a cross */}
                <span aria-hidden className="relative block h-[9px] w-5">
                  <motion.span
                    className="absolute left-0 top-0 block h-px w-full bg-current"
                    animate={{ y: open ? 4 : 0, rotate: open ? 45 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                  <motion.span
                    className="absolute bottom-0 left-0 block h-px w-full bg-current"
                    animate={{ y: open ? -4 : 0, rotate: open ? -45 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </span>
                {/* "Menu" / "Close" roll in a masked slot. The roller holds two
                    equal rows, so one row up is half its own height (-50%);
                    -100% would carry both rows out of the slot. Rows are `1em`
                    (the `.label` line-height), so they follow the label's
                    font-size (11px, 12px on phones) and the roll lands on a
                    whole row. */}
                <span aria-hidden className="relative block h-[1em] overflow-hidden">
                  <motion.span
                    className="block"
                    animate={{ y: open ? "-50%" : "0%" }}
                    transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT_EXPO }}
                  >
                    <span className="block h-[1em]">Menu</span>
                    <span className="block h-[1em]">Close</span>
                  </motion.span>
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </header>

      {/* ------------------------------------------------------------
          Full-screen overlay, rendered as a sibling of the bar (outside
          the blend), beneath it in z-order so the bar inverts to ink
          over the paper and its Close button stays live. Everything
          inside carries an `exit`, so closing plays the opening in
          reverse under AnimatePresence.
          ------------------------------------------------------------ */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="site-menu"
            id="site-menu"
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 overflow-x-hidden overflow-y-auto bg-paper text-ink outline-none"
            initial={reduce ? false : { clipPath: CLIP_CLOSED }}
            animate={{ clipPath: CLIP_OPEN }}
            exit={{ clipPath: CLIP_CLOSED }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_IN_OUT }}
          >
            {/* Sized to the viewport: the row type, row padding and top
                offset all scale with `svh` so the whole list plus the contact
                block fit one screen from 1280×720 up and on a 375×667 phone
                (8 rows at the 30px type floor ≈ 45px each, still a ≥44px tap
                target; the overlay only scrolls as a last resort on very short
                windows). The bottom padding never dips under the home
                indicator's safe area. */}
            <div className="mx-auto flex min-h-full max-w-[1440px] flex-col px-[var(--gutter)] pt-[clamp(64px,10svh,128px)] pb-[max(clamp(24px,4svh,48px),env(safe-area-inset-bottom))]">
              <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8">
                <motion.div className="lg:col-span-3" {...fadeUp(0.3)}>
                  <p className="label text-stone-deep">Menu</p>
                  <p className="label mt-3 hidden text-stone-deep lg:block">
                    Esc to close
                  </p>
                </motion.div>

                <nav aria-label="Primary" className="relative lg:col-span-9">
                  {/* Vertical hairline: draws down from the top as the links
                      arrive, retracts the same way on close. The rows' rules
                      meet it, so the list reads as one ruled grid. */}
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-px origin-top bg-hairline"
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={
                      reduce
                        ? undefined
                        : { scaleY: 0, transition: { duration: 0.5, ease: EASE_IN_OUT } }
                    }
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 1.2, delay: LINK_DELAY - 0.1, ease: EASE_OUT_EXPO }
                    }
                  />
                  <ol className="rule">
                    {menu.map((item, i) => {
                      const delay = LINK_DELAY + i * LINK_STAGGER;
                      // Close in reverse order, quickly, under the retracting panel.
                      const exitDelay = (menu.length - 1 - i) * 0.03;
                      return (
                        <li key={`${item.href}-${i}`} className="border-b border-hairline">
                          <a
                            href={item.href}
                            onClick={(e) => onMenuLink(e, item.href)}
                            className="group flex items-baseline gap-4 py-[clamp(6px,1svh,20px)] pl-5 md:gap-8 md:pl-8 lg:pl-10"
                          >
                            <motion.span
                              className="label w-8 shrink-0 text-stone-deep tabular-nums transition-colors duration-500 group-hover:text-ink md:w-12"
                              initial={reduce ? false : { opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={
                                reduce
                                  ? undefined
                                  : { opacity: 0, transition: { duration: 0.3, delay: exitDelay } }
                              }
                              transition={
                                reduce
                                  ? { duration: 0 }
                                  : { duration: 0.6, delay: delay + 0.2, ease: EASE_OUT_EXPO }
                              }
                            >
                              ({i + 1}).
                            </motion.span>
                            {/* The exit lives on its own wrapper so the hover
                                shift's CSS transition never slows motion's
                                transform updates. */}
                            <motion.span
                              className="block min-w-0"
                              exit={
                                reduce
                                  ? undefined
                                  : {
                                      opacity: 0,
                                      y: 10,
                                      transition: { duration: 0.4, delay: exitDelay, ease: EASE_OUT_EXPO },
                                    }
                              }
                            >
                              <span className="block font-display text-[clamp(30px,min(6vw,5.6svh),80px)] leading-[1.02] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 md:group-hover:translate-x-4">
                                <TextReveal
                                  text={item.label}
                                  as="span"
                                  trigger="immediate"
                                  delay={delay}
                                  className="block"
                                />
                              </span>
                            </motion.span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              </div>

              {/* contact line + cta, pinned to the bottom of the overlay */}
              <motion.div
                className="mt-auto pt-[clamp(24px,5svh,64px)]"
                {...fadeUp(LINK_DELAY + menu.length * LINK_STAGGER + 0.15)}
              >
                <div className="rule flex flex-col gap-6 pt-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="label text-stone-deep">Buy on Amazon.in</p>
                    {/* `tap` (::before) and `link-line` (::after) coexist; below
                        `sm` this is the only contact CTA reachable from the bar. */}
                    <a
                      href={cta.href}
                      onClick={(e) => onMenuLink(e, cta.href)}
                      target={ctaExternal ? "_blank" : undefined}
                      rel={ctaExternal ? "noopener noreferrer" : undefined}
                      className="link-line tap mt-3 inline-block font-display text-[clamp(24px,3vw,40px)] leading-[1.05]"
                    >
                      {cta.label}
                      <span aria-hidden className="ml-2 inline-block">
                        →
                      </span>
                    </a>
                  </div>
                  <p className="label text-stone-deep">{wordmark}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
