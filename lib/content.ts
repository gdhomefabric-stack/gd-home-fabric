import type { SiteContent } from "./types";

// ============ CONTACT — EDIT BEFORE LAUNCH ============
// The only place contact details live. Values still in placeholder form
// (XXXXX, or wrapped in <angle brackets>) are detected by `isPlaceholder`
// below and are never rendered: the footer drops the WhatsApp, email and
// address rows until they are filled.
const CONTACT = {
  /** Full number with country code, e.g. "+91 98765 43210" (digits only are used for wa.me). */
  whatsapp: "+91 XXXXX XXXXX",
  /** The owner's email address, still to be supplied. */
  email: "<email>",
  /** One line, e.g. "<street>, <city> <PIN>". */
  address: "<postal address>",
  /**
   * The Amazon storefront URL, still to be supplied. Until then "Shop on
   * Amazon.in" goes to the pillow family page (FACTS.md).
   */
  amazonStore: "https://www.amazon.in/dp/B0HDSR4B3R",
};
// ======================================================

/** True while a CONTACT value is still an unfilled placeholder. */
export const isPlaceholder = (v: string) => /X{3,}|<.*>/.test(v);

/** Amazon.in product page for an ASIN (FACTS.md "Link" column). */
const dp = (asin: string) => `https://www.amazon.in/dp/${asin}`;

export const content: SiteContent = {
  brand: {
    name: "GD Home Fabric",
    wordmark: "GD HOME FABRIC",
    tagline: "Goose feather pillows, on Amazon.in.",
    preloaderLine: "Curtains and pillows, on Amazon.in.",
    heroHeadline: "Goose feather, in pure cotton.",
    heroSub:
      "Goose feather pillows in a 500 thread count pure cotton shell, in Standard, Queen and King. Sold only on Amazon.in.",
    introLine: "Soft enough to sink into, dense enough to hold the head level.",
  },

  nav: {
    index: [
      { id: "collection", label: "Collection" },
      { id: "range", label: "The range" },
      { id: "materials", label: "Materials" },
      { id: "craft", label: "About" },
      { id: "sizes", label: "Sizes" },
      { id: "finder", label: "Find yours" },
      { id: "care", label: "Care" },
    ],
    menu: [
      { href: "#collection", label: "Collection" },
      { href: "#range", label: "The range" },
      { href: "#materials", label: "Materials" },
      { href: "#craft", label: "About" },
      { href: "#sizes", label: "Sizes" },
      { href: "#finder", label: "Find yours" },
      { href: "#care", label: "Care" },
      { href: "/credits", label: "Credits" },
    ],
    cta: { label: "Shop on Amazon.in", href: CONTACT.amazonStore },
  },

  // Five numbered sections, one per fact group in FACTS.md. The photo column
  // reads `imageKeys` in order (a, b and the optional c of that section's set).
  collections: [
    {
      index: "01",
      slug: "goose-feather-pillow",
      title: "Goose Feather Pillow",
      body:
        "Goose feather fill, in a white, plain, rectangular bed pillow. The feather moves with you and springs back. The pillow is soft enough to sink into and dense enough to hold the head level. It suits back and side sleepers, and people who find memory foam too firm or fibre pillows too flat. Sold only on Amazon.in, in Standard, Queen and King.",
      items: [
        "Goose feather fill",
        "Soft enough to sink into, dense enough to hold the head level",
        "Suits back and side sleepers",
        "For people who find memory foam too firm or fibre pillows too flat",
        "White, plain, rectangular",
      ],
      imageKeys: ["collection-01-a", "collection-01-b", "collection-01-c"],
      productSlugs: ["goose-feather-pillow"],
    },
    {
      index: "02",
      slug: "cotton-shell",
      title: "The cotton shell",
      body:
        "The shell is 500 thread count pure cotton, in a tight downproof weave that keeps the feather in and lets air move through. Cotton breathes in a way polyester does not. Always use a pillow cover over it, and check the cover size before ordering: too tight flattens the loft, too loose lets it shift. Dry clean is recommended; spot clean small marks with a damp cloth.",
      items: [
        "500 thread count pure cotton",
        "Tight downproof weave keeps the feather in",
        "Lets air move through: cotton breathes in a way polyester does not",
        "Always use a pillow cover",
      ],
      // The soft-focus `-a` sits last so the sharp photos lead.
      imageKeys: ["collection-02-b", "collection-02-c", "collection-02-a"],
      productSlugs: ["goose-feather-pillow"],
    },
    {
      index: "03",
      slug: "three-sizes",
      title: "Three sizes",
      body:
        "One pillow, three sizes. Standard is 17 × 27 in (43 × 69 cm), in a pack of 1 or a pack of 2. Queen is 20 × 30 in (51 × 76 cm) and is sold as a pair only; there is no Queen single. King is 20 × 36 in (51 × 91 cm), in a pack of 1 or a pack of 2. Check your pillow cover size before ordering: too tight flattens the loft, too loose lets it shift.",
      items: [
        "Standard 17 × 27 in, pack of 1 or pack of 2",
        "Queen 20 × 30 in, pack of 2 only",
        "King 20 × 36 in, pack of 1 or pack of 2",
        "Check your pillow cover size before ordering",
      ],
      // `collection-03-c` is the interim band-01 photo (see `bands`), so it
      // is not repeated here.
      imageKeys: ["collection-03-a", "collection-03-b"],
      productSlugs: ["goose-feather-pillow"],
    },
    {
      index: "04",
      slug: "vacuum-packed",
      title: "Vacuum packed",
      body:
        "The pillow arrives vacuum packed. Allow 24 to 48 hours after unpacking for it to reach full loft, then shake it each morning: the feather moves with you and springs back. Dry clean is recommended. Spot clean small marks with a damp cloth, and do not machine wash or wring the pillow, which clumps the feather. Air it in shade every few weeks, and always use a pillow cover.",
      items: [
        "Allow 24 to 48 hours to reach full loft",
        "Shake each morning",
        "Dry clean recommended; spot clean with a damp cloth",
        "Do not machine wash or wring",
        "Air in shade every few weeks",
      ],
      // `collection-04-c` (sheets drying in full sun) contradicts "air in
      // shade" and shows a product not in FACTS.md; dropped until replaced.
      imageKeys: ["collection-04-a", "collection-04-b"],
      productSlugs: ["goose-feather-pillow"],
    },
    {
      index: "05",
      slug: "pillow-cover",
      title: "The cover, on its own",
      body:
        "Cover only: no pillow and no filling inside. One empty pillowcase in plain, 300 thread count white cotton, made for standard 17 × 27 in pillows, including the GD Home Fabric Standard pillow. It is ₹100 on Amazon.in, the price on 26 Oct 2026; Amazon shows the current price. Always use a pillow cover on a feather pillow, and follow the care label.",
      items: [
        "Cover only, no filling inside",
        "300 thread count white cotton, plain",
        "Made for 17 × 27 in pillows",
        "₹100 on Amazon.in",
        "Follow the care label",
      ],
      // `collection-05-c` is the interim band-02 photo (see `bands`), so it
      // is not repeated here.
      imageKeys: ["collection-05-a", "collection-05-b"],
      productSlugs: ["pillow-cover"],
    },
  ],

  // AESTHETIC.md: the dark band after the hero. 41 words, each from FACTS.md
  // (no making or quality claim; "6+ years" in the form FACTS.md prescribes).
  manifesto: {
    eyebrow: "GD Home Fabric",
    text:
      "A pillow is a simple thing. Goose feather, held in a 500 thread count pure cotton shell that keeps the feather in and lets the air through. Three sizes. Sold on Amazon.in, where GD Home Fabric has been for 6+ years.",
  },

  // AESTHETIC.md: the two full-bleed photo bands, in page order. Interim
  // photos: `band-01` (sun hot-spot, hotel headboard) and `band-02` (hard
  // black-and-white light) are swapped for calm colour photos already on
  // disk until wide, evenly lit replacements are sourced.
  bands: [
    { imageKey: "collection-03-c", line: "Vacuum packed. Allow 24 to 48 hours for full loft." },
    { imageKey: "collection-05-c", line: "Three sizes. Standard, Queen and King." },
  ],

  // Prices are the Amazon.in selling prices on 26 Oct 2026 (FACTS.md). The
  // finder, the range grid and the structured data all read these rows.
  products: [
    {
      slug: "goose-feather-pillow",
      name: "Goose Feather Pillow",
      tagline: "Goose feather fill in a 500 thread count pure cotton shell.",
      fill: "Goose feather",
      shell: "500 thread count pure cotton, downproof weave",
      material: "Goose feather",
      benefits: [
        "Soft enough to sink into, dense enough to hold the head level",
        "Feather moves with you and springs back",
        "Arrives vacuum packed: allow 24 to 48 hours to reach full loft",
      ],
      variants: [
        {
          sizeName: "Standard",
          size: "17 × 27 in",
          sizeMetric: "43 × 69 cm",
          pack: "Pack of 1",
          priceInr: 1799,
          asin: "B0HDSR4B3R",
          amazonUrl: "https://www.amazon.in/dp/B0HDSR4B3R",
        },
        {
          sizeName: "Standard",
          size: "17 × 27 in",
          sizeMetric: "43 × 69 cm",
          pack: "Pack of 2",
          priceInr: 3500,
          asin: "B0HDT43Q85",
          amazonUrl: "https://www.amazon.in/dp/B0HDT43Q85",
        },
        {
          sizeName: "Queen",
          size: "20 × 30 in",
          sizeMetric: "51 × 76 cm",
          pack: "Pack of 2",
          priceInr: 3799,
          asin: "B0HJQ7QRZN",
          amazonUrl: "https://www.amazon.in/dp/B0HJQ7QRZN",
        },
        {
          sizeName: "King",
          size: "20 × 36 in",
          sizeMetric: "51 × 91 cm",
          pack: "Pack of 1",
          priceInr: 2199,
          asin: "B0HJQ3R6Z6",
          amazonUrl: "https://www.amazon.in/dp/B0HJQ3R6Z6",
        },
        {
          sizeName: "King",
          size: "20 × 36 in",
          sizeMetric: "51 × 91 cm",
          pack: "Pack of 2",
          priceInr: 4300,
          asin: "B0HJGZZF4N",
          amazonUrl: "https://www.amazon.in/dp/B0HJGZZF4N",
        },
      ],
      // AESTHETIC.md phase 3: representative stock photographs on the card
      // (the grid says so); the owner's listing photos replace them. Interim:
      // a plain white pillow (`collection-05-a`) rather than `product-01`,
      // whose pillowcase has an embroidered hem on an unmade bed.
      imageKey: "collection-05-a",
      imageHoverKey: "product-01-alt",
      bestFor: ["back", "side"],
    },
    {
      slug: "pillow-cover",
      name: "Pillow Cover (Cover only)",
      badge: "Cover only",
      tagline: "Cover only. No pillow, no filling inside.",
      fill: "None: cover only, no filling",
      shell: "300 thread count white cotton, plain",
      material: "Cotton",
      benefits: [
        "One empty pillowcase",
        "Made for standard 17 × 27 in pillows, including the GD Home Fabric Standard pillow",
        "Follow the care label",
      ],
      variants: [
        {
          size: "17 × 27 in",
          sizeMetric: "43 × 69 cm",
          pack: "1 piece",
          priceInr: 100,
          asin: "B0FJ2RHP1Z",
          amazonUrl: "https://www.amazon.in/dp/B0FJ2RHP1Z",
        },
      ],
      // Interim: folded white cotton (`collection-04-a`) rather than
      // `cover-01`, which reads as creased paper at card size.
      imageKey: "collection-04-a",
      bestFor: [],
    },
  ],

  priceNote: "Price on Amazon.in on 26 Oct 2026. Amazon shows the current price.",

  materials: [
    {
      slug: "velvet",
      name: "Velvet",
      note: "A curtain fabric in the GD Home Fabric range on Amazon.in.",
      imageKey: "materials-velvet",
    },
    {
      slug: "linen",
      name: "Linen",
      note: "A curtain fabric in the GD Home Fabric range on Amazon.in.",
      imageKey: "materials-linen",
    },
    {
      slug: "cotton",
      name: "Cotton",
      note: "500 thread count on the pillow shell, 300 on the cover.",
      imageKey: "materials-cotton",
    },
    {
      slug: "silk",
      name: "Faux-silk",
      note: "A curtain fabric in the GD Home Fabric range on Amazon.in.",
      imageKey: "materials-silk",
    },
  ],

  craft: {
    eyebrow: "On Amazon.in",
    title: "6+ years on Amazon.in.",
    paragraphs: [
      "GD Home Fabric has been on Amazon.in for 6+ years, selling curtains and pillows. The curtains come in velvet, linen, faux-silk and blackout.",
      "The seller is GD Home Fabric, and the legal entity is HiChoice Exports. Pillows are sold only on Amazon.in; there is no checkout on this site.",
    ],
    stats: [
      { value: "6+", label: "years on Amazon.in" },
      { value: "500", label: "thread count pillow shell" },
      { value: "300", label: "thread count cover" },
    ],
  },

  sizeGuide: [
    {
      size: "17 × 27 in",
      sizeMetric: "43 × 69 cm",
      label: "Standard",
      bestFor: "Pack of 1 or pack of 2. Check your pillow cover size before ordering.",
    },
    {
      size: "20 × 30 in",
      sizeMetric: "51 × 76 cm",
      label: "Queen",
      bestFor: "Sold as a pair only. There is no Queen single.",
    },
    {
      size: "20 × 36 in",
      sizeMetric: "51 × 91 cm",
      label: "King",
      bestFor: "Pack of 1 or pack of 2.",
    },
  ],

  finder: {
    title: "Find your size",
    intro:
      "Choose a size and a pack to see the price and the matching listing on Amazon.in.",
    sizes: [
      { id: "standard", label: "Standard", hint: "17 × 27 in (43 × 69 cm). Pack of 1 or pack of 2." },
      { id: "queen", label: "Queen", hint: "20 × 30 in (51 × 76 cm). Sold as a pair only." },
      { id: "king", label: "King", hint: "20 × 36 in (51 × 91 cm). Pack of 1 or pack of 2." },
    ],
    packs: [
      { id: "1", label: "Pack of 1", hint: "One pillow." },
      { id: "2", label: "Pack of 2", hint: "Two pillows." },
    ],
    recommend: {
      "standard-1": { asin: "B0HDSR4B3R" },
      "standard-2": { asin: "B0HDT43Q85" },
      "queen-1": { asin: "B0HJQ7QRZN", note: "Queen 20 × 30 is sold as a pair only." },
      "queen-2": { asin: "B0HJQ7QRZN" },
      "king-1": { asin: "B0HJQ3R6Z6" },
      "king-2": { asin: "B0HJGZZF4N" },
    },
  },

  care: [
    {
      q: "How do I clean it?",
      a: "Dry clean recommended. Spot clean small marks with a damp cloth. Do not machine wash or wring the pillow: it clumps the feather. Always use a pillow cover.",
    },
    {
      q: "How do I keep it full?",
      a: "Shake the pillow each morning to restore full loft. The feather moves with you and springs back. Air it in shade every few weeks.",
    },
    {
      q: "It arrived flat. Is that normal?",
      a: "Yes. The pillow arrives vacuum packed. Allow 24 to 48 hours for it to reach full loft after unpacking.",
    },
    {
      q: "Which pillow cover do I need?",
      a: "Check your pillow cover size before ordering: too tight flattens the loft, too loose lets it shift. The GD Home Fabric pillow cover is cover only, with no pillow or filling inside, made for standard 17 × 27 in pillows.",
    },
    {
      q: "What is the shell made of?",
      a: "500 thread count pure cotton, in a tight downproof weave that keeps the feather in and lets air move through. Cotton breathes in a way polyester does not. The separate pillow cover is 300 thread count white cotton.",
    },
    {
      q: "Who is it for?",
      a: "Back and side sleepers, and people who find memory foam too firm or fibre pillows too flat.",
    },
    {
      q: "What about returns?",
      a: "Pillows are sold only on Amazon.in. Returns follow Amazon's return policy shown on the listing.",
    },
  ],

  footer: {
    enquiryLine: "Shop GD Home Fabric pillows on Amazon.in.",
    whatsapp: CONTACT.whatsapp,
    email: CONTACT.email,
    amazonStore: CONTACT.amazonStore,
    address: CONTACT.address,
    legal: "© 2026 GD Home Fabric · HiChoice Exports",
  },
};

/**
 * Build-time guard (called from app/page.tsx, so a bad edit fails
 * `next build`): every variant links to exactly its own Amazon.in page, no
 * ASIN is listed twice, and every finder answer resolves to a listed ASIN.
 */
export function checkContent(c: SiteContent): void {
  const problems: string[] = [];
  const asins = new Set<string>();

  for (const product of c.products) {
    if (product.variants.length === 0) problems.push(`${product.slug}: no variants`);
    for (const v of product.variants) {
      if (!/^B0[A-Z0-9]{8}$/.test(v.asin)) problems.push(`${product.slug}: bad ASIN "${v.asin}"`);
      if (v.amazonUrl !== dp(v.asin)) {
        problems.push(`${product.slug} ${v.asin}: amazonUrl must be ${dp(v.asin)}`);
      }
      if (!Number.isInteger(v.priceInr) || v.priceInr <= 0) {
        problems.push(`${product.slug} ${v.asin}: bad price ${v.priceInr}`);
      }
      if (asins.has(v.asin)) problems.push(`${v.asin} is listed twice`);
      asins.add(v.asin);
    }
  }

  for (const size of c.finder.sizes) {
    for (const pack of c.finder.packs) {
      const key = `${size.id}-${pack.id}`;
      const answer = c.finder.recommend[key];
      if (!answer) problems.push(`finder: no answer for "${key}"`);
      else if (!asins.has(answer.asin)) problems.push(`finder: "${key}" → unknown ASIN ${answer.asin}`);
    }
  }
  for (const [key, answer] of Object.entries(c.finder.recommend)) {
    if (!asins.has(answer.asin)) problems.push(`finder: "${key}" → unknown ASIN ${answer.asin}`);
  }

  if (problems.length > 0) {
    throw new Error(`lib/content.ts failed its offer checks:\n- ${problems.join("\n- ")}`);
  }
}
