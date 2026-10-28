"use client";

import { motion } from "motion/react";
import type { Product } from "@/lib/types";
import { EASE_OUT_EXPO, cn } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

/**
 * Drawn stand-in for a product photo. Stock photography is never shown on a
 * price-bearing card (it would pass a stranger's pillow off as this one), so
 * until the owner's own listing photos arrive the card shows the product's
 * outline to scale instead: every size of the pillow anchored at one corner,
 * or, for the cover, a single dashed outline with "Cover only" across it.
 *
 * Fills its positioned parent (`absolute inset-0`), like a `next/image fill`.
 *
 * The picked outline (`highlight`, the finder's current answer) strokes itself
 * on arrival: `pathLength` 0 → 1 over 1.2s (INTERACTIVE.md). It is keyed on
 * the size, so a new answer redraws it; the finder also remounts the whole
 * card per answer. Motion normalises the dash pattern through the `pathLength`
 * attribute, which `vector-effect: non-scaling-stroke` would measure in screen
 * pixels instead, so that rect keeps a user-unit stroke (`PICKED_STROKE`,
 * ≈1px at the card's render size) and no vector effect. Reduced motion: drawn
 * at once.
 */

/** Stroke width of the picked outline in viewBox units (≈1px at 240 → ~500px). */
const PICKED_STROKE = 0.5;
const DRAW_HIDDEN = { pathLength: 0 } as const;
const DRAW_SHOWN = { pathLength: 1 } as const;

type ProductPlateProps = {
  product: Product;
  /** a variant `size` string to pick out (the finder's current answer) */
  highlight?: string;
  className?: string;
};

const VIEW_W = 240;
const VIEW_H = 160;
const PAD = 22;

type Dims = { w: number; h: number; size: string };

/** "17 × 27 in" → long edge horizontal. */
function parse(size: string): Dims | null {
  const m = /(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)/i.exec(size);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return { w: Math.max(a, b), h: Math.min(a, b), size };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ProductPlate({ product, highlight, className }: ProductPlateProps) {
  const reduced = useReducedMotionSafe();
  const sizes: Dims[] = [];
  for (const v of product.variants) {
    if (sizes.some((d) => d.size === v.size)) continue;
    const d = parse(v.size);
    if (d) sizes.push(d);
  }
  // Largest first, so the smaller outlines paint on top.
  sizes.sort((a, b) => b.w * b.h - a.w * a.h);

  const coverOnly = Boolean(product.badge);
  const maxW = Math.max(1, ...sizes.map((d) => d.w));
  const maxH = Math.max(1, ...sizes.map((d) => d.h));
  const scale = Math.min((VIEW_W - PAD * 2) / maxW, (VIEW_H - PAD * 2) / maxH);
  // Anchor every outline at the bottom-left corner of the largest one, centred in the box.
  const left = (VIEW_W - maxW * scale) / 2;
  const bottom = VIEW_H - (VIEW_H - maxH * scale) / 2;

  const sizeList = sizes
    .map((d) => d.size.replace(/\s*in$/, ""))
    .reverse()
    .join(", ");
  const label = coverOnly
    ? `Outline of the ${product.name}, ${sizes[0]?.size ?? ""}. ${product.badge}: no filling inside.`
    : `Outline of the ${product.name} sizes to scale: ${sizeList} in.`;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("absolute inset-0 flex items-center justify-center bg-paper-deep", className)}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        aria-hidden="true"
        focusable="false"
        className="block h-auto w-[86%] max-h-[86%]"
      >
        {sizes.map((d) => {
          const w = round2(d.w * scale);
          const h = round2(d.h * scale);
          const picked = highlight === d.size;
          const dimmed = highlight !== undefined && !picked;
          if (picked) {
            return (
              <motion.rect
                key={`${d.size}-picked`}
                x={round2(left)}
                y={round2(bottom - h)}
                width={w}
                height={h}
                rx={5}
                strokeWidth={PICKED_STROKE}
                strokeDasharray={coverOnly ? "4 3" : undefined}
                className="fill-sand stroke-ink transition-[fill] duration-500"
                initial={DRAW_HIDDEN}
                animate={DRAW_SHOWN}
                transition={reduced ? { duration: 0 } : { duration: 1.2, ease: EASE_OUT_EXPO }}
              />
            );
          }
          return (
            <rect
              key={d.size}
              x={round2(left)}
              y={round2(bottom - h)}
              width={w}
              height={h}
              rx={5}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={coverOnly ? "4 3" : undefined}
              className={cn(
                "transition-[fill,stroke] duration-500",
                coverOnly
                  ? "fill-none stroke-ink"
                  : picked
                    ? "fill-sand stroke-ink"
                    : dimmed
                      ? "fill-none stroke-ink/25"
                      : "fill-sand/40 stroke-ink/70",
              )}
            />
          );
        })}
      </svg>

      {coverOnly ? (
        <p
          aria-hidden="true"
          className="font-display pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(26px,3vw,40px)] text-ink"
        >
          {product.badge}
        </p>
      ) : null}

      <p
        aria-hidden="true"
        className="label pointer-events-none absolute bottom-4 left-4 text-stone-deep"
      >
        {coverOnly ? "No filling inside" : `${sizeList} in, to scale`}
      </p>
    </div>
  );
}
