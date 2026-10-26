import type { ImageAsset } from "./types";

/**
 * Photo manifest for GD Home Fabric. Every file lives at /public/images/<key>.jpg
 * (JPEG, long edge ≤1600px). All photos are from Unsplash under the Unsplash licence;
 * the same credit data is mirrored in /public/images/credits.json for the credits page.
 *
 * Only the photos the site actually shows are listed (the credits page lists
 * every entry). They are stock mood photography: none is presented as the
 * GD Home Fabric product, so none sits on a price-bearing card. The owner's
 * own listing photos go on the product cards once supplied (Product.imageKey).
 */
export type ImageKey =
  | "hero"
  | "collection-01-a"
  | "collection-01-b"
  | "product-01"
  | "product-01-alt"
  | "product-03"
  | "product-04-alt"
  | "materials-velvet"
  | "materials-linen"
  | "materials-cotton"
  | "materials-silk"
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
    alt: "Rumpled white pillows and a duvet on an unmade bed against a pale wall",
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
  "product-03": {
    src: "/images/product-03.jpg",
    width: 854,
    height: 1067,
    alt: "A crisp white pillow on a smooth white duvet against a pale wall, bright and airy",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-set-2P4jk-ma5EE",
  },
  "product-04-alt": {
    src: "/images/product-04-alt.jpg",
    width: 854,
    height: 1067,
    alt: "A single crisp white pillow on a smooth white bed against a pale wall",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-set-2P4jk-ma5EE",
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
    alt: "Close-up of a champagne fabric falling in smooth folds in natural light",
    credit: "Photo by Susan Wilkinson on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-view-of-a-white-fabric-hFvWfVxHlaY",
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
