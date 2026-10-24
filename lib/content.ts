import type { SiteContent } from "./types";

// ============ CONTACT — EDIT BEFORE LAUNCH ============
// The only place contact details live. Values still in placeholder form
// (XXXXX, or wrapped in <angle brackets>) are detected by `isPlaceholder`
// below and are never rendered: the footer drops the WhatsApp row and falls
// back to "New Delhi NCR, India" for the address.
const CONTACT = {
  /** Full number with country code, e.g. "+91 98765 43210" (digits only are used for wa.me). */
  whatsapp: "+91 XXXXX XXXXX",
  email: "hello@gdhomefabric.in",
  /** One line, e.g. "Workshop 12, Sector 63, Noida, New Delhi NCR, India". */
  address: "<one line, New Delhi NCR, India>",
  amazonStore: "https://www.amazon.in/s?k=gd+home+fabric",
};
// ======================================================

/** True while a CONTACT value is still an unfilled placeholder. */
export const isPlaceholder = (v: string) => /X{3,}|<.*>/.test(v);

export const content: SiteContent = {
  brand: {
    name: "GD Home Fabric",
    wordmark: "GD HOME FABRIC",
    tagline: "Sleep, tailored by hand.",
    preloaderLine: "Home textiles for rest that lasts.",
    heroHeadline: "Rest, cut and sewn by hand.",
    heroSub:
      "Goose-feather pillows, bolsters and cushions, filled by weight and finished in our own New Delhi workshop.",
    introLine: "Measured by the gram, finished by hand.",
  },

  nav: {
    index: [
      { id: "collection", label: "Collection" },
      { id: "range", label: "The range" },
      { id: "materials", label: "Materials" },
      { id: "craft", label: "Craft" },
      { id: "sizes", label: "Sizes" },
      { id: "finder", label: "Find yours" },
      { id: "care", label: "Care" },
    ],
    menu: [
      { href: "#collection", label: "Collection" },
      { href: "#range", label: "The range" },
      { href: "#materials", label: "Materials" },
      { href: "#craft", label: "Craft" },
      { href: "#sizes", label: "Sizes" },
      { href: "#finder", label: "Find yours" },
      { href: "#care", label: "Care" },
      { href: "/credits", label: "Credits" },
    ],
    cta: { label: "Enquire", href: "#enquire" },
  },

  collections: [
    {
      index: "01",
      slug: "goose-feather-and-down",
      title: "Goose Feather & Down",
      body:
        "Our first pillow, and still the one we are known for. A core of small, curled goose feather gives the structure; a layer of down around it gives the softness you sink into. The two are blended by hand in our own workshop, weighed to the gram and sewn into a cotton percale shell that is down-proof and cool against the face. It takes shape under the head and recovers with a shake in the morning. Supplied in Standard, Queen and King, and in a pack of two for a matched pair.",
      items: [
        "85/15 feather-to-down blend, weighed per pillow",
        "Down-proof cotton percale, 233 thread count",
        "Double-stitched piping on every edge",
        "Standard, Queen and King, single or pair",
        "A softer, down-rich version for low sleepers",
      ],
      imageKeys: ["collection-01-a", "collection-01-b"],
      productSlugs: ["goose-feather-down", "soft-down"],
    },
    {
      index: "02",
      slug: "microfibre-down-alternative",
      title: "Microfibre Down-Alternative",
      body:
        "For those who want the feel of down without the feather, or who sleep with allergies in mind. We fill these with fine siliconised microfibre, spun so each strand slips against the next and the pillow lofts like a natural fill. It is lighter, dries quickly and goes through a domestic washing machine without complaint. We offer it in two densities: a cloud-soft version that gives easily, and a hotel-firm version packed for side sleepers and anyone who likes a pillow to hold its height until morning.",
      items: [
        "Siliconised hollow microfibre, hypoallergenic",
        "Machine washable at home, dries in a morning",
        "Cloud-soft or hotel-firm density",
        "Cotton percale shells, piped edge",
      ],
      imageKeys: ["collection-02-a", "collection-02-b"],
      productSlugs: ["microfibre-cloud", "hotel-firm-microfibre"],
    },
    {
      index: "03",
      slug: "memory-foam-and-cervical-support",
      title: "Memory Foam & Cervical Support",
      body:
        "Support is a matter of geometry. The neck wants to be held level with the spine, and a pillow that collapses or piles up will not do it. Our contour pillow is cut from a single block of slow-recovery foam, with two heights so you can choose the one that fits your shoulder. The shredded version takes the same foam in small pieces, inside a shell with a zip, so the loft can be adjusted by the handful. Both are cased in a breathable bamboo-cotton knit and rest easily on a feather pillow underneath if you prefer a softer first touch.",
      items: [
        "Moulded contour in two heights",
        "Shredded foam with adjustable loft",
        "Removable, washable knit covers",
        "Holds the neck level with the spine",
      ],
      imageKeys: ["collection-03-a", "collection-03-b"],
      productSlugs: ["contour-cervical", "shredded-memory-foam"],
    },
    {
      index: "04",
      slug: "natural-cotton-and-kapok",
      title: "Natural Cotton & Kapok",
      body:
        "Before feather and foam, pillows in this part of the world were filled with cotton and with kapok, the silky fibre of the semal tree. We still make them that way. Kapok is hollow, light and naturally resistant to moisture, so it stays cool through a Delhi summer and does not clump. Blended with carded cotton it gives a low, firm pillow that suits stomach sleepers and those who find feather too yielding. Nothing synthetic goes in, and the fill can be aired in the sun and refreshed for years.",
      items: [
        "70/30 kapok and carded cotton",
        "Unbleached cotton shell",
        "Low, firm, naturally cool",
        "Refresh in the sun, no washing machine needed",
      ],
      imageKeys: ["collection-04-a", "collection-04-b"],
      productSlugs: ["kapok-cotton"],
    },
    {
      index: "05",
      slug: "body-bolster-and-maternity",
      title: "Body, Bolster & Maternity",
      body:
        "Some rest needs more than a pillow under the head. A full-length body pillow runs from shoulder to knee and keeps the hips aligned for side sleepers, for anyone recovering from a back injury, and through the later months of pregnancy. Our bolsters are the round kind found on Indian daybeds, firm enough to sit against and soft enough to hold. Each is filled to a measured weight so a pair matches, then closed with a hand-stitched seam. Covers come off for washing, and we can make either piece in a length of your choosing.",
      items: [
        "Full-length body pillow, 20 × 54 in",
        "Round bolsters, matched by weight",
        "Removable zipped covers",
        "Custom lengths on request",
      ],
      imageKeys: ["collection-05-a", "collection-05-b"],
      productSlugs: ["body-pillow", "round-bolster"],
    },
    {
      index: "06",
      slug: "cushion-fillers-and-covers",
      title: "Cushion Fillers & Covers",
      body:
        "A cushion is only as good as what is inside it. Ours are filled fuller than most, so the corners stay sharp and the cover does not sag after a season on the sofa. We cut them in the three sizes that suit most Indian homes and finish every seam with a double row of stitching. Then there are the covers, which is where our curtain workshop earns its keep: velvet, washed linen and faux-silk from the same bolts as our drapes, with concealed zips and piping, so a room can be dressed to match from window to seat.",
      items: [
        "16, 18 and 20 in fillers, overfilled by ten per cent",
        "Double-stitched cotton shells",
        "Covers in velvet, linen, faux-silk and cotton",
        "Concealed zips, piped edges",
        "Made to match our curtain colours",
      ],
      imageKeys: ["collection-06-a", "collection-06-b"],
      productSlugs: ["cushion-fillers"],
    },
  ],

  products: [
    {
      slug: "goose-feather-down",
      name: "Goose Feather & Down Pillow",
      tagline: "The pillow we are known for.",
      fill: "85% small curled goose feather, 15% goose down",
      shell: "100% cotton percale, 233 thread count, down-proof",
      benefits: [
        "Moulds under the head, recovers with a shake",
        "Cool, down-proof percale shell",
        "Single or as a matched pair",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 1799 },
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 2", priceInr: 3500 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 1", priceInr: 2299 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 2", priceInr: 4499 },
        { size: "20 × 36 in", sizeMetric: "51 × 91 cm", pack: "Pack of 1", priceInr: 2599 },
        { size: "20 × 36 in", sizeMetric: "51 × 91 cm", pack: "Pack of 2", priceInr: 4999 },
      ],
      imageKey: "product-01",
      imageHoverKey: "product-01-alt",
      bestFor: ["back", "side", "combination"],
    },
    {
      slug: "soft-down",
      name: "Soft Down Pillow",
      tagline: "More down, less feather, for a lower pillow.",
      fill: "50% goose down, 50% fine goose feather",
      shell: "100% cotton percale, 233 thread count, down-proof",
      benefits: [
        "Low loft that settles under the face",
        "The lightest pillow we make",
        "Works as a top layer over a firmer pillow",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 2199 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 1", priceInr: 2699 },
      ],
      imageKey: "product-02",
      imageHoverKey: "product-02-alt",
      bestFor: ["stomach", "back"],
    },
    {
      slug: "microfibre-cloud",
      name: "Microfibre Cloud Pillow",
      tagline: "The feel of down, with none of the feather.",
      fill: "Siliconised hollow microfibre, soft density",
      shell: "100% cotton percale, 200 thread count",
      benefits: [
        "Hypoallergenic and machine washable",
        "Lofts and springs back like a natural fill",
        "Dries quickly in the sun",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 899 },
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 2", priceInr: 1699 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 1", priceInr: 1099 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 2", priceInr: 2099 },
      ],
      imageKey: "product-03",
      imageHoverKey: "product-03-alt",
      bestFor: ["back", "stomach", "combination"],
    },
    {
      slug: "hotel-firm-microfibre",
      name: "Hotel Firm Microfibre Pillow",
      tagline: "Packed dense, for side sleepers.",
      fill: "Siliconised hollow microfibre, firm density",
      shell: "100% cotton percale, 200 thread count, piped edge",
      benefits: [
        "Holds its height through the night",
        "Fills the gap between shoulder and ear",
        "Washable at home",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 999 },
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 2", priceInr: 1899 },
        { size: "20 × 36 in", sizeMetric: "51 × 91 cm", pack: "Pack of 1", priceInr: 1399 },
        { size: "20 × 36 in", sizeMetric: "51 × 91 cm", pack: "Pack of 2", priceInr: 2699 },
      ],
      imageKey: "product-04",
      imageHoverKey: "product-04-alt",
      bestFor: ["side", "support", "combination"],
    },
    {
      slug: "contour-cervical",
      name: "Contour Cervical Pillow",
      tagline: "Cut from one block of slow-recovery foam.",
      fill: "Moulded visco-elastic memory foam, 50 density",
      shell: "Removable bamboo-cotton knit cover, zipped",
      benefits: [
        "Two heights, one for each kind of shoulder",
        "Keeps the neck level with the spine",
        "Cover unzips for washing",
      ],
      variants: [
        { size: "20 × 12 × 4 in", sizeMetric: "51 × 30 × 10 cm", pack: "Pack of 1", priceInr: 2199 },
        { size: "20 × 12 × 5 in", sizeMetric: "51 × 30 × 13 cm", pack: "Pack of 1", priceInr: 2399 },
      ],
      imageKey: "product-05",
      imageHoverKey: "product-05-alt",
      bestFor: ["back", "side", "support"],
    },
    {
      slug: "shredded-memory-foam",
      name: "Shredded Memory Foam Pillow",
      tagline: "Adjust the loft by the handful.",
      fill: "Shredded memory foam, with a spare bag of fill",
      shell: "Bamboo-cotton knit outer, zipped cotton inner",
      benefits: [
        "Add or remove fill to set your height",
        "Breathes better than a solid block",
        "Settles as you turn",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 1999 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 1", priceInr: 2499 },
      ],
      imageKey: "product-06",
      bestFor: ["combination", "side", "back"],
    },
    {
      slug: "kapok-cotton",
      name: "Kapok & Cotton Pillow",
      tagline: "Plant fibre, the old way.",
      fill: "70% kapok (semal) fibre, 30% carded cotton",
      shell: "Unbleached 100% cotton, 180 thread count",
      benefits: [
        "Low and firm, stays cool",
        "No synthetic fibre or foam",
        "Air in the sun to refresh",
      ],
      variants: [
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 1", priceInr: 1299 },
        { size: "17 × 27 in", sizeMetric: "43 × 69 cm", pack: "Pack of 2", priceInr: 2499 },
        { size: "20 × 30 in", sizeMetric: "51 × 76 cm", pack: "Pack of 1", priceInr: 1599 },
      ],
      imageKey: "product-07",
      bestFor: ["stomach", "back"],
    },
    {
      slug: "body-pillow",
      name: "Full-Length Body Pillow",
      tagline: "Shoulder to knee, in one piece.",
      fill: "Siliconised hollow microfibre, medium density",
      shell: "100% cotton percale, with a removable zipped cover",
      benefits: [
        "Keeps hips and knees aligned on the side",
        "Comfort through later pregnancy",
        "Cover removes for washing",
      ],
      variants: [
        { size: "20 × 54 in", sizeMetric: "51 × 137 cm", pack: "Pack of 1", priceInr: 2499 },
      ],
      imageKey: "product-08",
      bestFor: ["side", "support"],
    },
    {
      slug: "round-bolster",
      name: "Round Bolster",
      tagline: "The daybed kind, filled to a measured weight.",
      fill: "Dense siliconised microfibre",
      shell: "100% cotton percale, hand-closed seam",
      benefits: [
        "Firm enough to sit against",
        "Pairs matched by weight",
        "Any length to order",
      ],
      variants: [
        { size: "9 × 24 in", sizeMetric: "23 × 61 cm", pack: "Pack of 1", priceInr: 899 },
        { size: "9 × 24 in", sizeMetric: "23 × 61 cm", pack: "Pack of 2", priceInr: 1699 },
      ],
      imageKey: "product-09",
      bestFor: ["support", "decor"],
    },
    {
      slug: "cushion-fillers",
      name: "Cushion Fillers",
      tagline: "Filled fuller than most, so corners stay sharp.",
      fill: "Siliconised hollow microfibre, overfilled by ten per cent",
      shell: "100% cotton, double-stitched seams",
      benefits: [
        "Sharp corners that do not sag",
        "Three sizes for Indian sofas",
        "Covers made to match our curtains",
      ],
      variants: [
        { size: "16 × 16 in", sizeMetric: "41 × 41 cm", pack: "Pack of 2", priceInr: 699 },
        { size: "18 × 18 in", sizeMetric: "46 × 46 cm", pack: "Pack of 2", priceInr: 799 },
        { size: "20 × 20 in", sizeMetric: "51 × 51 cm", pack: "Pack of 2", priceInr: 899 },
        { size: "16 × 16 in", sizeMetric: "41 × 41 cm", pack: "Pack of 5", priceInr: 1499 },
      ],
      imageKey: "product-10",
      bestFor: ["decor"],
    },
  ],

  materials: [
    {
      slug: "velvet",
      name: "Velvet",
      note: "Short dense pile that drinks colour and warms a room.",
      imageKey: "materials-velvet",
    },
    {
      slug: "linen",
      name: "Linen",
      note: "Washed flax, cool to the touch, creases with grace.",
      imageKey: "materials-linen",
    },
    {
      slug: "cotton",
      name: "Cotton",
      note: "Percale woven tight enough to hold down without a coating.",
      imageKey: "materials-cotton",
    },
    {
      slug: "silk",
      name: "Faux-silk",
      note: "The sheen of silk, in a weave you can wash.",
      imageKey: "materials-silk",
    },
  ],

  craft: {
    eyebrow: "Craft",
    title: "One workshop, every stitch.",
    paragraphs: [
      "Everything we sell is cut, filled and sewn in our own workshop on the edge of New Delhi, on the same floor where we have made curtains for the better part of a decade. Pillows are filled at a weighing station rather than by eye, and each shell is closed with a double-stitched seam and a line of piping that keeps the edge true after years of washing.",
      "Feather and down come to us washed and sterilised, graded by fill power and tested before a single bale is opened. Cotton percale for the shells is woven to a count tight enough to be down-proof without a coating. Velvet, linen and faux-silk for covers come off the same bolts we use for drapes, so colours match across a room.",
      "Before a pillow leaves, it passes forty-eight checks: fill weight, loft after compression, seam strength, zip run, shell for leakage, and a final shake and look under daylight. We keep a sample from every batch for a year. If something fails in your home we would rather know, and we will replace it.",
    ],
    stats: [
      { value: "2,400+", label: "pillows sewn a month" },
      { value: "48", label: "quality checkpoints" },
      { value: "100%", label: "made in our workshop" },
      { value: "6", label: "years on Amazon.in" },
    ],
  },

  sizeGuide: [
    {
      size: "17 × 27 in",
      sizeMetric: "43 × 69 cm",
      label: "Standard",
      bestFor: "Single sleepers and twin beds. The size most of our customers choose.",
    },
    {
      size: "20 × 30 in",
      sizeMetric: "51 × 76 cm",
      label: "Queen",
      bestFor: "Queen beds, two across. A little more room for side sleepers who move.",
    },
    {
      size: "20 × 36 in",
      sizeMetric: "51 × 91 cm",
      label: "King",
      bestFor: "King beds, two across with no gap. Also for sitting up to read.",
    },
    {
      size: "16 × 16 in",
      sizeMetric: "41 × 41 cm",
      label: "Cushion",
      bestFor: "Armchairs and smaller sofas. Fills a 16 or 18 in cover.",
    },
    {
      size: "20 × 20 in",
      sizeMetric: "51 × 51 cm",
      label: "Cushion",
      bestFor: "Deep sofas and daybeds. Fills a 20 or 22 in cover.",
    },
  ],

  finder: {
    title: "Find your pillow",
    intro: "Two answers, and we will point you to the pillow we would make for you.",
    positions: [
      { id: "back", label: "Back", hint: "Medium loft, so the chin stays level." },
      { id: "side", label: "Side", hint: "Higher loft to fill the shoulder gap." },
      { id: "stomach", label: "Stomach", hint: "Low and soft, so the neck is not turned up." },
      { id: "combination", label: "Combination", hint: "Something that moulds as you move." },
    ],
    firmness: [
      { id: "soft", label: "Soft", hint: "Sinks and settles around you." },
      { id: "medium", label: "Medium", hint: "Yields, then holds." },
      { id: "firm", label: "Firm", hint: "Keeps its height all night." },
    ],
    recommend: {
      "back-soft": "soft-down",
      "back-medium": "goose-feather-down",
      "back-firm": "contour-cervical",
      "side-soft": "shredded-memory-foam",
      "side-medium": "goose-feather-down",
      "side-firm": "hotel-firm-microfibre",
      "stomach-soft": "soft-down",
      "stomach-medium": "microfibre-cloud",
      "stomach-firm": "kapok-cotton",
      "combination-soft": "goose-feather-down",
      "combination-medium": "shredded-memory-foam",
      "combination-firm": "hotel-firm-microfibre",
    },
  },

  care: [
    {
      q: "How do I wash a feather and down pillow?",
      a: "In a front-loading machine, on a gentle cycle, in cool water with a small measure of mild detergent. Wash two at a time so the drum stays balanced, and run a second rinse. Drying matters more than washing: tumble on low with a couple of clean tennis balls, or lay the pillow in strong sun and turn it through the day. It must be completely dry before it goes back on the bed, or the fill will smell and clump. Once or twice a year is enough.",
    },
    {
      q: "How do I keep it full?",
      a: "Shake it each morning, holding opposite corners, so the feather separates and air gets back in. Once a week leave it in the sun for an hour. A cotton protector under the pillowcase keeps oils and moisture off the shell and roughly doubles the time between washes.",
    },
    {
      q: "When should I replace a pillow?",
      a: "Fold it in half and let go. If it stays folded, the fill has tired. As a guide, a feather and down pillow that is aired and shaken will give four to six years, microfibre two to three, and foam three to four. If you wake with a stiff neck that was not there a year ago, the pillow is usually the reason.",
    },
    {
      q: "I have allergies. What should I choose?",
      a: "Our feather and down is washed and sterilised to a high standard, and the percale shell is woven tightly enough that neither fill nor dust passes through, so most people with mild sensitivities sleep well on it. If you react to animal fibre, the microfibre and kapok pillows are the safer choice and can be washed at a higher temperature. Whichever you choose, wash the protector and pillowcase weekly.",
    },
    {
      q: "What are the shells made of?",
      a: "Pure cotton percale, woven to a 233 thread count for the feather and down range so it is down-proof without a chemical coating, and a slightly lighter 200 count for microfibre. Every shell is double-stitched and finished with a piped edge in our workshop. Memory foam pieces have a removable bamboo-cotton knit cover with a concealed zip.",
    },
    {
      q: "What about returns and exchanges?",
      a: "Orders placed through Amazon.in follow Amazon's return policy for bedding, which allows a return within the stated window if the pillow is unopened. For orders placed with us directly, we accept exchanges within ten days for a different size or firmness, as long as the item is unused and in its packaging. Anything with a manufacturing fault, a split seam or a leaking shell, we replace at no cost within the first year.",
    },
    {
      q: "Can you make a custom size?",
      // Names WhatsApp only once the number above is real, so the FAQ never
      // points at a channel the footer is not showing.
      a: `Yes. We cut and fill to order in any size up to 36 inches square, and body pillows up to 72 inches long. Send us the measurements and the fill you prefer ${isPlaceholder(CONTACT.whatsapp) ? "by email" : "on WhatsApp or by email"}, and we will confirm a price and a making time, which is usually seven to ten days.`,
    },
    {
      q: "Do you supply hotels and bulk orders?",
      a: "We do, from fifty pieces upward. Hotel orders are sewn in a heavier 300 count percale with reinforced seams, and can carry your own woven label. We send samples first, and quote in writing for the full order with a delivery schedule.",
    },
  ],

  footer: {
    enquiryLine: "Tell us how you sleep. We'll make the pillow.",
    whatsapp: CONTACT.whatsapp,
    email: CONTACT.email,
    amazonStore: CONTACT.amazonStore,
    address: CONTACT.address,
    legal: "© 2026 GD Home Fabric · HiChoice Exports",
  },
};
