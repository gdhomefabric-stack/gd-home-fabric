import type { ImageAsset } from "./types";

/**
 * Photo manifest for GD Home Fabric. Every file lives at /public/images/<key>.jpg
 * (JPEG, long edge ≤1600px). All photos are from Unsplash under the Unsplash licence;
 * the same credit data is mirrored in /public/images/credits.json for the credits page.
 */
export type ImageKey =
  | "hero"
  | "collection-01-a"
  | "collection-01-b"
  | "collection-02-a"
  | "collection-02-b"
  | "collection-03-a"
  | "collection-03-b"
  | "collection-04-a"
  | "collection-04-b"
  | "collection-05-a"
  | "collection-05-b"
  | "collection-06-a"
  | "collection-06-b"
  | "product-01"
  | "product-01-alt"
  | "product-02"
  | "product-02-alt"
  | "product-03"
  | "product-03-alt"
  | "product-04"
  | "product-04-alt"
  | "product-05"
  | "product-05-alt"
  | "product-06"
  | "product-07"
  | "product-08"
  | "product-09"
  | "product-10"
  | "materials-velvet"
  | "materials-linen"
  | "materials-cotton"
  | "materials-silk"
  | "craft-01"
  | "craft-02"
  | "craft-03"
  | "footer-01";

export const images: Record<ImageKey, ImageAsset> = {
  "hero": {
    src: "/images/hero.jpg",
    width: 1600,
    height: 1067,
    alt: "Two plump white pillows resting against a pale wooden headboard on a neatly made bed, lit by soft morning light",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-group-of-white-pillows-on-a-bed-W1x69VGN4k8",
  },
  "collection-01-a": {
    src: "/images/collection-01-a.jpg",
    width: 1600,
    height: 1067,
    alt: "Rumpled stone-washed linen pillows and duvet on an unmade bed against a pale wall",
    credit: "Photo by Priscilla Du Preez on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-pillows-LpZMZXXpRcM",
  },
  "collection-01-b": {
    src: "/images/collection-01-b.jpg",
    width: 1200,
    height: 1600,
    alt: "Plush white pillows piled on a bed beside a bright window, their edges catching the daylight",
    credit: "Photo by Stockholm Paris Studio on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-of-pillows-on-a-bed-lLIiI9PMm8g",
  },
  "collection-02-a": {
    src: "/images/collection-02-a.jpg",
    width: 1600,
    height: 1067,
    alt: "Crisp white pillows and a smooth white duvet on a bed, bright and airy",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-set-2P4jk-ma5EE",
  },
  "collection-02-b": {
    src: "/images/collection-02-b.jpg",
    width: 1067,
    height: 1600,
    alt: "A neat stack of crisp white hotel pillows on a white sheet",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-white-pillow-on-a-bed-LFMNXcFd0SA",
  },
  "collection-03-a": {
    src: "/images/collection-03-a.jpg",
    width: 1600,
    height: 1067,
    alt: "A young woman sleeping peacefully on her side on a white pillow, with a light wooden headboard behind her",
    credit: "Photo by Slaapwijsheid.nl on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-young-girl-sleeping-in-a-bed-with-white-sheets-mHWmTL_EtLQ",
  },
  "collection-03-b": {
    src: "/images/collection-03-b.jpg",
    width: 1067,
    height: 1600,
    alt: "A woman lying on her back with eyes closed, head cradled by a soft white pillow",
    credit: "Photo by Erinada Valpurgieva on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-woman-laying-in-bed-with-her-eyes-closed-NDZjr1Udw_U",
  },
  "collection-04-a": {
    src: "/images/collection-04-a.jpg",
    width: 1600,
    height: 1067,
    alt: "A branch of open cotton bolls laid on a plain white surface",
    credit: "Photo by Marianne Krohn on Unsplash",
    creditUrl: "https://unsplash.com/photos/cottons-on-white-surface-RNqZbnBnMQk",
  },
  "collection-04-b": {
    src: "/images/collection-04-b.jpg",
    width: 1067,
    height: 1600,
    alt: "Hands gently holding a single fluffy cotton boll",
    credit: "Photo by Svitlana Rusak on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-person-holding-a-cotton-ball-in-their-hands-VpiK1PntEdA",
  },
  "collection-05-a": {
    src: "/images/collection-05-a.jpg",
    width: 1600,
    height: 1067,
    alt: "A woman curled on her side on a bed, hugging a long white body pillow",
    credit: "Photo by Sasun Bughdaryan on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-woman-laying-on-top-of-a-bed-next-to-a-pillow-376sJqPrWcQ",
    // Shown in a 4:5 box: the centre of this landscape frame is the sleeper's
    // legs; the hugged body pillow sits at the right-hand edge.
    objectPosition: "right center",
  },
  "collection-05-b": {
    src: "/images/collection-05-b.jpg",
    width: 1200,
    height: 1600,
    alt: "A woman in a white shirt arranging a long bolster pillow on a bed by a window",
    credit: "Photo by Shoham Avisrur on Unsplash",
    creditUrl: "https://unsplash.com/photos/woman-arranging-pillows-on-a-bed-2yXg3furR8g",
  },
  "collection-06-a": {
    src: "/images/collection-06-a.jpg",
    width: 1600,
    height: 1067,
    alt: "A white sofa dressed with a rust velvet cushion and a white cushion embroidered with leaves",
    credit: "Photo by Jonathan Borba on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-sofa-with-burnt-orange-and-embroidered-leaf-pillows-lNS7_Of-138",
  },
  "collection-06-b": {
    src: "/images/collection-06-b.jpg",
    width: 1200,
    height: 1600,
    alt: "A stack of velvet cushions in grey, forest green and sand on a pale floor",
    credit: "Photo by Agata Create on Unsplash",
    creditUrl: "https://unsplash.com/photos/three-assorted-color-pillows-fQ2XuWjSzfE",
  },
  "product-01": {
    src: "/images/product-01.jpg",
    width: 1200,
    height: 1600,
    alt: "A pair of soft white pillows on a white bed, photographed from above",
    credit: "Photo by Daryl Han on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-white-pillow-on-a-bed-GR-Y1K8dghg",
  },
  "product-01-alt": {
    src: "/images/product-01-alt.jpg",
    width: 1200,
    height: 1600,
    alt: "A white pillow on a bed with window light casting a soft diagonal shadow across it",
    credit: "Photo by Justine Joy Cabero on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-bed-with-a-white-comforter-and-a-white-pillow-FH2bJdvSDJ8",
  },
  // product-02 … product-04 (and their -alt pairs), product-06 and product-09 are
  // 4:5 close crops of the white-pillow photographs already in this manifest, so
  // the range grid reads as one tonal family (white / cream bedding) instead of
  // alternating with decor cushions. Credits follow the source photograph.
  "product-02": {
    src: "/images/product-02.jpg",
    width: 1200,
    height: 1500,
    alt: "Plush white pillows piled on a bed beside a bright window, cropped close so they fill the frame",
    credit: "Photo by Stockholm Paris Studio on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-of-pillows-on-a-bed-lLIiI9PMm8g",
  },
  "product-02-alt": {
    src: "/images/product-02-alt.jpg",
    width: 854,
    height: 1067,
    alt: "A rumpled stone-washed linen pillow and duvet on an unmade bed in soft daylight",
    credit: "Photo by Priscilla Du Preez on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-pillows-LpZMZXXpRcM",
  },
  "product-03": {
    src: "/images/product-03.jpg",
    width: 854,
    height: 1067,
    alt: "A crisp white pillow on a smooth white duvet against a pale wall, bright and airy",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-set-2P4jk-ma5EE",
  },
  "product-03-alt": {
    src: "/images/product-03-alt.jpg",
    width: 854,
    height: 1067,
    alt: "Two plump white pillows against a pale wooden headboard on a neatly made bed",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-group-of-white-pillows-on-a-bed-W1x69VGN4k8",
  },
  "product-04": {
    src: "/images/product-04.jpg",
    width: 1067,
    height: 1334,
    alt: "A neat stack of crisp white hotel pillows on a white sheet, cropped close",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-white-pillow-on-a-bed-LFMNXcFd0SA",
  },
  "product-04-alt": {
    src: "/images/product-04-alt.jpg",
    width: 854,
    height: 1067,
    alt: "A single crisp white pillow on a smooth white bed against a pale wall",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-set-2P4jk-ma5EE",
  },
  "product-05": {
    src: "/images/product-05.jpg",
    width: 1068,
    height: 1600,
    alt: "A long white bolster pillow with a single black stripe lying on white bedding in morning light",
    credit: "Photo by Thom Milkovic on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-and-brown-throw-pillow-on-white-bed-LD0lsn9jPdI",
  },
  "product-05-alt": {
    src: "/images/product-05-alt.jpg",
    width: 1067,
    height: 1600,
    alt: "Two cylindrical bolster cushions in natural linen with a green band",
    credit: "Photo by Praewthida K on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-and-green-sofa-ciJtEN5PKrs",
  },
  "product-06": {
    src: "/images/product-06.jpg",
    width: 854,
    height: 1067,
    alt: "A single plump white pillow resting against a pale wooden headboard in soft morning light",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-group-of-white-pillows-on-a-bed-W1x69VGN4k8",
  },
  // product-07 is the kapok & cotton pillow: a 4:5 crop of the cotton-boll
  // branch from collection 04 (the fill itself, in the grid's white/cream
  // family). The previous frame was a baby's face once the finder cropped it.
  "product-07": {
    src: "/images/product-07.jpg",
    width: 854,
    height: 1067,
    alt: "Open cotton bolls on a dry branch against a plain white surface, cropped close",
    credit: "Photo by Marianne Krohn on Unsplash",
    creditUrl: "https://unsplash.com/photos/cottons-on-white-surface-RNqZbnBnMQk",
    // The bolls sit in the lower two-thirds of the frame; the finder's
    // shallow 3:2 box at `lg` should show them, not the empty white above.
    objectPosition: "center 78%",
  },
  "product-08": {
    src: "/images/product-08.jpg",
    width: 1262,
    height: 1600,
    alt: "A stack of white pillows on a wooden table against a grey wall",
    credit: "Photo by mk. s on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-stack-of-pillows-sitting-on-top-of-a-wooden-table-cqYHy3WI1Vw",
  },
  "product-09": {
    src: "/images/product-09.jpg",
    width: 1067,
    height: 1334,
    alt: "Two round bolster cushions in natural linen with a green band, stacked one on the other",
    credit: "Photo by Praewthida K on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-and-green-sofa-ciJtEN5PKrs",
  },
  "product-10": {
    src: "/images/product-10.jpg",
    width: 1280,
    height: 1600,
    alt: "A textured white cushion with tassels on an upholstered armchair beside a wooden side table",
    credit: "Photo by Tina Witherspoon on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-and-black-throw-pillow-on-brown-wooden-table-cTeb-kqjNyk",
  },
  "materials-velvet": {
    src: "/images/materials-velvet.jpg",
    width: 1200,
    height: 1600,
    alt: "Close-up of crushed velvet fabric in warm brown and cream tones",
    credit: "Photo by Rue S on Unsplash",
    creditUrl: "https://unsplash.com/photos/brown-and-white-floral-textile-26DFIOTiMS0",
  },
  "materials-linen": {
    src: "/images/materials-linen.jpg",
    width: 1200,
    height: 1600,
    alt: "Close-up of light beige linen showing its slubbed, open weave",
    credit: "Photo by Compagnons on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-light-beige-textured-fabric-with-a-grid-pattern-U7PWtm0vdqE",
  },
  "materials-cotton": {
    src: "/images/materials-cotton.jpg",
    width: 1200,
    height: 1600,
    alt: "Close-up of soft white cotton sheeting with gentle folds",
    credit: "Photo by Susan Wilkinson on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-fabric-surface-O0UeMWHEJCw",
  },
  "materials-silk": {
    src: "/images/materials-silk.jpg",
    width: 1200,
    height: 1600,
    alt: "Close-up of champagne silk falling in smooth folds in natural light",
    credit: "Photo by Susan Wilkinson on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-view-of-a-white-fabric-hFvWfVxHlaY",
  },
  "craft-01": {
    src: "/images/craft-01.jpg",
    width: 1600,
    height: 1067,
    alt: "Weathered hands stitching white fabric with a needle and thread",
    credit: "Photo by Elio Santos on Unsplash",
    creditUrl: "https://unsplash.com/photos/hands-sewing-white-fabric-5ZQn_gWKvLE",
  },
  "craft-02": {
    src: "/images/craft-02.jpg",
    width: 1067,
    height: 1600,
    alt: "Hands guiding fabric under the needle of an industrial sewing machine",
    credit: "Photo by alex jhonson on Unsplash",
    creditUrl: "https://unsplash.com/photos/sewing-machine-and-hands-at-work-5zg-ZDesJAk",
  },
  "craft-03": {
    src: "/images/craft-03.jpg",
    width: 1200,
    height: 1600,
    alt: "A tailor's measuring tape, scissors and a spool of thread resting on champagne satin",
    credit: "Photo by pina messina on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-tape-measure-and-gray-scissors-qQKv7r1BaRw",
  },
  "footer-01": {
    src: "/images/footer-01.jpg",
    width: 1600,
    height: 1096,
    alt: "A sunlit bedroom with a made bed, a wooden bench and a potted tree on hardwood floors",
    credit: "Photo by curaits on Unsplash",
    creditUrl: "https://unsplash.com/photos/bedroom-with-bed-and-wooden-bench-GkKVXQixXlE",
  },
};

export const img = (k: ImageKey) => images[k];
