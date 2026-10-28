"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { Faq } from "@/lib/types";
import { EASE_OUT_EXPO, EASE_SOFT, Reveal, TextReveal } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

type CareProps = {
  items: Faq[];
};

/**
 * Card stagger from MOTION.md: 0.07s between rows. Each row reveals on its own
 * `useInView`, so the delay only needs to order the rows that enter together;
 * it is capped so a row that scrolls in on its own never waits half a second
 * after it appears.
 */
const ROW_STAGGER = 0.07;
const ROW_STAGGER_CAP = 5;
/** Rows rise a little less than a paragraph so the hairlines stay tidy. */
const ROW_Y = 20;
/** The answer rises inside the opening panel, just behind the height. */
const ANSWER_Y = 16;
const ANSWER_DELAY = 0.1;
/** Row hover: the question slides right by this many px (MOTION.md). */
const HOVER_SHIFT = 6;
const HOVER_DURATION = 0.6;
/** The `+` turns into a `×` on open. */
const PLUS_ROTATION = 45;
const PLUS_DURATION = 0.6;

/**
 * Row hover. The labels live on the button (the whole row) and propagate to
 * the question text, so hovering the index or the `+` shifts it too.
 */
const questionVariants: Variants = {
  rest: { x: 0 },
  hover: { x: HOVER_SHIFT },
};

/** "01" → "(1)." in the reference's label style. */
function formatIndex(i: number): string {
  return `(${i + 1}).`;
}

type CareItemProps = {
  item: Faq;
  index: number;
  open: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
  /** seconds; stagger offset for rows that enter the viewport together */
  delay: number;
};

function CareItem({ item, index, open, onToggle, reduceMotion, delay }: CareItemProps) {
  const questionId = `care-q-${index}`;
  const answerId = `care-a-${index}`;

  const heightTransition = reduceMotion
    ? { duration: 0 }
    : {
        height: { duration: 0.65, ease: EASE_OUT_EXPO },
        opacity: { duration: 0.45, ease: EASE_SOFT },
      };

  const hoverTransition = reduceMotion
    ? { duration: 0 }
    : { duration: HOVER_DURATION, ease: EASE_OUT_EXPO };

  const plusTransition = reduceMotion
    ? { duration: 0 }
    : { duration: PLUS_DURATION, ease: EASE_OUT_EXPO };

  return (
    <li className="min-w-0">
      {/* The hairline rides on the Reveal so the whole row rises as one. */}
      <Reveal delay={delay} y={ROW_Y} className="rule">
        <h3 className="m-0">
          {/* `data-cursor="dot"`: the custom cursor keeps only its dot over
              the row, so the ring never paints through the `+`. */}
          <motion.button
            type="button"
            id={questionId}
            aria-expanded={open}
            aria-controls={answerId}
            onClick={onToggle}
            data-cursor="dot"
            initial="rest"
            animate="rest"
            whileHover={reduceMotion ? undefined : "hover"}
            className="flex w-full cursor-pointer items-start justify-between gap-4 py-6 text-left text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink sm:gap-8 sm:py-7"
          >
            <span
              aria-hidden="true"
              className="label w-10 shrink-0 pt-[0.55em] tabular-nums text-stone-deep sm:w-14"
            >
              {formatIndex(index)}
            </span>

            <motion.span
              variants={questionVariants}
              transition={hoverTransition}
              className="font-display min-w-0 flex-1 break-words text-[clamp(20px,2vw,26px)] will-change-transform"
            >
              {item.q}
            </motion.span>

            {/* `initial={false}`: the row that is open on load renders as `×`
                straight away instead of turning after hydration. */}
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ rotate: open ? PLUS_ROTATION : 0 }}
              transition={plusTransition}
              className="font-display flex h-8 w-8 shrink-0 items-center justify-center text-[30px] leading-none text-ink will-change-transform sm:h-9 sm:w-9 sm:text-[34px]"
            >
              +
            </motion.span>
          </motion.button>
        </h3>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="answer"
              id={answerId}
              role="region"
              aria-labelledby={questionId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={heightTransition}
              className="overflow-hidden"
            >
              <div className="flex gap-4 pb-7 sm:gap-8 sm:pb-9">
                <span aria-hidden="true" className="w-10 shrink-0 sm:w-14" />
                {/* `trigger="immediate"`: the panel mounts at height 0, so an
                    in-view observer on the text might never fire; the Reveal
                    plays the moment the answer opens. */}
                <Reveal
                  trigger="immediate"
                  delay={ANSWER_DELAY}
                  y={ANSWER_Y}
                  className="min-w-0 flex-1"
                >
                  <p className="m-0 max-w-[62ch] text-[15px] leading-[1.7] text-ink-soft">
                    {item.a}
                  </p>
                </Reveal>
                <span aria-hidden="true" className="hidden w-8 shrink-0 sm:block sm:w-9" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Reveal>
    </li>
  );
}

export default function Care({ items }: CareProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference, so `initial` matches the server-rendered styles.
  const reduceMotion = useReducedMotionSafe();
  const [openIndex, setOpenIndex] = useState<number | null>(
    items.length > 0 ? 0 : null,
  );

  const count = items.length;

  return (
    <section
      id="care"
      aria-labelledby="care-heading"
      className="scroll-mt-16 bg-paper px-[var(--gutter)] pt-[clamp(96px,12vw,200px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        {/* `data-index-avoid`: the fixed side index fades while these pass under it. */}
        <div data-index-avoid>
          <Reveal className="rule flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Care</span>
            <span className="label text-stone-deep">
              {count} {count === 1 ? "question" : "questions"}
            </span>
          </Reveal>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 lg:mt-10 lg:grid-cols-12 lg:gap-y-0">
          {/* The sticky box stays a plain div so the Reveal transforms inside
              never interfere with `position: sticky`. */}
          <div data-index-avoid className="lg:col-span-4 lg:self-start lg:sticky lg:top-28">
            <TextReveal
              as="h2"
              id="care-heading"
              text="Care & questions"
              className="font-display text-[clamp(32px,4vw,56px)] text-ink"
            />
            <Reveal delay={0.1} className="mt-5">
              <p className="max-w-[34ch] text-[15px] leading-[1.7] text-ink-soft">
                Cleaning, airing and loft. Pillows are sold only on Amazon.in,
                where the listing has the rest.
              </p>
            </Reveal>
          </div>

          <ul
            role="list"
            className="m-0 list-none border-b border-hairline p-0 lg:col-span-7 lg:col-start-6"
          >
            {items.map((item, index) => (
              <CareItem
                key={index}
                item={item}
                index={index}
                open={openIndex === index}
                onToggle={() =>
                  setOpenIndex((current) => (current === index ? null : index))
                }
                reduceMotion={reduceMotion}
                delay={Math.min(index, ROW_STAGGER_CAP) * ROW_STAGGER}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
