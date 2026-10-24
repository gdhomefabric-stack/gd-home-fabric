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
  /** e.g. "17 × 27 in" */
  size: string;
  /** e.g. "43 × 69 cm" */
  sizeMetric: string;
  /** e.g. "Pack of 1" */
  pack: string;
  /** Indian rupees, whole number */
  priceInr: number;
};

export type Product = {
  slug: string;
  name: string;
  /** one short line under the name on cards */
  tagline: string;
  fill: string;
  shell: string;
  /** 1–3 short bullet benefits */
  benefits: string[];
  variants: Variant[];
  /** key into images manifest, e.g. "product-01" */
  imageKey: string;
  /** optional hover image key */
  imageHoverKey?: string;
  bestFor: Array<"back" | "side" | "stomach" | "combination" | "support" | "decor">;
};

export type Collection = {
  /** "01".."06" — rendered as "(1)." like the reference site */
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
  sizeGuide: SizeRow[];
  finder: {
    title: string;
    intro: string;
    positions: Array<{ id: Product["bestFor"][number]; label: string; hint: string }>;
    firmness: Array<{ id: "soft" | "medium" | "firm"; label: string; hint: string }>;
    /** map "position-firmness" -> product slug */
    recommend: Record<string, string>;
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
