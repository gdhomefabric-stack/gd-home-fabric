"use client";

import Image from "next/image";
import type { ImageAsset, Product, Variant } from "@/lib/types";
import { ImageReveal, Reveal, TextReveal, cn } from "@/lib/motion";
import { useMediaQuery } from "@/lib/media";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { PROMO_TEXT, formatInr, promoApplies, usePromo } from "@/lib/offer";
import ProductPlate from "@/components/ProductPlate";

/**
 * The range (AESTHETIC.md phase 3): two tall photo cards from `lg`, each a
 * 4:5 photograph that wipes in and drifts a little on scroll. The drawn
 * `ProductPlate` (every size to scale) no longer stands in for the photo:
 * it sits on top of it as a small paper chip in the bottom-left corner, so
 * the sizes stay in view while the photograph carries the card. A product
 * without a photo keeps the plate as its main visual, as before.
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
/** The chip settles once the photo's wipe is well under way. */
const CHIP_DELAY = 0.5;
const WIDE_QUERY = "(min-width: 1024px)";
/** Pointer can hover: only then is the crossfade image worth downloading. */
const HOVER_QUERY = "(hover: hover)";
const CARDS_PER_ROW = { wide: 2, narrow: 1 } as const;

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
    <li className="rule py-4">
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
 * short caption row stands in for them. The chip lives beside the
 * `ImageReveal`, not inside it, so it holds still while the photo scales,
 * drifts and crossfades underneath.
 */
function SizeChip({ product, delay }: { product: Product; delay: number }) {
  // The cover's plate is a single dashed outline: its badge is the caption.
  // The pillow's plate nests every size at one corner, drawn to scale.
  const caption = product.badge ?? "To scale";
  return (
    <Reveal
      delay={delay}
      y={12}
      className="absolute bottom-3 left-3 w-[140px] border border-hairline bg-paper md:bottom-4 md:left-4"
    >
      <div className="relative aspect-[3/2]">
        <ProductPlate product={product} className="bg-paper! [&_p]:hidden" />
      </div>
      <p aria-hidden="true" className="label border-t border-hairline px-2.5 py-2 text-stone-deep">
        {caption}
      </p>
    </Reveal>
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
  /** seconds; stagger offset shared by the card and its image wipe */
  delay: number;
};

function ProductCard({ product, image, hoverImage, promo, reduceMotion, delay }: ProductCardProps) {
  const nameId = `product-${product.slug}-name`;

  return (
    <li className="group min-w-0">
      {/* No blur on the card Reveal: its picture is clip-wiping and scaling at
          the same time, and a `filter` on the parent would re-rasterise it
          every frame while muddying the wipe edge. */}
      <Reveal delay={delay} blur={false} className="h-full">
        <article aria-labelledby={nameId} className="flex h-full flex-col">
          {/* `relative` so the size chip can sit on the photo without riding
              the ImageReveal's scale and parallax layers. */}
          <div className="relative">
            {/* The drawn plate, when it is the main visual, holds still (no
                parallax) so its caption stays in frame. */}
            <ImageReveal
              skew={false}
              parallax={image ? 0.04 : 0}
              delay={delay}
              cursor={image ? "view" : undefined}
              className="aspect-[4/5] w-full bg-paper-deep"
            >
              <div
                className={cn(
                  "absolute inset-0 will-change-transform",
                  !reduceMotion &&
                    "transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.04]",
                )}
              >
                {image ? (
                  <>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={CARD_SIZES}
                      className="object-cover"
                      style={
                        image.objectPosition ? { objectPosition: image.objectPosition } : undefined
                      }
                    />
                    {hoverImage ? (
                      // Purely decorative crossfade duplicate: empty alt, hidden from AT.
                      <Image
                        src={hoverImage.src}
                        alt=""
                        aria-hidden="true"
                        fill
                        sizes={CARD_SIZES}
                        className="object-cover opacity-0 transition-opacity duration-[900ms] ease-in-out-soft group-hover:opacity-100"
                        style={
                          hoverImage.objectPosition
                            ? { objectPosition: hoverImage.objectPosition }
                            : undefined
                        }
                      />
                    ) : null}
                  </>
                ) : (
                  <ProductPlate product={product} />
                )}
              </div>
            </ImageReveal>

            {image ? <SizeChip product={product} delay={delay + CHIP_DELAY} /> : null}
          </div>

          <div data-index-avoid className="mt-5 flex flex-1 flex-col">
            {product.badge ? (
              <p className="label mb-3 self-start bg-ink px-2 py-[5px] text-paper">
                {product.badge}
              </p>
            ) : null}
            <h3 id={nameId} className="font-display text-[clamp(22px,2vw,28px)] text-ink">
              {product.name}
            </h3>
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
              <ul
                role="list"
                aria-label={`${product.name}: sizes, packs and prices`}
                className="mt-5 border-b border-hairline"
              >
                {product.variants.map((v) => (
                  <VariantRow key={v.asin} product={product} variant={v} promo={promo} />
                ))}
              </ul>
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
  // Touch devices can never hover, so the crossfade duplicate is not rendered
  // (and not downloaded) there. `false` during hydration, like the server.
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
      className="scroll-mt-16 bg-paper px-[var(--gutter)] pt-[clamp(96px,12vw,200px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        {/* `data-index-avoid`: the fixed side index fades while these pass under it. */}
        <div data-index-avoid>
          <Reveal className="rule flex items-baseline justify-between gap-4 pt-5">
            <span className="label text-stone-deep">Range</span>
            <span className="label text-stone-deep">
              {count} {count === 1 ? "product" : "products"}
            </span>
          </Reveal>
        </div>

        <h2
          id="range-heading"
          data-index-avoid
          className="font-display mt-6 text-[clamp(32px,4vw,56px)] text-ink"
        >
          <TextReveal text="The range" />
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
              hoverImage={canHover ? hoverImage : undefined}
              promo={promo}
              reduceMotion={reduceMotion}
              delay={(i % perRow) * CARD_STAGGER}
            />
          ))}
        </ul>

        {/* One line under the grid (AESTHETIC.md): what the photographs are,
            and the FACTS.md price note that every price block carries. */}
        <div data-index-avoid>
          <Reveal className="rule mt-12 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-5 lg:mt-16">
            {anyPhoto ? <p className="label text-stone-deep">{PHOTO_NOTE}</p> : null}
            <p className="label text-stone-deep">{priceNote}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
