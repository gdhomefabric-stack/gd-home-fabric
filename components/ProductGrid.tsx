"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ImageAsset, Product, Variant } from "@/lib/types";
import {
  Counter,
  EASE_IN_OUT,
  EASE_OUT_EXPO,
  ImageReveal,
  Reveal,
  Rule,
  TextReveal,
  cn,
  useCursorParallax,
} from "@/lib/motion";
import { useLightbox } from "@/lib/lightbox";
import { useMediaQuery } from "@/lib/media";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { PROMO_TEXT, formatInr, promoApplies, usePromo } from "@/lib/offer";
import ProductPlate from "@/components/ProductPlate";

/**
 * The range (AESTHETIC.md phase 3, INTERACTIVE.md phase 4): two tall photo
 * cards from `lg`, each a 4:5 photograph that wipes in and drifts a little on
 * scroll. The photograph is a lightbox trigger that follows the pointer
 * (inner image ±12px, card tilt ±2°); hovering wipes the second photo in from
 * the left and slides the size chip (the drawn `ProductPlate`, every size to
 * scale) into the bottom-left corner. On touch devices the chip simply stays
 * in view. The "from ₹…" price counts up once on view; the server-rendered
 * text is the final figure. A product without a photo keeps the plate as its
 * main visual, as before.
 */

type ProductGridProps = {
  products: Product[];
  images: Record<string, ImageAsset>;
  /** FACTS.md: shown next to every price block */
  priceNote: string;
};

/** Human labels for the `bestFor` pills (FACTS.md: suits back and side sleepers). */
const BEST_FOR_LABEL: Record<Product["bestFor"][number], string> = {
  back: "Back sleepers",
  side: "Side sleepers",
};

/** AESTHETIC.md: the photographs are stock stand-ins; the real pillow is plain white. */
const PHOTO_NOTE = "Representative photographs. The pillow is plain white.";

/**
 * Cards are the full row below `lg` and half of it from there; content is
 * capped at 1440px so above that the slot is a fixed ~600px.
 */
const CARD_SIZES = "(min-width: 1440px) 600px, (min-width: 1024px) 42vw, 100vw";

/**
 * Card stagger (MOTION.md): 0.07s between cards. Each card reveals on its own
 * `useInView`, so the delay only needs to order the cards that enter together:
 * it restarts every grid row (2 cards from `lg`, 1 below).
 */
const CARD_STAGGER = 0.07;
/** Touch devices: the chip settles once the photo's wipe is well under way. */
const CHIP_DELAY = 0.5;
const WIDE_QUERY = "(min-width: 1024px)";
/** Pointer can hover: only then is the second photo worth downloading. */
const HOVER_QUERY = "(hover: hover)";
const CARDS_PER_ROW = { wide: 2, narrow: 1 } as const;

/** INTERACTIVE.md §2: the second photo wipes in from the left on hover. */
const WIPE_CLOSED = { clipPath: "inset(0 100% 0 0)" } as const;
const WIPE_OPEN = { clipPath: "inset(0 0% 0 0)" } as const;
const WIPE_TRANSITION = { duration: 0.9, ease: EASE_IN_OUT } as const;

/** The size chip slides in from the bottom-left corner. */
const CHIP_HIDDEN = { x: -12, y: 12, opacity: 0 } as const;
const CHIP_SHOWN = { x: 0, y: 0, opacity: 1 } as const;

/** Cursor-follow parallax on the photo: inner image ±12px, card tilt ±2°. */
const PARALLAX = { max: 12, tilt: 2 } as const;

const INSTANT = { duration: 0 } as const;

/* -------------------------------------------------------------------------- */
/* One size / pack / price row                                                 */
/* -------------------------------------------------------------------------- */

type VariantRowProps = {
  product: Product;
  variant: Variant;
  promo: boolean;
};

function VariantRow({ product, variant: v, promo }: VariantRowProps) {
  return (
    <li>
      <Rule />
      <div className="py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="min-w-0 text-[15px] text-ink">
            {v.sizeName ? (
              <span className="font-display mr-2 text-[20px] leading-none">{v.sizeName}</span>
            ) : null}
            <span className="tabular-nums">{v.size}</span>{" "}
            <span className="tabular-nums text-ink-soft">({v.sizeMetric})</span>
          </p>
          <p className="text-[15px] tabular-nums text-ink">{formatInr(v.priceInr)}</p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <p className="label text-stone-deep">{v.pack}</p>
          {/* Visible text first in the accessible name; the rest says which listing. */}
          <a
            href={v.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-line label tap inline-block py-1 text-ink"
          >
            Buy on Amazon.in
            <span className="sr-only">
              : {product.name}, {v.size}, {v.pack} (opens in a new tab)
            </span>
            <span aria-hidden="true" className="ml-1.5 inline-block">
              ↗
            </span>
          </a>
        </div>

        {promo && promoApplies(v.pack) ? (
          <p className="label mt-2 inline-block border border-ink px-2 py-[5px] text-ink">
            {PROMO_TEXT}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Size chip: the drawn plate, inset on the photograph                         */
/* -------------------------------------------------------------------------- */

/**
 * ≈140px paper card in the photo's bottom-left corner holding the plate's
 * outlines. The plate's own captions are sized for a full card and would
 * overflow a chip this small, so they are hidden here (they are decorative,
 * `aria-hidden`; the plate's `role="img"` label still names every size) and a
 * short caption row stands in for them. The chip lives beside the photo
 * button, not inside it, so it holds still while the photo scales, drifts,
 * tilts and wipes underneath; `pointer-events-none` lets a click on it reach
 * the button. Hover-capable devices see it slide in on hover (INTERACTIVE.md
 * §2); touch devices, which cannot hover, get it on view instead.
 */
function SizeChip({
  product,
  shown,
  delay,
  reduceMotion,
}: {
  product: Product;
  shown: boolean;
  /** seconds; only the on-view (touch) entrance waits */
  delay: number;
  reduceMotion: boolean;
}) {
  // The cover's plate is a single dashed outline: its badge is the caption.
  // The pillow's plate nests every size at one corner, drawn to scale.
  const caption = product.badge ?? "To scale";
  return (
    <motion.div
      className="pointer-events-none absolute bottom-3 left-3 w-[140px] border border-hairline bg-paper will-change-transform md:bottom-4 md:left-4"
      initial={CHIP_HIDDEN}
      animate={shown ? CHIP_SHOWN : CHIP_HIDDEN}
      transition={reduceMotion ? INSTANT : { duration: 0.7, delay, ease: EASE_OUT_EXPO }}
    >
      <div className="relative aspect-[3/2]">
        <ProductPlate product={product} className="bg-paper! [&_p]:hidden" />
      </div>
      <p aria-hidden="true" className="label border-t border-hairline px-2.5 py-2 text-stone-deep">
        {caption}
      </p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Photo: lightbox trigger with cursor-follow parallax and the hover wipe      */
/* -------------------------------------------------------------------------- */

type CardPhotoProps = {
  image: ImageAsset;
  /** rendered only on hover-capable devices */
  hoverImage: ImageAsset | undefined;
  /** every photo of this card, for the lightbox */
  gallery: ImageAsset[];
  hovered: boolean;
  reduceMotion: boolean;
  delay: number;
};

function CardPhoto({ image, hoverImage, gallery, hovered, reduceMotion, delay }: CardPhotoProps) {
  const lightbox = useLightbox();
  const ref = useRef<HTMLButtonElement>(null);
  const { x, y, rotateX, rotateY, onPointerMove, onPointerLeave } = useCursorParallax(
    ref,
    PARALLAX,
  );

  return (
    <motion.button
      ref={ref}
      type="button"
      data-cursor="open"
      aria-label={`Open photo: ${image.alt}`}
      onClick={() => lightbox.open(gallery, 0)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="block w-full text-left will-change-transform"
      style={{ rotateX, rotateY, transformPerspective: 900 }}
    >
      <ImageReveal
        skew={false}
        parallax={0.04}
        delay={delay}
        className="aspect-[4/5] w-full bg-paper-deep"
      >
        {/* Bleed by the parallax travel so the edges never show. */}
        <motion.div className="absolute -inset-3 will-change-transform" style={{ x, y }}>
          <div
            className={cn(
              "absolute inset-0",
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
            {hoverImage ? (
              // Decorative second photo: wipes in from the left on hover.
              <motion.div
                className="absolute inset-0"
                initial={WIPE_CLOSED}
                animate={hovered ? WIPE_OPEN : WIPE_CLOSED}
                transition={reduceMotion ? INSTANT : WIPE_TRANSITION}
              >
                <Image
                  src={hoverImage.src}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes={CARD_SIZES}
                  className="object-cover"
                  style={
                    hoverImage.objectPosition
                      ? { objectPosition: hoverImage.objectPosition }
                      : undefined
                  }
                />
              </motion.div>
            ) : null}
          </div>
        </motion.div>
      </ImageReveal>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

type ProductCardProps = {
  product: Product;
  image: ImageAsset | undefined;
  hoverImage: ImageAsset | undefined;
  promo: boolean;
  reduceMotion: boolean;
  /** the device can hover: wipe + chip-on-hover; otherwise the chip stays */
  canHover: boolean;
  /** seconds; stagger offset shared by the card and its image wipe */
  delay: number;
};

function ProductCard({
  product,
  image,
  hoverImage,
  promo,
  reduceMotion,
  canHover,
  delay,
}: ProductCardProps) {
  const nameId = `product-${product.slug}-name`;
  const [hovered, setHovered] = useState(false);

  const gallery = useMemo(
    () => [image, hoverImage].filter((a): a is ImageAsset => a !== undefined),
    [image, hoverImage],
  );

  // Lowest selling price across the sizes and packs (FACTS.md prices only).
  const fromPrice =
    product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.priceInr)) : undefined;
  const fromText = fromPrice !== undefined ? formatInr(fromPrice) : undefined;

  // Hover is a pointer thing: a finger resting on the card never "hovers".
  const onEnter = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== "touch") setHovered(true);
  };
  const onLeave = () => setHovered(false);

  // Touch devices (no hover) keep the chip in view; reduced motion never hides it.
  const chipShown = !canHover || reduceMotion || hovered;

  return (
    <li className="group min-w-0">
      {/* No blur on the card Reveal: its picture is clip-wiping and scaling at
          the same time, and a `filter` on the parent would re-rasterise it
          every frame while muddying the wipe edge. */}
      <Reveal delay={delay} blur={false} className="h-full">
        <article
          aria-labelledby={nameId}
          className="flex h-full flex-col"
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        >
          {/* `relative` so the size chip can sit on the photo without riding
              the photo's scale, tilt and parallax layers. */}
          <div className="relative">
            {image ? (
              <CardPhoto
                image={image}
                hoverImage={canHover ? hoverImage : undefined}
                gallery={gallery}
                hovered={hovered}
                reduceMotion={reduceMotion}
                delay={delay}
              />
            ) : (
              // The drawn plate, when it is the main visual, holds still (no
              // parallax) so its caption stays in frame.
              <ImageReveal
                skew={false}
                parallax={0}
                delay={delay}
                className="aspect-[4/5] w-full bg-paper-deep"
              >
                <div className="absolute inset-0">
                  <ProductPlate product={product} />
                </div>
              </ImageReveal>
            )}

            {image ? (
              <SizeChip
                product={product}
                shown={chipShown}
                delay={canHover ? 0 : delay + CHIP_DELAY}
                reduceMotion={reduceMotion}
              />
            ) : null}
          </div>

          <div data-index-avoid className="mt-6 flex flex-1 flex-col">
            {product.badge ? (
              <p className="label mb-3 self-start bg-ink px-2 py-[5px] text-paper">
                {product.badge}
              </p>
            ) : null}

            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3
                id={nameId}
                className="font-display text-[clamp(28px,2.6vw,40px)] font-light text-ink"
              >
                {product.name}
              </h3>
              {fromText ? (
                <p className="font-display text-[clamp(22px,2vw,30px)] font-light leading-none text-ink tabular-nums">
                  {product.variants.length > 1 ? (
                    <span className="label mr-2 text-stone-deep">From</span>
                  ) : null}
                  {/* AT reads the final figure; the counting copy is decorative. */}
                  <span className="sr-only">{fromText}</span>
                  <span aria-hidden="true">
                    <Counter value={fromText} />
                  </span>
                </p>
              ) : null}
            </div>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-soft">{product.tagline}</p>

            {product.bestFor.length > 0 ? (
              <ul role="list" aria-label="Suits" className="mt-3 flex flex-wrap gap-1.5">
                {product.bestFor.map((tag) => (
                  <li
                    key={tag}
                    className="label rounded-[2px] border border-hairline px-2 py-[7px] text-ink-soft"
                  >
                    {BEST_FOR_LABEL[tag]}
                  </li>
                ))}
              </ul>
            ) : null}

            {product.variants.length > 0 ? (
              <>
                <ul
                  role="list"
                  aria-label={`${product.name}: sizes, packs and prices`}
                  className="mt-5"
                >
                  {product.variants.map((v) => (
                    <VariantRow key={v.asin} product={product} variant={v} promo={promo} />
                  ))}
                </ul>
                <Rule />
              </>
            ) : (
              <p className="mt-5 text-[14px] text-ink-soft">See the price on Amazon.in</p>
            )}
          </div>
        </article>
      </Reveal>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Grid                                                                        */
/* -------------------------------------------------------------------------- */

export default function ProductGrid({ products, images, priceNote }: ProductGridProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. Only the CSS hover effects branch on it here; the reveal
  // primitives from `@/lib/motion` handle reduced motion themselves.
  const reduceMotion = useReducedMotionSafe();
  // `false` during hydration (like the server): the first client render uses
  // the 1-per-row order; the delays only matter once a card scrolls into view.
  const wide = useMediaQuery(WIDE_QUERY);
  const perRow = wide ? CARDS_PER_ROW.wide : CARDS_PER_ROW.narrow;
  // Touch devices can never hover, so the second photo is not rendered (and
  // not downloaded) there and the size chip stays in view. `false` during
  // hydration, like the server.
  const canHover = useMediaQuery(HOVER_QUERY);
  // The pack-of-2 coupon: client-side date check after mount, never in the
  // server HTML (lib/offer).
  const promo = usePromo();

  const count = products.length;

  const cards = products.map((product) => ({
    product,
    image: product.imageKey ? (images[product.imageKey] as ImageAsset | undefined) : undefined,
    hoverImage: product.imageHoverKey
      ? (images[product.imageHoverKey] as ImageAsset | undefined)
      : undefined,
  }));
  // The photo note only makes sense once a photograph is actually on the page.
  const anyPhoto = cards.some((c) => c.image !== undefined);

  return (
    <section
      id="range"
      aria-labelledby="range-heading"
      // No background: the ScrollTint behind <main>'s content glides paper →
      // #efe9df across this section (INTERACTIVE.md §3) and must show through.
      className="scroll-mt-16 px-[var(--gutter)] pt-[clamp(96px,12vw,200px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        {/* `data-index-avoid`: the fixed side index fades while these pass under it. */}
        <div data-index-avoid>
          <Rule />
          <Reveal className="flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Range</span>
            <span className="label text-stone-deep">
              {count} {count === 1 ? "product" : "products"}
            </span>
          </Reveal>
        </div>

        <h2
          id="range-heading"
          data-index-avoid
          className="font-display mt-6 text-[clamp(48px,6.5vw,104px)] font-light text-ink"
        >
          <TextReveal text="The *range*" markup />
        </h2>

        <ul
          role="list"
          className="mt-10 grid grid-cols-1 gap-y-14 lg:mt-16 lg:grid-cols-2 lg:gap-x-8"
        >
          {cards.map(({ product, image, hoverImage }, i) => (
            <ProductCard
              key={product.slug}
              product={product}
              image={image}
              hoverImage={hoverImage}
              promo={promo}
              reduceMotion={reduceMotion}
              canHover={canHover}
              delay={(i % perRow) * CARD_STAGGER}
            />
          ))}
        </ul>

        {/* One line under the grid (AESTHETIC.md): what the photographs are,
            and the FACTS.md price note that every price block carries. */}
        <div data-index-avoid className="mt-12 lg:mt-16">
          <Rule />
          <Reveal className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-5">
            {anyPhoto ? <p className="label text-stone-deep">{PHOTO_NOTE}</p> : null}
            <p className="label text-stone-deep">{priceNote}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
