"use client";

/**
 * Lightbox — one full-screen viewer for the whole page.
 *
 * `LightboxProvider` mounts the viewer once (app/page.tsx) and hands out
 * `open(images, index)` / `close()` through `useLightbox()`. A photo button
 * anywhere (`data-cursor="open"`, which grows the custom cursor to its 120px
 * "Open" state) calls `open` with the photos of its own section, so ←/→ stay
 * inside that section.
 *
 * - Dark paper (`bg-ink/95`); the photo is `object-contain` up to 92vh via
 *   next/image (`sizes="100vw"`), caption = the asset's alt in label style.
 * - Prev/next buttons and arrow keys; Escape, the backdrop and the close
 *   button all close. Focus is trapped among the viewer's controls while it
 *   is open and returns to the opener on close.
 * - Scroll lock mirrors Nav's menu: Lenis stopped through `window.__lenis`,
 *   `lenis-stopped` on <html>, an inline overflow lock, `inert` on main and
 *   footer. Lenis is only restarted if the preloader is not still holding it.
 * - `AnimatePresence`: the panel scales 0.96 → 1 and fades; the backdrop
 *   fades. Reduced motion keeps the fade only (no scale).
 * - Controls carry `data-cursor="link"` so the custom cursor shrinks over them.
 */

import Image from "next/image";
import type Lenis from "lenis";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { ImageAsset } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { cn, EASE_OUT_EXPO } from "@/lib/motion";

declare global {
  interface Window {
    /** The live Lenis instance driving window scroll (see components/SmoothScroll.tsx). */
    __lenis?: Lenis;
  }
}

export type LightboxApi = {
  open(images: ImageAsset[], index: number): void;
  close(): void;
};

type LightboxState = { images: ImageAsset[]; index: number } | null;

const noop = () => {};
const LightboxCtx = createContext<LightboxApi>({ open: noop, close: noop });

/** The lightbox controls; a no-op pair when no `LightboxProvider` is mounted. */
export function useLightbox(): LightboxApi {
  return useContext(LightboxCtx);
}

const INSTANT = { duration: 0 } as const;

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((images: ImageAsset[], index: number) => {
    if (images.length === 0) return;
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
    const i = Math.min(Math.max(0, index), images.length - 1);
    setState({ images, index: i });
  }, []);

  const close = useCallback(() => setState(null), []);

  const step = useCallback((dir: 1 | -1) => {
    setState((s) => {
      if (!s) return s;
      const n = s.images.length;
      return { ...s, index: (s.index + dir + n) % n };
    });
  }, []);

  const api = useMemo<LightboxApi>(() => ({ open, close }), [open, close]);

  return (
    <LightboxCtx.Provider value={api}>
      {children}
      <Viewer state={state} onClose={close} onStep={step} openerRef={openerRef} />
    </LightboxCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------

type ViewerProps = {
  state: LightboxState;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
  openerRef: RefObject<HTMLElement | null>;
};

const CONTROL_CLASS = cn(
  "label text-paper/80 hover:text-paper transition-colors duration-500",
  "tap px-2 py-3 min-h-11 inline-flex items-center",
);

/**
 * The prev/next arrows: positioned at the side edges, so no `tap` (its
 * unlayered `position: relative` would beat the `absolute` utility and drop
 * the arrows into the flex flow); the padding alone gives a ≥44px hit box.
 */
const ARROW_CLASS = cn(
  "label text-paper/80 hover:text-paper transition-colors duration-500",
  "absolute top-1/2 -translate-y-1/2 inline-flex min-h-11 min-w-11 items-center justify-center p-3",
);

function Viewer({ state, onClose, onStep, openerRef }: ViewerProps) {
  const reduced = useReducedMotionSafe();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openVisible = state !== null;

  /* Scroll lock, keyboard and focus while the viewer is open. */
  useEffect(() => {
    if (!openVisible) return;
    const html = document.documentElement;
    const body = document.body;
    const dialog = dialogRef.current;
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
      dialog?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onStep(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onStep(-1);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (nodes.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
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

    const opener = openerRef.current;
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.classList.remove("lenis-stopped");
      html.style.overflow = prevOverflow;
      body.removeAttribute("data-lenis-prevent");
      for (const el of behind) el.removeAttribute("inert");
      if (lenis && html.dataset.ready === "true") lenis.start();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [openVisible, onClose, onStep, openerRef]);

  const asset = state ? state.images[state.index] : null;
  const count = state ? state.images.length : 0;
  const fade = reduced ? INSTANT : { duration: 0.6, ease: EASE_OUT_EXPO };
  const panelHidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 };
  const panelShown = reduced ? { opacity: 1 } : { opacity: 1, scale: 1 };

  return (
    <AnimatePresence>
      {state && asset ? (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-[80] bg-ink/95 text-paper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={asset.alt}
            tabIndex={-1}
            className="absolute inset-0 flex flex-col outline-none"
            initial={panelHidden}
            animate={panelShown}
            exit={panelHidden}
            transition={reduced ? INSTANT : { duration: 0.8, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* top bar */}
            <div className="flex items-center justify-between px-[var(--gutter)] pt-4">
              <span className="label text-paper/60" aria-live="polite">
                {count > 1 ? `${state.index + 1} / ${count}` : ""}
              </span>
              <button
                type="button"
                data-cursor="link"
                className={CONTROL_CLASS}
                onClick={onClose}
              >
                Close
              </button>
            </div>

            {/* photo: click outside the image (but inside the panel) closes too */}
            <div
              className="relative flex flex-1 items-center justify-center min-h-0 px-[var(--gutter)]"
              onClick={onClose}
            >
              <motion.div
                key={asset.src}
                className="relative flex items-center justify-center max-h-[92vh] max-w-full"
                initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={fade}
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={asset.src}
                  alt={asset.alt}
                  width={asset.width}
                  height={asset.height}
                  sizes="100vw"
                  className="object-contain w-auto h-auto max-h-[92vh] max-w-full select-none"
                  draggable={false}
                />
              </motion.div>

              {count > 1 ? (
                <>
                  <button
                    type="button"
                    data-cursor="link"
                    aria-label="Previous photo"
                    className={cn(ARROW_CLASS, "left-[var(--gutter)]")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStep(-1);
                    }}
                  >
                    <span aria-hidden>←</span>
                  </button>
                  <button
                    type="button"
                    data-cursor="link"
                    aria-label="Next photo"
                    className={cn(ARROW_CLASS, "right-[var(--gutter)]")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStep(1);
                    }}
                  >
                    <span aria-hidden>→</span>
                  </button>
                </>
              ) : null}
            </div>

            {/* caption */}
            <div className="px-[var(--gutter)] pb-5 pt-3">
              <p className="label text-paper/70 normal-case tracking-[0.08em] max-w-[60ch]">
                {asset.alt}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
