/**
 * Shared content types. `lib/content.ts` (copy) and `lib/images.ts` (photos)
 * both conform to these so components can be built against a fixed shape.
 */

export type ImageAsset = {
  /** Public path, e.g. "/images/collection-01-a.jpg" */
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Photographer / source line for the credits page, e.g. "Photo by X on Unsplash" */
  credit: string;
  creditUrl?: string;
  /**
   * CSS `object-position` for the `object-cover` crop, when the subject is not
   * at the centre of the frame (e.g. "right center"). Default: centre.
   */
  objectPosition?: string;
};

export type Variant = {
  /** "Standard" | "Queen" | "King"; absent for the cover */
  sizeName?: string;
  /** e.g. "17 × 27 in" */
  size: string;
  /** e.g. "43 × 69 cm" */
  sizeMetric: string;
  /** "Pack of 1" | "Pack of 2" | "1 piece" */
  pack: string;
  /** Selling price on Amazon.in (FACTS.md, 26 Oct 2026), whole rupees */
  priceInr: number;
  /** Amazon.in ASIN */
  asin: string;
  /** exactly https://www.amazon.in/dp/<asin> */
  amazonUrl: string;
};

export type Product = {
  slug: string;
  name: string;
  /** one short line under the name on cards */
  tagline: string;
  /**
   * Short label shown on the card, in the finder and in structured data, e.g.
   * "Cover only" (FACTS.md: the cover must always say so).
   */
  badge?: string;
  fill: string;
  shell: string;
  /** schema.org `material` for structured data, e.g. "Goose feather" */
  material: string;
  /** 1–3 short bullet benefits */
  benefits: string[];
  variants: Variant[];
  /**
   * Key into the images manifest. Left unset until the owner's own listing
   * photos arrive: stock photography is never shown on a price-bearing card,
   * so without it the card draws the product's outline to scale instead.
   */
  imageKey?: string;
  /** optional hover image key */
  imageHoverKey?: string;
  /** FACTS.md: suits back and side sleepers */
  bestFor: Array<"back" | "side">;
};

export type Collection = {
  /** "01", "02" … rendered as "(1)." like the reference site */
  index: string;
  slug: string;
  title: string;
  /** 60–110 words, editorial tone */
  body: string;
  /** bullet list of 3–6 items shown under the body */
  items: string[];
  /** image keys for the right-hand photo column, 2 per collection */
  imageKeys: [string, string];
  /** product slugs that belong here */
  productSlugs: string[];
};

export type Material = {
  slug: string;
  name: string;
  /** one line, e.g. "Dense pile, deep colour, soft hand." */
  note: string;
  imageKey: string;
};

export type Faq = { q: string; a: string };

export type SizeRow = {
  size: string;
  sizeMetric: string;
  /** e.g. "Standard" | "Queen" | "King" */
  label: string;
  /** the packs this size is sold in (rendered under "Packs") */
  bestFor: string;
};

export type SiteContent = {
  brand: {
    name: string;
    wordmark: string;
    tagline: string;
    preloaderLine: string;
    heroHeadline: string;
    heroSub: string;
    introLine: string;
  };
  nav: {
    index: Array<{ id: string; label: string }>;
    menu: Array<{ href: string; label: string }>;
    cta: { label: string; href: string };
  };
  collections: Collection[];
  products: Product[];
  materials: Material[];
  craft: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    stats: Array<{ value: string; label: string }>;
  };
  /** FACTS.md: shown next to every price block */
  priceNote: string;
  sizeGuide: SizeRow[];
  finder: {
    title: string;
    intro: string;
    sizes: Array<{ id: string; label: string; hint: string }>;
    packs: Array<{ id: string; label: string; hint: string }>;
    /**
     * map "<size id>-<pack id>" -> the variant to show (by ASIN), with an
     * optional note, e.g. a Queen single resolves to the Queen pair.
     */
    recommend: Record<string, { asin: string; note?: string }>;
  };
  care: Faq[];
  footer: {
    enquiryLine: string;
    whatsapp: string;
    email: string;
    amazonStore: string;
    address: string;
    legal: string;
  };
};
