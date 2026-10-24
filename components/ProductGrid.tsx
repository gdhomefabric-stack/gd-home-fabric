"use client";

import Image from "next/image";
import type { ImageAsset, Product } from "@/lib/types";
import { ImageReveal, Reveal, TextReveal, cn } from "@/lib/motion";
import { useMediaQuery } from "@/lib/media";
import { useReducedMotionSafe } from "@/lib/reduced-motion";

type ProductGridProps = {
  products: Product[];
  images: Record<string, ImageAsset>;
};

/** Human labels for the `bestFor` pills. */
const BEST_FOR_LABEL: Record<Product["bestFor"][number], string> = {
  back: "Back",
  side: "Side",
  stomach: "Stomach",
  combination: "Combination",
  support: "Support",
  decor: "Décor",
};

/**
 * Cards are 1/2 of the row on phones and 1/4 at `lg`; content is capped at
 * 1440px so above that the slot is a fixed ~340px.
 */
const CARD_SIZES =
  "(min-width: 1440px) 340px, (min-width: 1024px) 25vw, 50vw";

/**
 * Card stagger (MOTION.md): 0.07s between cards. Each card reveals on its own
 * `useInView`, so the delay only needs to order the cards that enter together:
 * it restarts every grid row — 4 cards from `lg`, 2 below — rather than
 * growing with the index, which would hold the last rows for over half a
 * second after they appear (or, with a fixed 4, land the right-hand card of a
 * phone row after its neighbour).
 */
const CARD_STAGGER = 0.07;
const WIDE_QUERY = "(min-width: 1024px)";
/** Pointer can hover: only then is the crossfade image worth downloading. */
const HOVER_QUERY = "(hover: hover)";
const CARDS_PER_ROW = { wide: 4, narrow: 2 } as const;

/**
 * Keeps the first grid column clear for the fixed side index at `lg`, like the
 * Collections text column: one column of a 12-col grid plus its 24px gap is
 * width/12 + 2px (matches `col-start-2` from `xl`; at `lg` the index needs a
 * little more room). `min(100%, 1440px)` is the content wrapper's own width,
 * so the padding stays in step with Collections above 1440px too.
 */
const INDEX_CLEAR =
  "lg:pl-[calc(min(100%,1440px)/12_+_24px)] xl:pl-[calc(min(100%,1440px)/12_+_2px)]";

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

function sizeCountLabel(product: Product): string {
  const sizes = new Set(product.variants.map((v) => v.size));
  const n = sizes.size;
  return `${n} ${n === 1 ? "size" : "sizes"}`;
}

type ProductCardProps = {
  product: Product;
  image: ImageAsset | undefined;
  hoverImage: ImageAsset | undefined;
  reduceMotion: boolean;
  /** seconds; stagger offset shared by the card and its image wipe */
  delay: number;
};

function ProductCard({ product, image, hoverImage, reduceMotion, delay }: ProductCardProps) {
  const price = fromPrice(product);
  // Hover rolls the price up through a mask: the resting copy leaves at the
  // top while an identical, decorative copy enters from below (y 100% → 0).
  // At rest (and on touch / reduced motion) the price is simply visible.
  const rollPrice = price !== null && !reduceMotion;

  return (
    <li className="group min-w-0">
      {/* No blur on the card Reveal: its photo is clip-wiping and scaling at
          the same time, and a `filter` on the parent would re-rasterise the
          4:5 image every frame while muddying the wipe edge. */}
      <Reveal delay={delay} blur={false} className="h-full">
        <article className="flex h-full flex-col">
          {image ? (
            <ImageReveal
              skew={false}
              parallax={0.04}
              cursor="view"
              delay={delay}
              className="aspect-[4/5] w-full bg-paper-deep"
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
              </div>
            </ImageReveal>
          ) : (
            <div className="img-matte relative aspect-[4/5] w-full overflow-hidden bg-paper-deep">
              <div aria-hidden="true" className="absolute inset-0 bg-stone/40" />
            </div>
          )}

          <div data-index-avoid className="mt-4 flex flex-1 flex-col">
            <h3 className="font-display text-[clamp(22px,2vw,28px)] text-ink">
              {/* `link-line` only draws on its own :hover and is unlayered, so the
                  card-level hover has to win with `!` (Tailwind utilities are
                  layered and would otherwise lose regardless of specificity). */}
              <span className="link-line group-hover:after:origin-left! group-hover:after:[transform:scaleX(1)]!">
                {product.name}
              </span>
            </h3>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-soft">
              {product.tagline}
            </p>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              {price !== null ? (
                // `clip-path` masks the roll without turning the <p> into a
                // scroll container, so the row's baseline alignment is untouched.
                <p className="relative text-[14px] text-ink [clip-path:inset(0)]">
                  <span
                    className={cn(
                      "block",
                      rollPrice &&
                        "transition-transform duration-[900ms] ease-out-expo group-hover:-translate-y-full",
                    )}
                  >
                    from <span className="tabular-nums">{formatInr(price)}</span>
                  </span>
                  {rollPrice ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 block translate-y-full transition-transform duration-[900ms] ease-out-expo group-hover:translate-y-0"
                    >
                      from <span className="tabular-nums">{formatInr(price)}</span>
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[14px] text-ink-soft">Price on request</p>
              )}
              <p className="label text-stone-deep">{sizeCountLabel(product)}</p>
            </div>

            {product.bestFor.length > 0 ? (
              <ul
                role="list"
                aria-label="Best for"
                className="mt-3 flex flex-wrap gap-1.5"
              >
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
          </div>
        </article>
      </Reveal>
    </li>
  );
}

export default function ProductGrid({ products, images }: ProductGridProps) {
  // Hydration-safe: `false` on the server and during hydration, then the real
  // preference. Only the CSS hover effects branch on it here; the reveal
  // primitives from `@/lib/motion` handle reduced motion themselves.
  const reduceMotion = useReducedMotionSafe();
  // `false` during hydration (like the server): the first client render uses
  // the 2-per-row order; the delays only matter once a card scrolls into view.
  const wide = useMediaQuery(WIDE_QUERY);
  const perRow = wide ? CARDS_PER_ROW.wide : CARDS_PER_ROW.narrow;
  // Touch devices can never hover, so the crossfade duplicate is not rendered
  // (and not downloaded) there. `false` during hydration, like the server.
  const canHover = useMediaQuery(HOVER_QUERY);

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
              {count} {count === 1 ? "pillow" : "pillows"}
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
          className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:mt-16 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14"
        >
          {products.map((product, i) => {
            const image = images[product.imageKey] as ImageAsset | undefined;
            const hoverImage = product.imageHoverKey
              ? (images[product.imageHoverKey] as ImageAsset | undefined)
              : undefined;

            return (
              <ProductCard
                key={product.slug}
                product={product}
                image={image}
                hoverImage={canHover ? hoverImage : undefined}
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
