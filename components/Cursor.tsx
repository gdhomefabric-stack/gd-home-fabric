"use client";

/**
 * Custom cursor — MOTION.md "Global (new files)".
 *
 * An 8px dot that tracks the pointer instantly and a 40px ring that follows it
 * on a spring. Both sit under `mix-blend-mode: difference`, so they invert over
 * photos. Over `[data-cursor="view"]` the ring grows to 88px, fills, and shows a
 * serif "View"; over `[data-cursor="open"]` (lightbox triggers, INTERACTIVE.md
 * §3) it grows to 120px with "Open"; over `[data-cursor="drag"]` (the materials
 * drag gallery) to 96px with "Drag"; over `a, button, [data-cursor="link"]` it
 * shrinks to 24px; over `[data-cursor="dot"]` (small labelled controls such as
 * the finder chips and the care toggles, where a 24px ring would paint through
 * the label) the ring folds away and only the dot remains. Pressing the
 * pointer squeezes the ring to 80% and swells the dot to 160% until release.
 * Nothing is rendered on coarse pointers or under reduced motion.
 *
 * Mount once per page (home and /credits). Hover state is delegated: a single
 * `pointerover`/`pointerout` pair on `document` resolves the target with
 * `closest()`, so elements never need their own handlers.
 */

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT_EXPO, SPRING_SNAPPY } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

type Mode = "default" | "link" | "dot" | "view" | "open" | "drag";

/** Resting ring diameter. The other states scale it — width/height never animate. */
const RING_PX = 40;
const RING_SCALE: Record<Mode, number> = {
  default: 1,
  link: 24 / RING_PX,
  dot: 0,
  view: 88 / RING_PX,
  open: 120 / RING_PX,
  drag: 96 / RING_PX,
};
/**
 * Labelled states: the ring fills and carries a serif word. The label is
 * painted black under `difference`, which only reads on the filled disc, so
 * every labelled state is also a filled one.
 */
const LABEL: Partial<Record<Mode, string>> = {
  view: "View",
  open: "Open",
  drag: "Drag",
};
/** Press feedback: ring squeeze and dot swell while the pointer is down. */
const PRESS_RING = 0.8;
const PRESS_DOT = 1.6;

/**
 * Everything here is painted under `difference`, which shows |backdrop − paint|.
 * This is paper minus ink (#faf7f2 − #1c2230): over the page it resolves to
 * exactly `ink`, over a dark photo to a warm light — the inversion the spec
 * asks for. (Literal `ink` under `difference` would be near-invisible on both.)
 */
const PAINT = "#ded5c2";
const PAINT_CLEAR = "rgba(222, 213, 194, 0)";

/** Which cursor state the element under the pointer asks for. */
function modeFor(target: EventTarget | null): Mode {
  if (!(target instanceof Element)) return "default";
  // Most specific first: a lightbox trigger is usually also a button.
  if (target.closest('[data-cursor="open"]')) return "open";
  if (target.closest('[data-cursor="drag"]')) return "drag";
  if (target.closest('[data-cursor="view"]')) return "view";
  if (target.closest('[data-cursor="dot"]')) return "dot";
  if (target.closest('a, button, [data-cursor="link"]')) return "link";
  return "default";
}

export default function Cursor() {
  const reduced = useReducedMotionSafe();
  // Decided in an effect so the server and the hydrating client both render nothing.
  const [finePointer, setFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [pressed, setPressed] = useState(false);

  // Dot: the raw pointer position. Ring + label: the same position through a spring.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, SPRING_SNAPPY);
  const ringY = useSpring(y, SPRING_SNAPPY);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setFinePointer(!coarse.matches);
    update();
    coarse.addEventListener("change", update);
    return () => coarse.removeEventListener("change", update);
  }, []);

  const active = finePointer && !reduced;

  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    html.classList.add("gdhf-cursor");

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      setMode(modeFor(e.target));
    };
    // `relatedTarget === null` means the pointer left the document.
    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget === null) {
        setVisible(false);
        setMode("default");
        setPressed(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") setPressed(true);
    };
    const onUp = () => setPressed(false);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      html.classList.remove("gdhf-cursor");
    };
  }, [active, x, y]);

  // The word stays put while the label fades out, so leaving a trigger never
  // swaps "Open" for "View" mid-fade.
  const lastLabel = useRef<string>("View");
  const label = LABEL[mode];
  if (label) lastLabel.current = label;

  if (!active) return null;

  const filled = label !== undefined;
  const ringScale = RING_SCALE[mode] * (pressed ? PRESS_RING : 1);
  const dotScale = filled ? 0 : pressed ? PRESS_DOT : 1;

  return (
    <>
      {/* Hide the native arrow while the custom cursor is live. Scoped to the
          html class the effect toggles, so it leaves with the component. */}
      <style>{`.gdhf-cursor, .gdhf-cursor * { cursor: none !important; }`}</style>

      <motion.div
        aria-hidden="true"
        data-gdhf-cursor=""
        className="pointer-events-none fixed inset-0 z-[90] mix-blend-difference"
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        {/* Ring + label: lag behind on the spring. */}
        <motion.div className="absolute top-0 left-0 will-change-transform" style={{ x: ringX, y: ringY }}>
          <motion.span
            className="absolute -top-5 -left-5 block h-10 w-10 rounded-full border"
            style={{ borderColor: PAINT }}
            animate={{ scale: ringScale, backgroundColor: filled ? PAINT : PAINT_CLEAR }}
            transition={{
              scale: { type: "spring", ...SPRING_SNAPPY },
              backgroundColor: { duration: 0.4, ease: EASE_OUT_EXPO },
            }}
          />
          {/* Black under `difference` shows the backdrop through: paper-coloured
              type on the ink-coloured disc over the page. */}
          <motion.span
            className="font-display absolute -top-11 -left-11 flex h-22 w-22 items-center justify-center text-[16px] leading-none text-black select-none"
            animate={{ opacity: filled ? 1 : 0, y: filled ? 0 : 6 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {lastLabel.current}
          </motion.span>
        </motion.div>

        {/* Dot: tracks instantly; folds away while the ring is filled, swells on press. */}
        <motion.div className="absolute top-0 left-0 will-change-transform" style={{ x, y }}>
          <motion.span
            className="absolute -top-1 -left-1 block h-2 w-2 rounded-full"
            style={{ backgroundColor: PAINT }}
            animate={{ scale: dotScale }}
            transition={{ type: "spring", ...SPRING_SNAPPY }}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
