"use client";

import Image from "next/image";
import type { ImageAsset, Product, Variant } from "@/lib/types";
import { ImageReveal, Reveal, TextReveal, cn } from "@/lib/motion";
import { useMediaQuery } from "@/lib/media";
import { useReducedMotionSafe } from "@/lib/reduced-motion";
import { PROMO_TEXT, formatInr, promoApplies, usePromo } from "@/lib/offer";
import ProductPlate from "@/components/ProductPlate";

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

/**
 * Cards are the full row on phones and half of it from `md`; content is
 * capped at 1440px so above that the slot is a fixed ~640px.
 */
const CARD_SIZES = "(min-width: 1440px) 640px, (min-width: 768px) 50vw, 100vw";

/**
 * Card stagger (MOTION.md): 0.07s between cards. Each card reveals on its own
 * `useInView`, so the delay only needs to order the cards that enter together:
 * it restarts every grid row (2 cards from `md`, 1 below).
 */
const CARD_STAGGER = 0.07;
const WIDE_QUERY = "(min-width: 768px)";
/** Pointer can hover: only then is the crossfade image worth downloading. */
const HOVER_QUERY = "(hover: hover)";
const CARDS_PER_ROW = { wide: 2, narrow: 1 } as const;

/**
 * Keeps the first grid column clear for the fixed side index at `lg`, like the
 * Collections text column: one column of a 12-col grid plus its 24px gap is
 * width/12 + 2px (matches `col-start-2` from `xl`; at `lg` the index needs a
 * little more room). `min(100%, 1440px)` is the content wrapper's own width,
 * so the padding stays in step with Collections above 1440px too.
 */
const INDEX_CLEAR =
  "lg:pl-[calc(min(100%,1440px)/12_+_24px)] xl:pl-[calc(min(100%,1440px)/12_+_2px)]";

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
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

type ProductCardProps = {
  product: Product;
  image: ImageAsset | undefined;
  hoverImage: ImageAsset | undefined;
  priceNote: string;
  promo: boolean;
  reduceMotion: boolean;
  /** seconds; stagger offset shared by the card and its image wipe */
  delay: number;
};

function ProductCard({
  product,
  image,
  hoverImage,
  priceNote,
  promo,
  reduceMotion,
  delay,
}: ProductCardProps) {
  const nameId = `product-${product.slug}-name`;

  return (
    <li className="group min-w-0">
      {/* No blur on the card Reveal: its picture is clip-wiping and scaling at
          the same time, and a `filter` on the parent would re-rasterise it
          every frame while muddying the wipe edge. */}
      <Reveal delay={delay} blur={false} className="h-full">
        <article aria-labelledby={nameId} className="flex h-full flex-col">
          {/* The drawn plate holds still (no parallax), so its caption stays in frame. */}
          <ImageReveal
            skew={false}
            parallax={image ? 0.04 : 0}
            delay={delay}
            className="aspect-[3/2] w-full bg-paper-deep"
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
                    style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
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

            <p className="label mt-4 text-stone-deep">{priceNote}</p>
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

  return (
    <section
      id="range"
      aria-labelledby="range-heading"
      className="scroll-mt-16 bg-paper px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,10vw,140px)] text-ink md:scroll-mt-20"
    >
      <div className={cn("mx-auto w-full max-w-[1440px]", INDEX_CLEAR)}>
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
          className="mt-10 grid grid-cols-1 gap-y-14 md:grid-cols-2 md:gap-x-6 lg:mt-16 lg:gap-x-10"
        >
          {products.map((product, i) => {
            const image = product.imageKey
              ? (images[product.imageKey] as ImageAsset | undefined)
              : undefined;
            const hoverImage = product.imageHoverKey
              ? (images[product.imageHoverKey] as ImageAsset | undefined)
              : undefined;

            return (
              <ProductCard
                key={product.slug}
                product={product}
                image={image}
                hoverImage={canHover ? hoverImage : undefined}
                priceNote={priceNote}
                promo={promo}
                reduceMotion={reduceMotion}
                delay={(i % perRow) * CARD_STAGGER}
              />
            );
          })}
        </ul>
      </div>
    </section>
  );
}
