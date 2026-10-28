"use client";

/**
 * Footer — MOTION.md "curtain reveal".
 *
 * Layout. After mount the root is `fixed inset-x-0 z-0` and publishes its own
 * height as `--footer-h` on <html> (ResizeObserver + window resize; removed on
 * unmount). The integrator gives <main> `relative z-10 bg-paper
 * mb-[var(--footer-h)]`, so the page keeps exactly one footer's height of room
 * below <main> and the footer is uncovered as the page scrolls off it. The
 * server render, and any page that does not actually reserve that room
 * (checked, never assumed), keep the footer in normal flow — nothing here
 * depends on the variable being applied.
 *
 * The footer is taller than every viewport (its photo strip alone is 70svh;
 * ≈1.6× the viewport at both 1440×900 and 375×812) and a fixed element can
 * only ever show one viewport of itself. So
 * while covered it is pinned near the viewport *top* (its lower part simply
 * hangs below the fold) and, once <main> has scrolled off it, the remaining
 * scroll translates it up 1:1 with the page, so it finishes in its natural
 * position with the wordmark flush to the page end. When it does fit it is
 * pinned to the bottom instead and never translates. "Near" the top: the
 * pinned top edge is kept `IN_VIEW_LEAD` of the viewport down, so the strip's
 * ImageReveal (which observes its own, never-clipped box) sits inside the
 * primitive's 6% root margin from the first frame and its wipe can fire.
 *
 * Reveals. IntersectionObserver ignores occlusion, so inside a fixed footer the
 * primitives' `trigger="view"` would fire while still hidden under <main>.
 * Each block therefore sits in a gate that stays `opacity: 0` until the
 * curtain (<main>'s bottom edge) has lifted ≥25% of the block (at most 8% of
 * the viewport) off it; the gate then remounts the block with
 * `trigger="immediate"` so the reveal plays as the block appears (except the
 * strip after a jump that lands deep in the translating phase, where a fresh
 * ImageReveal could never observe itself in band: there the gate just lifts).
 * The strip is the one block the curtain exposes from the *bottom*, so its
 * gate opens on the first uncovered pixel and its wipe runs bottom-up
 * (`clipFrom="bottom"`), following the curtain edge instead of painting a
 * stone slab under it; it is full-bleed (AESTHETIC.md: `h-[70svh]`, edge to
 * edge like PhotoBand, a `w-screen` box centred with `left-1/2
 * -translate-x-1/2` inside an `overflow-x-clip` gate so it never widens the
 * page), so it takes no velocity skew (the shear would tilt the photo against
 * the viewport edges). Its parallax is driven from the curtain's own progress
 * (`stripProgress`, set in `update`): a fixed element has no page position for
 * ImageReveal's `useScroll` to track. The wordmark animates on the same signal
 * directly. Reduced motion: no gating, and every primitive renders its final
 * state.
 *
 * Focus. Browsers cannot scroll a fixed element into view, so focusing a link
 * that is still under the curtain scrolls the page until it is uncovered — and
 * makes its block live first, so the remount cannot drop focus.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type RefCallback,
} from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  frame,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import type { ImageAsset, SiteContent } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { scrollToTarget } from "@/lib/scroll";
import {
  EASE_OUT_EXPO,
  ImageReveal,
  Magnetic,
  Reveal,
  SPRING_SOFT,
  TextReveal,
  cn,
  type TextRevealProps,
} from "@/lib/motion";
// `window.__lenis` is declared (`declare global`) by SmoothScroll and read by
// lib/scroll. This type-only import — erased at build time — keeps that
// augmentation in scope when this file is type-checked on its own.
import type {} from "@/components/SmoothScroll";

type FooterProps = {
  footer: SiteContent["footer"];
  image: ImageAsset;
  wordmark: string;
};

type Trigger = NonNullable<TextRevealProps["trigger"]>;
type Mode = "flow" | "fixed";

/** The independently gated regions, top to bottom. */
const BLOCKS = ["strip", "head", "links", "foot", "mark"] as const;
type Block = (typeof BLOCKS)[number];
/**
 * A gate is closed (`false`), or open: `"replay"` remounts the block so its
 * reveal plays now, `"keep"` only lifts the gate off the instance that already
 * revealed itself underneath (see `update`).
 */
type Gate = false | "replay" | "keep";
type Shown = Record<Block, Gate>;
const NONE_SHOWN: Shown = { strip: false, head: false, links: false, foot: false, mark: false };

/** Card stagger from MOTION.md. */
const ITEM_STAGGER = 0.07;
/** Giant wordmark: rises `y 30% → 0` and fades `0 → 0.06` once uncovered (MOTION.md). */
const MARK_HIDDEN = { y: "30%", opacity: 0 } as const;
const MARK_SHOWN = { y: "0%", opacity: 0.06 } as const;
/** Sub-pixel slack when checking that the page reserves the footer's height. */
const ROOM_SLACK = 2;
/** Breathing room kept around an element uncovered for keyboard focus. */
const FOCUS_PAD = 24;
/**
 * Fraction of the viewport the pinned footer's top edge stays below the
 * viewport top (see the header): just past ImageReveal's 6% root margin.
 */
const IN_VIEW_LEAD = 0.07;
/** ImageReveal's own `useInView` root margin, as a fraction of the viewport. */
const IMAGE_REVEAL_MARGIN = 0.06;
/**
 * How long after mount the footer stays at its pinned position even if the
 * page is already scrolled past it: one in-band evaluation is all the strip's
 * IntersectionObserver needs, and the preloader / route panel cover it.
 */
const MOUNT_HOLD_MS = 150;
/**
 * The strip drifts this fraction of its height across the curtain's lift
 * (±8%, the PhotoBand figure; the parallax layer carries 10% extra above and
 * below the box so the drift never shows an edge), and `STRIP_SCALE_FROM` is
 * the inner scale the wipe settles from (1.08, as on the bands: a 70svh photo
 * zooming from 1.25 reads as a lurch).
 */
const STRIP_PARALLAX = 0.08;
const STRIP_SCALE_FROM = 1.08;

/**
 * Mirrors `isPlaceholder` in lib/content (components never import that
 * module: copy arrives through props, and this predicate is the only thing
 * the footer needs from it). An unfilled owner value is "XXXXX" or wrapped in
 * <angle brackets>; app/page.tsx already blanks those on the server, and this
 * is the belt to its braces.
 */
const isPlaceholder = (v: string) => /X{3,}|<.*>/.test(v);

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

/** Where a footer of height `h` is pinned in a viewport of height `vh`. */
function pinnedGeometry(h: number, vh: number) {
  const lead = vh * IN_VIEW_LEAD;
  const fits = h <= vh - lead;
  // Where the top edge sits while pinned, and how far phase 2 has to carry
  // it up from there to finish bottom-flush with the page.
  const pinnedTop = fits ? vh - h : lead;
  const over = fits ? 0 : h - (vh - lead);
  return { vh, h, fits, pinnedTop, over };
}

/**
 * wa.me wants digits only, country code included. While the number in
 * `lib/content` is still a placeholder ("+91 XXXXX XXXXX") we return null and
 * the WhatsApp entry is left out entirely, so no placeholder ever reaches the
 * page. A bare 10-digit Indian mobile number gets the 91 prefix; anything
 * shorter cannot be a full number and is dropped too. A full URL is passed
 * through.
 */
function whatsappHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (isPlaceholder(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** ["WhatsApp", "email", "Amazon.in"] → "WhatsApp, email or Amazon.in" */
function listChannels(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

type ContactLink = {
  key: string;
  label: string;
  text: string;
  href: string;
  external: boolean;
};

export default function Footer({ footer, image, wordmark }: FooterProps) {
  const reduce = useReducedMotionSafe();

  const rootRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const blockEls = useRef<Record<Block, HTMLDivElement | null>>({
    strip: null,
    head: null,
    links: null,
    foot: null,
    mark: null,
  });
  const heightRef = useRef(0);

  // Server and hydration render the footer in flow; the layout effect below
  // measures it and switches to the fixed curtain before first paint.
  const [mode, setMode] = useState<Mode>("flow");
  const modeRef = useRef<Mode>("flow");
  const [pinBottom, setPinBottom] = useState(false);
  const pinRef = useRef(false);
  const [shown, setShown] = useState<Shown>(NONE_SHOWN);
  const shownRef = useRef<Shown>(NONE_SHOWN);
  const holdUntilRef = useRef(0);

  // Phase-2 translate for a footer taller than the viewport (see header).
  const y = useMotionValue(0);
  const { scrollY } = useScroll();

  // Curtain progress, 0 (strip fully covered) → 1 (<main> has left the
  // viewport), driving the strip's parallax through the usual soft spring.
  const stripProgress = useMotionValue(0);
  const stripDrift = useTransform(
    stripProgress,
    [0, 1],
    [`${STRIP_PARALLAX * 100}%`, `-${STRIP_PARALLAX * 100}%`],
  );
  const stripY = useSpring(stripDrift, SPRING_SOFT);

  const update = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const { vh, h, fits, pinnedTop, over } = pinnedGeometry(heightRef.current, window.innerHeight);
    const sy = window.scrollY;
    const docH = document.documentElement.scrollHeight;
    const mainRect = mainRef.current?.getBoundingClientRect() ?? null;
    stripProgress.set(mainRect ? clamp((vh - mainRect.bottom) / vh, 0, 1) : 1);

    // Curtain only when the page really reserves the footer's height below
    // <main>. Measured without the footer's own in-flow box so the answer is
    // the same in either mode (no flip-flopping).
    const inFlowNow = modeRef.current === "flow";
    const room = mainRect ? docH - (mainRect.bottom + sy) - (inFlowNow ? h : 0) : Infinity;
    const nextMode: Mode = h > 0 && room >= h - ROOM_SLACK ? "fixed" : "flow";
    if (nextMode !== modeRef.current) {
      modeRef.current = nextMode;
      setMode(nextMode);
    }
    if (fits !== pinRef.current) {
      pinRef.current = fits;
      setPinBottom(fits);
    }

    // Pinned while covered (`bottom-0` when it fits; otherwise `top-0`
    // translated down by the lead), then the last `over` px of scroll move it
    // up with the page. No spring here — this is layout standing in for
    // scroll, so it has to track 1:1.
    const remaining = Math.max(0, docH - vh - sy);
    const ty = nextMode === "fixed" && !fits ? pinnedTop - clamp(over - remaining, 0, over) : 0;
    const held = performance.now() < holdUntilRef.current;
    y.set(held && nextMode === "fixed" && !fits ? pinnedTop : ty);

    // Which blocks has the curtain lifted off (once, like `once: true`)?
    // Positions come from the footer's *intended* place: the transform above
    // lands on motion's next frame, so live rects can be a whole jump behind.
    const rootRect = root.getBoundingClientRect();
    const rootTop = nextMode === "fixed" ? (fits ? pinnedTop : ty) : rootRect.top;
    const curtain = nextMode === "fixed" && mainRect ? mainRect.bottom : -Infinity;
    let next: Shown | null = null;
    for (const block of BLOCKS) {
      if ((next ?? shownRef.current)[block]) continue;
      const el = blockEls.current[block];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0) continue;
      const top = rootTop + (r.top - rootRect.top);
      const bottom = top + r.height;
      const visible = Math.min(bottom, vh) - Math.max(top, curtain, 0);
      // The strip opens on its first uncovered pixel: its wipe follows the
      // curtain edge, so there is nothing to wait for.
      const need = block === "strip" ? 1 : Math.min(r.height * 0.25, vh * 0.08);
      if (visible >= need) {
        // A fresh ImageReveal can only wipe if its clipped top edge lands
        // inside its root margin. Scrolling always opens the strip while the
        // footer is still pinned (in band); after a jump deep into phase 2 it
        // cannot, so lift the gate off the instance that revealed underneath.
        const band = vh * IMAGE_REVEAL_MARGIN + 1;
        const replay = block !== "strip" || (top > band && top < vh - band);
        next = { ...(next ?? shownRef.current), [block]: replay ? "replay" : "keep" };
      }
    }
    if (next) {
      shownRef.current = next;
      setShown(next);
    }
  }, [y, stripProgress]);
  // Scroll-driven updates read their rects once per frame in motion's read
  // step (`frame.read` dedupes the same callback within a frame).
  const scheduleUpdate = useCallback(() => frame.read(update), [update]);

  // Measure → publish `--footer-h` → re-evaluate. Layout effect so a reload
  // that restores a scroll position near the end never paints the in-flow
  // footer for a frame.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const measure = () => {
      mainRef.current = document.querySelector("main");
      const h = root.offsetHeight;
      heightRef.current = h;
      html.style.setProperty("--footer-h", `${h}px`);
      update();
    };
    holdUntilRef.current = performance.now() + MOUNT_HOLD_MS;
    measure();
    const release = window.setTimeout(update, MOUNT_HOLD_MS + 20);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(release);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      html.style.removeProperty("--footer-h");
    };
  }, [update]);

  useMotionValueEvent(scrollY, "change", scheduleUpdate);

  /**
   * The scroll position at which `el` (inside the footer) is both uncovered
   * and on screen, or null when it already is.
   */
  const uncoverScroll = (el: HTMLElement): number | null => {
    const root = rootRef.current;
    if (!root) return null;
    const { vh, fits, pinnedTop, over } = pinnedGeometry(heightRef.current, window.innerHeight);
    const sy = window.scrollY;
    const limit = Math.max(0, document.documentElement.scrollHeight - vh);
    const mainRect = mainRef.current?.getBoundingClientRect() ?? null;
    const curtain = mainRect ? mainRect.bottom : -Infinity;

    const r = el.getBoundingClientRect();
    if (r.top >= Math.max(curtain, 0) && r.bottom <= vh) return null;

    // Offsets inside the footer are the same whether or not it is translated.
    const rootTop = root.getBoundingClientRect().top;
    const localTop = r.top - rootTop;
    const localBottom = r.bottom - rootTop;

    if (fits || localBottom + pinnedTop + FOCUS_PAD <= vh) {
      // On screen while pinned: scroll until <main> (moving 1:1 with the
      // page) has passed above it, staying within the pinned phase.
      if (!mainRect) return limit - over;
      const mainEnd = curtain + sy;
      return clamp(mainEnd - (localTop + pinnedTop - FOCUS_PAD), 0, limit - over);
    }
    // Below the fold while pinned: scroll into the translating phase until
    // it sits above the viewport bottom (everything is uncovered by then).
    const travel = clamp(localBottom + pinnedTop + FOCUS_PAD - vh, 0, over);
    return limit - (over - travel);
  };

  const onFocus = (event: ReactFocusEvent<HTMLElement>) => {
    const root = rootRef.current;
    const target = event.target;
    if (modeRef.current !== "fixed" || !root || !(target instanceof HTMLElement)) return;

    // Make its block live now, so the curtain's later remount cannot drop
    // focus; then move focus to the remounted twin, whose own focus event
    // does the uncovering below.
    const gate = target.closest<HTMLElement>("[data-curtain]");
    const block = BLOCKS.find((b) => b === gate?.dataset.curtain);
    if (block && !reduce && !shownRef.current[block]) {
      const href = target.getAttribute("href");
      const next: Shown = { ...shownRef.current, [block]: "replay" };
      shownRef.current = next;
      flushSync(() => setShown(next));
      const twin = Array.from(
        root.querySelectorAll<HTMLElement>(
          `[data-curtain="${block}"] a, [data-curtain="${block}"] button`,
        ),
      ).find((el) => (href ? el.getAttribute("href") === href : el.tagName === target.tagName));
      if (twin) {
        twin.focus({ preventScroll: true });
        return;
      }
    }

    // A fixed element never scrolls into view on its own: uncover it.
    const to = uncoverScroll(target);
    if (to !== null) scrollToTarget(to, reduce);
  };

  const scrollToTop = () => scrollToTarget(0, reduce, 1.6);

  // Gate helpers. `live`: the curtain is in effect and motion is wanted.
  const live = mode === "fixed" && !reduce;
  const replay = (block: Block) => live && shown[block] === "replay";
  const gateKey = (block: Block) => `${block}-${replay(block) ? "live" : "idle"}`;
  const gateStyle = (block: Block) => (live && !shown[block] ? { opacity: 0 } : undefined);
  const trigger = (block: Block): Trigger => (replay(block) ? "immediate" : "view");
  const gateRef = useMemo(() => {
    const refs = {} as Record<Block, RefCallback<HTMLDivElement>>;
    for (const block of BLOCKS) {
      refs[block] = (el) => {
        blockEls.current[block] = el;
      };
    }
    return refs;
  }, []);

  // Contact rows. Any value still in placeholder form (see `isPlaceholder` in
  // lib/content) is left out rather than rendered, so an unfilled CONTACT
  // block degrades to fewer rows, never to "+91 XXXXX XXXXX" on the page.
  const whatsapp = whatsappHref(footer.whatsapp);
  const email = footer.email.trim();
  const amazonStore = footer.amazonStore.trim();
  // No address on the page until the owner supplies a real one.
  const address = isPlaceholder(footer.address) ? "" : footer.address.trim();

  const links: ContactLink[] = [];
  if (whatsapp) {
    links.push({
      key: "whatsapp",
      label: "WhatsApp",
      text: footer.whatsapp.trim(),
      href: whatsapp,
      external: true,
    });
  }
  if (email && !isPlaceholder(email)) {
    links.push({
      key: "email",
      label: "Email",
      text: email,
      href: `mailto:${email}`,
      external: false,
    });
  }
  if (isUrl(amazonStore) && !isPlaceholder(amazonStore)) {
    links.push({
      key: "amazon",
      label: "Amazon.in",
      text: "Shop on Amazon.in",
      href: amazonStore,
      external: true,
    });
  }
  const channels = listChannels(links.map((l) => (l.key === "email" ? "email" : l.label)));
  const linkGrid = links.length >= 3 ? "sm:grid-cols-3" : links.length === 2 ? "sm:grid-cols-2" : "";

  // `tap` enlarges the hit box to ≥43px without moving the `.link-line` underline.
  const linkClass =
    "font-display link-line tap mt-3 inline-block max-w-full text-[clamp(22px,2vw,28px)] text-ink [overflow-wrap:anywhere]";

  const markShow = reduce || shown.mark;

  return (
    <motion.footer
      ref={rootRef}
      onFocus={onFocus}
      style={{ y }}
      className={cn(
        "bg-paper text-ink",
        mode === "fixed"
          ? cn("fixed inset-x-0 z-0 will-change-transform", pinBottom ? "bottom-0" : "top-0")
          : "relative z-0",
      )}
    >
      {/* Full-bleed photo strip above the enquiry line (see the header: wipe
          from the bottom, no skew, parallax from the curtain). The primitive's
          clip layer is overflow-hidden, so the oversized parallax layer never
          bleeds vertically; the gate's `overflow-x-clip` (clip, not hidden: no
          scroll container) swallows the half scrollbar-width a `w-screen` box
          hangs past either edge on desktop, so the page never scrolls
          sideways. The gate stays the measured block: its box is the strip's. */}
      <div
        key={gateKey("strip")}
        ref={gateRef.strip}
        data-curtain="strip"
        style={gateStyle("strip")}
        className="overflow-x-clip"
      >
        {/* The same edge-to-edge box as PhotoBand: viewport-wide, centred on
            its parent, 70svh tall (`svh`, so the phone URL bar never resizes
            it mid-scroll and `--footer-h` stays put). */}
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          <ImageReveal
            parallax={0}
            skew={false}
            scaleFrom={STRIP_SCALE_FROM}
            clipFrom="bottom"
            className="h-[70svh] w-full bg-stone"
          >
            <motion.div
              className="absolute inset-x-0 -inset-y-[10%] will-change-transform"
              style={live ? { y: stripY } : undefined}
            >
              {/* The fixed footer's box is inside the viewport from the first
                  paint (under <main>), so the browser fetches this at once either
                  way; saying so keeps Next's LCP hint quiet. `fetchPriority="low"`
                  lets the hero's preload win the connection. `sizes="100vw"`: the
                  box is exactly the viewport wide at every width. */}
              <Image
                src={image.src}
                alt={image.alt}
                fill
                loading="eager"
                fetchPriority="low"
                quality={80}
                sizes="100vw"
                className="object-cover"
                style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
              />
            </motion.div>
          </ImageReveal>
        </div>
      </div>

      {/* Enquiry line + contact links. `scroll-mt` keeps the rule clear of the
          fixed bar when linked to; the 72px floor on `pt` keeps the rule below
          the 64px bar on short phones, where the strip rests off-screen. The
          rhythm below the rule is kept tight at `lg` so that, at the page's
          resting position on a 1440×900 window, the rule sits well clear of the
          bar rather than under it. */}
      <section
        id="enquire"
        aria-labelledby="enquire-heading"
        className="scroll-mt-16 px-[var(--gutter)] pt-[clamp(72px,8vw,120px)] pb-[clamp(32px,4vw,48px)] md:scroll-mt-20"
      >
        <div className="mx-auto w-full max-w-[1440px]">
          <div key={gateKey("head")} ref={gateRef.head} data-curtain="head" style={gateStyle("head")}>
            <Reveal
              trigger={trigger("head")}
              className="rule flex items-baseline justify-between gap-4 pt-5"
            >
              <span className="label text-stone-deep">Shop</span>
              <span className="label hidden text-stone-deep sm:inline">{channels}</span>
            </Reveal>

            <TextReveal
              as="h2"
              id="enquire-heading"
              text={footer.enquiryLine}
              trigger={trigger("head")}
              delay={0.1}
              className="font-display mt-8 max-w-[16ch] text-balance text-[clamp(40px,6vw,96px)] text-ink lg:mt-12"
            />
          </div>

          <div
            key={gateKey("links")}
            ref={gateRef.links}
            data-curtain="links"
            style={gateStyle("links")}
          >
            <ul
              role="list"
              aria-label="Contact"
              className={`mt-12 grid grid-cols-1 gap-y-8 sm:gap-x-6 lg:mt-12 ${linkGrid}`}
            >
              {links.map((link, index) => (
                <li key={link.key} className="rule min-w-0 pt-4">
                  <Reveal trigger={trigger("links")} delay={index * ITEM_STAGGER}>
                    <span className="label block text-stone-deep">{link.label}</span>
                    {/* `max-w-full` keeps the magnetic box inside the column so a
                        long address still wraps instead of widening the page.
                        0.15: these are ~250px serif lines, not compact buttons. */}
                    <Magnetic strength={0.15} className="max-w-full">
                      <a
                        href={link.href}
                        className={linkClass}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                      >
                        {link.text}
                        {link.external ? (
                          <span className="sr-only"> (opens in a new tab)</span>
                        ) : null}
                      </a>
                    </Magnetic>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>

          <div
            key={gateKey("foot")}
            ref={gateRef.foot}
            data-curtain="foot"
            style={gateStyle("foot")}
            className="mt-16 lg:mt-14"
          >
            <Reveal
              trigger={trigger("foot")}
              className="rule flex flex-col gap-6 pt-6 sm:flex-row sm:items-start sm:justify-between"
            >
              {address ? (
                <address className="max-w-[36ch] not-italic text-ink-soft">{address}</address>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto">
                <Magnetic>
                  <Link href="/credits" className="label link-line tap py-2 text-ink">
                    Image credits
                  </Link>
                </Magnetic>
                <Magnetic>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="label link-line tap group inline-flex cursor-pointer items-center gap-2 py-2 text-ink"
                  >
                    Back to top
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5"
                    >
                      ↑
                    </span>
                  </button>
                </Magnetic>
              </div>
            </Reveal>

            <Reveal trigger={trigger("foot")} delay={0.1}>
              <p className="mt-8 text-[13px] leading-relaxed text-stone-deep">{footer.legal}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Giant faded wordmark, flush to the very bottom. One line always: 11.5vw
          fits the 14-glyph wordmark inside the gutters at every width (the
          contract's 18vw can never fit it on one line; 13.4vw fitted too but
          pushed the enquiry rule under the nav at 1440×900), and the wrapper
          clips the rise. Rises y 30% → 0 and fades 0 → 0.06 once the curtain
          has lifted off it. */}
      <div
        ref={gateRef.mark}
        data-curtain="mark"
        aria-hidden="true"
        className="overflow-hidden px-[var(--gutter)]"
      >
        {/* `initial` is the same object on every render (it matches the server
            markup) and `animate` is always set; reduced motion snaps to the
            shown state through the instant transition. Flipping `initial` to
            `false` once the preference is known would make motion skip the
            first pass and leave the wordmark at opacity 0. */}
        <motion.p
          className="font-display -mb-[0.1em] whitespace-nowrap text-[clamp(44px,11.5vw,196px)] leading-none text-ink select-none will-change-transform"
          initial={MARK_HIDDEN}
          animate={markShow ? MARK_SHOWN : MARK_HIDDEN}
          transition={reduce ? { duration: 0 } : { duration: 1.3, ease: EASE_OUT_EXPO }}
        >
          {wordmark}
        </motion.p>
      </div>
    </motion.footer>
  );
}
