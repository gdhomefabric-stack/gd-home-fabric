"use client";

import { useCallback, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type Transition } from "motion/react";
import type Lenis from "lenis";
import type { ImageAsset, Product, SiteContent } from "@/lib/types";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { replaceHash, scrollToTarget } from "@/lib/scroll";
import {
  Counter,
  EASE_SOFT,
  ImageReveal,
  Reveal,
  SPRING_SNAPPY,
  TextReveal,
  cn,
} from "@/lib/motion";

declare global {
  interface Window {
    /**
     * Owned and assigned by `components/SmoothScroll.tsx`. Repeated here with
     * the identical type so `lib/scroll` (which reads it) typechecks when this
     * component is compiled on its own; interface merging accepts the duplicate
     * because the types match. Same pattern as `SideIndex.tsx`.
     */
    __lenis?: Lenis;
  }
}

type FinderContent = SiteContent["finder"];
type PositionId = FinderContent["positions"][number]["id"];
type FirmnessId = FinderContent["firmness"][number]["id"];

type FinderProps = {
  finder: FinderContent;
  products: Product[];
  images: Record<string, ImageAsset>;
};

const DEFAULT_POSITION: PositionId = "side";
const DEFAULT_FIRMNESS: FirmnessId = "medium";

/**
 * The recommendation card sits in cols 8–12 of a 12-col grid at `lg`
 * (≈42vw, capped at ~580px once the 1440px content width kicks in) and is
 * full-bleed-within-gutters below that.
 */
const CARD_SIZES =
  "(min-width: 1440px) 580px, (min-width: 1024px) 42vw, 100vw";

/**
 * Recommendation photo box: 4:5 when stacked; beside the chips (≥lg) a
 * shallower 4:3 capped at 40vh, so "Our pick / name / price" land above the
 * fold of a 1440×900 window the moment a chip is pressed (price ≈ 845px).
 */
const CARD_PHOTO_BOX = "aspect-[4/5] lg:aspect-[4/3] lg:max-h-[40vh]";

/** Card stagger (MOTION.md): each reveal in the left column lands this much after the last. */
const STEP = 0.07;

/**
 * Keeps the first grid column clear for the fixed side index at `lg`, like the
 * Collections text column (see ProductGrid for the arithmetic).
 */
const INDEX_CLEAR =
  "lg:pl-[calc(min(100%,1440px)/12_+_24px)] xl:pl-[calc(min(100%,1440px)/12_+_2px)]";

/**
 * The pressed chip's label turns paper only once the sliding pill has
 * (mostly) arrived under it; before that the uncovered part of the label
 * would read paper-on-paper. SPRING_SNAPPY settles in ≈0.4s.
 */
const LABEL_DELAY_MS = 180;

/** One sliding pill per chip group (MOTION.md). */
type PillId = "finder-pill-position" | "finder-pill-firmness";

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function fromPrice(product: Product): number | null {
  if (product.variants.length === 0) return null;
  return product.variants.reduce(
    (min, v) => (v.priceInr < min ? v.priceInr : min),
    product.variants[0].priceInr,
  );
}

/** Prefer `preferred` if the content offers it, else the first option. */
function pickDefault<T extends string>(
  options: ReadonlyArray<{ id: T }>,
  preferred: T,
): T {
  if (options.some((o) => o.id === preferred)) return preferred;
  const first = options[0] as { id: T } | undefined;
  return first?.id ?? preferred;
}

/* -------------------------------------------------------------------------- */
/* Chip                                                                        */
/* -------------------------------------------------------------------------- */

type ChipProps = {
  label: string;
  pressed: boolean;
  onClick: () => void;
  /** shared `layoutId` of the group's sliding pill */
  pillId: PillId;
  pillTransition: Transition;
  reduceMotion: boolean;
};

function Chip({
  label,
  pressed,
  onClick,
  pillId,
  pillTransition,
  reduceMotion,
}: ChipProps) {
  return (
    // `data-cursor="dot"`: the custom cursor keeps only its dot here, so the
    // ring never paints through the small label on the ink pill.
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      data-cursor="dot"
      className={cn(
        "label relative inline-flex h-11 cursor-pointer select-none items-center rounded-[2px] border px-4",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
        !reduceMotion && "transition-colors duration-300 ease-in-out-soft",
        pressed
          ? "border-ink"
          : "border-hairline bg-transparent hover:border-ink/40 hover:bg-sand/40",
      )}
    >
      {/* The ink fill is one element per group: only the pressed chip renders
          it, and the shared `layoutId` makes it glide from the previously
          pressed chip to this one. It is painted before the label, which is
          positioned so it stacks on top. */}
      {pressed ? (
        <motion.span
          layoutId={pillId}
          aria-hidden="true"
          className="absolute inset-0 rounded-[2px] bg-ink"
          transition={pillTransition}
        />
      ) : null}
      <span
        className={cn(
          "relative",
          !reduceMotion && "transition-colors duration-200 ease-in-out-soft",
          pressed ? "text-paper" : "text-ink",
        )}
        style={
          !reduceMotion && pressed ? { transitionDelay: `${LABEL_DELAY_MS}ms` } : undefined
        }
      >
        {label}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Question row                                                                */
/* -------------------------------------------------------------------------- */

type QuestionOption<T extends string> = { id: T; label: string; hint: string };

type QuestionProps<T extends string> = {
  /** "1" | "2" — rendered as "(1)." in the label style */
  index: string;
  title: string;
  options: ReadonlyArray<QuestionOption<T>>;
  value: T;
  onChange: (id: T) => void;
  pillId: PillId;
  /** seconds after the row enters view before it reveals */
  delay: number;
  reduceMotion: boolean;
};

function Question<T extends string>({
  index,
  title,
  options,
  value,
  onChange,
  pillId,
  delay,
  reduceMotion,
}: QuestionProps<T>) {
  const headingId = useId();
  const selected = options.find((o) => o.id === value);

  // A toggle, not a scroll-linked glide: the pointer-response spring
  // (MOTION.md: stiffness 150–250) settles in ≈0.4s.
  const pillTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", ...SPRING_SNAPPY };

  return (
    <Reveal delay={delay} className="rule pt-6">
      <h3 id={headingId} className="label text-stone-deep">
        <span className="text-ink">({index}).</span> {title}
      </h3>

      <div
        role="group"
        aria-labelledby={headingId}
        className="mt-5 flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            pressed={option.id === value}
            onClick={() => onChange(option.id)}
            pillId={pillId}
            pillTransition={pillTransition}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      {/* Hint for the selected option; reserved height (two lines on phones) so the row never jumps. */}
      <div className="mt-4 min-h-[46px] sm:min-h-[24px]">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.p
              key={selected.id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE_SOFT }}
              className="text-[14px] leading-relaxed text-ink-soft"
            >
              {selected.hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/* Recommendation card                                                         */
/* -------------------------------------------------------------------------- */

type RecommendationProps = {
  product: Product;
  image: ImageAsset | undefined;
  /** e.g. "Side · Medium" */
  context: string;
  reduceMotion: boolean;
  /**
   * True once the visitor has pressed a chip: the card is then an answer they
   * are looking at, so its price counts from mount instead of waiting to
   * enter the in-view band (it can sit just under the band at 1440×900 and
   * would otherwise read "₹0").
   */
  chosen: boolean;
  onViewRange: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function Recommendation({
  product,
  image,
  context,
  reduceMotion,
  chosen,
  onViewRange,
}: RecommendationProps) {
  const price = fromPrice(product);
  const priceText = price !== null ? formatInr(price) : null;
  const benefits = product.benefits.slice(0, 3);

  const fade = (duration: number): Transition => ({
    duration: reduceMotion ? 0 : duration,
    ease: EASE_SOFT,
  });

  return (
    <motion.article
      aria-label={`Recommended: ${product.name}`}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1, transition: fade(0.7) }}
      exit={{ opacity: 0, pointerEvents: "none", transition: fade(0.45) }}
      className="group flex flex-col [grid-area:1/1]"
    >
      {image ? (
        // Clip wipe + settle on each new recommendation; the box clips its own
        // parallax inner, so nothing escapes the card at 375px. At `lg` the
        // photo is capped so the name and price stay above the fold at the
        // moment a chip is chosen (the chips sit beside it, not above).
        <ImageReveal
          skew={false}
          parallax={0.06}
          className={cn("w-full bg-paper-deep", CARD_PHOTO_BOX)}
        >
          <div
            className={cn(
              "absolute inset-0 will-change-transform",
              !reduceMotion &&
                "transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]",
            )}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={CARD_SIZES}
              className="object-cover"
              style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
            />
          </div>
        </ImageReveal>
      ) : (
        <div className={cn("img-matte relative w-full overflow-hidden bg-paper-deep", CARD_PHOTO_BOX)}>
          <div aria-hidden="true" className="absolute inset-0 bg-stone/40" />
        </div>
      )}

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <span className="label text-stone-deep">Our pick</span>
        <span className="label text-stone-deep">{context}</span>
      </div>

      <h3 className="font-display mt-3 text-[clamp(22px,2vw,28px)] text-ink">
        {product.name}
      </h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
        {product.tagline}
      </p>

      {benefits.length > 0 ? (
        <ul role="list" className="rule mt-5 space-y-2 pt-4">
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-soft"
            >
              <span
                aria-hidden="true"
                className="mt-[11px] h-px w-4 shrink-0 bg-ink/40"
              />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rule mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pt-4">
        {priceText !== null ? (
          <p className="text-[14px] text-ink">
            from{" "}
            {/* AT reads the final price; the counting copy is decorative. */}
            <span className="sr-only">{priceText}</span>
            <span aria-hidden="true" className="tabular-nums">
              <Counter value={priceText} trigger={chosen ? "immediate" : "view"} />
            </span>
          </p>
        ) : (
          <p className="text-[14px] text-ink-soft">Price on request</p>
        )}
        {/* `tap` + `py-1`: 11px label → 51px effective target. */}
        <a
          href="#range"
          onClick={onViewRange}
          className="link-line label tap inline-block py-1 text-ink"
        >
          View in range
        </a>
      </div>
    </motion.article>
  );
}

/* -------------------------------------------------------------------------- */
/* Finder                                                                      */
/* -------------------------------------------------------------------------- */

export default function Finder({ finder, products, images }: FinderProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference, so `initial` matches the server-rendered styles.
  const reduceMotion = useReducedMotionSafe();

  const [position, setPosition] = useState<PositionId>(() =>
    pickDefault(finder.positions, DEFAULT_POSITION),
  );
  const [firmness, setFirmness] = useState<FirmnessId>(() =>
    pickDefault(finder.firmness, DEFAULT_FIRMNESS),
  );
  // Set on the first chip press; see `RecommendationProps.chosen`.
  const [chosen, setChosen] = useState(false);

  /**
   * A chip press must never change something the reader cannot see. Bring
   * the card up when its bottom is below the fold — never when it is already
   * fully visible. Stacked (<lg) the card sits under the chips; at `lg` it is
   * beside them, which covers 1440×900 at the section's natural position, but
   * a chip pressed while the section is still entering from the bottom would
   * leave the name and price under the fold. Both columns are sticky, so the
   * glide keeps the chips on screen too.
   */
  const cardRef = useRef<HTMLDivElement>(null);
  const revealCard = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (rect.bottom <= window.innerHeight) return;
    scrollToTarget(card, reduceMotion, 1);
  }, [reduceMotion]);

  const choosePosition = useCallback(
    (id: PositionId) => {
      setPosition(id);
      setChosen(true);
      revealCard();
    },
    [revealCard],
  );
  const chooseFirmness = useCallback(
    (id: FirmnessId) => {
      setFirmness(id);
      setChosen(true);
      revealCard();
    },
    [revealCard],
  );

  const comboKey = `${position}-${firmness}`;

  const product = useMemo<Product | undefined>(() => {
    const slug = finder.recommend[comboKey] as string | undefined;
    const match = slug ? products.find((p) => p.slug === slug) : undefined;
    return match ?? (products[0] as Product | undefined);
  }, [finder.recommend, comboKey, products]);

  const positionLabel =
    finder.positions.find((p) => p.id === position)?.label ?? position;
  const firmnessLabel =
    finder.firmness.find((f) => f.id === firmness)?.label ?? firmness;
  const context = `${positionLabel} · ${firmnessLabel}`;

  const image = product
    ? (images[product.imageKey] as ImageAsset | undefined)
    : undefined;

  /**
   * Plain `#range` anchor that upgrades to the shared smooth scroll
   * (`lib/scroll`: Lenis when mounted, native otherwise) when JS is on.
   */
  const handleViewRange = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      const target = document.getElementById("range");
      if (!target) return; // let the browser handle the hash
      event.preventDefault();
      scrollToTarget(target, reduceMotion);
      replaceHash("#range");
    },
    [reduceMotion],
  );

  return (
    <section
      id="finder"
      aria-labelledby="finder-heading"
      className="scroll-mt-16 bg-paper px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className={cn("mx-auto w-full max-w-[1440px]", INDEX_CLEAR)}>
        {/* `data-index-avoid`: the fixed side index fades while these pass under it. */}
        <div data-index-avoid>
          <Reveal className="rule flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Finder</span>
            <span className="label text-stone-deep">Two questions</span>
          </Reveal>
        </div>

        <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Questions */}
          <div data-index-avoid className="lg:sticky lg:top-28 lg:col-span-6 lg:self-start">
            <TextReveal
              as="h2"
              id="finder-heading"
              text={finder.title}
              className="font-display text-[clamp(32px,4vw,56px)] text-ink"
            />

            <Reveal delay={STEP} className="mt-5 max-w-[46ch]">
              <p className="text-ink-soft">{finder.intro}</p>
            </Reveal>

            <div className="mt-10 space-y-8 lg:mt-14">
              <Question
                index="1"
                title="Sleep position"
                options={finder.positions}
                value={position}
                onChange={choosePosition}
                pillId="finder-pill-position"
                delay={STEP * 2}
                reduceMotion={reduceMotion}
              />
              <Question
                index="2"
                title="Firmness"
                options={finder.firmness}
                value={firmness}
                onChange={chooseFirmness}
                pillId="finder-pill-firmness"
                delay={STEP * 3}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>

          {/* Recommendation. `scroll-mt` keeps it clear of the fixed bar when
              brought into view; at `lg` it is sticky like the chips so the
              question and its answer stay paired. No blur on the Reveal: the
              card's photo is clip-wiping at the same time. */}
          <div
            ref={cardRef}
            className="mt-12 scroll-mt-20 lg:sticky lg:top-28 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:self-start"
          >
            <Reveal delay={0.12} blur={false}>
              <p className="sr-only" aria-live="polite">
                {product
                  ? `Recommended for ${context}: ${product.name}`
                  : "No recommendation available"}
              </p>

              {/* Both the leaving and arriving card share one grid cell so they
                  truly crossfade. No `initial={false}` here: AnimatePresence
                  would pass that down to every nested motion element on the
                  first render and the first card's ImageReveal would never
                  wipe. The article's own first fade happens under this
                  column's Reveal, so nothing double-fades. */}
              <div className="grid">
                <AnimatePresence>
                  {product ? (
                    <Recommendation
                      key={product.slug}
                      product={product}
                      image={image}
                      context={context}
                      reduceMotion={reduceMotion}
                      chosen={chosen}
                      onViewRange={handleViewRange}
                    />
                  ) : (
                    <p
                      key="empty"
                      className="rule pt-5 text-[14px] leading-relaxed text-ink-soft [grid-area:1/1]"
                    >
                      Our range is being photographed. Write to us and we will
                      recommend a pillow by hand.
                    </p>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
