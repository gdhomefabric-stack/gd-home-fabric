import type { ImageAsset } from "./types";

/**
 * Photo manifest for GD Home Fabric. Every file lives at /public/images/<key>.jpg
 * (JPEG, long edge at most 2000px, q 80: the GitHub Pages build is a static
 * export with `images.unoptimized`, so the file on disk is the file served). All photos are from Unsplash under the
 * Unsplash licence (free, never Unsplash+); the same credit data is mirrored in
 * /public/images/credits.json for the credits page.
 *
 * Only the photos the site actually shows are listed (the credits page lists
 * every entry). They are stock mood photography: none is presented as the
 * GD Home Fabric product. The owner's own listing photos replace the product
 * card photos (product-01, product-01-alt, cover-01) once supplied.
 */
export type ImageKey =
  | "hero"
  | "manifesto"
  | "collection-01-a"
  | "collection-01-b"
  | "collection-01-c"
  | "collection-02-a"
  | "collection-02-b"
  | "collection-02-c"
  | "collection-03-a"
  | "collection-03-b"
  | "collection-03-c"
  | "collection-04-a"
  | "collection-04-b"
  | "collection-04-c"
  | "collection-05-a"
  | "collection-05-b"
  | "collection-05-c"
  | "product-01"
  | "product-01-alt"
  | "product-03"
  | "product-04-alt"
  | "cover-01"
  | "band-01"
  | "band-02"
  | "materials-velvet"
  | "materials-linen"
  | "materials-cotton"
  | "materials-silk"
  | "about-01"
  | "footer-01"
  | "footer-02";

export const images: Record<ImageKey, ImageAsset> = {
  "hero": {
    src: "/images/hero.jpg",
    width: 1600,
    height: 1067,
    alt: "Two plump white pillows resting against a pale wooden headboard on a neatly made bed, lit by soft morning light",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-group-of-white-pillows-on-a-bed-W1x69VGN4k8",
  },
  "manifesto": {
    src: "/images/manifesto.jpg",
    width: 1200,
    height: 800,
    alt: "A dim bedroom at dusk, a bed beneath a window blind",
    credit: "Photo by Quin Stevenson on Unsplash",
    creditUrl: "https://unsplash.com/photos/empty-white-and-gray-bed-set-3oyeaivM_fE",
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
  "collection-01-c": {
    src: "/images/collection-01-c.jpg",
    width: 2000,
    height: 1333,
    alt: "Soft white feathers layered over one another in pale light, close up",
    credit: "Photo by N on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-feathers-in-soft-light-JfknhSgANFQ",
  },
  "collection-02-a": {
    src: "/images/collection-02-a.jpg",
    width: 1330,
    height: 2000,
    alt: "Soft folds of plain white cotton in warm light, close up",
    credit: "Photo by Julissa Santana on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-textile-on-brown-wooden-table-B99QPn0T_7Q",
  },
  "collection-02-b": {
    src: "/images/collection-02-b.jpg",
    width: 1500,
    height: 2000,
    alt: "A rumpled white duvet and pillow on an unmade bed, bright and soft",
    credit: "Photo by Sincerely Media on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bedspread-9nhxEa3PK30",
  },
  "collection-02-c": {
    src: "/images/collection-02-c.jpg",
    width: 2000,
    height: 1333,
    alt: "Crumpled white cotton bedding in bright daylight, close up",
    credit: "Photo by Bree Anne on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-of-a-bed-with-white-sheets-24fe4bXlbu8",
  },
  "collection-03-a": {
    src: "/images/collection-03-a.jpg",
    width: 1333,
    height: 2000,
    alt: "A white pillow and duvet on a bed, striped with light through a window blind",
    credit: "Photo by Liz Vo on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-bed-with-white-sheets-and-white-pillows-pl3sj3DigxM",
  },
  "collection-03-b": {
    src: "/images/collection-03-b.jpg",
    width: 1577,
    height: 2000,
    alt: "Three white pillows stacked on a bed against a plain plaster wall",
    credit: "Photo by mk. s on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-stack-of-pillows-sitting-on-top-of-a-wooden-table-cqYHy3WI1Vw",
  },
  "collection-03-c": {
    src: "/images/collection-03-c.jpg",
    width: 2000,
    height: 1333,
    alt: "A neatly made bed with white linen and four white pillows beneath an abstract wall panel, lit by a brass wall lamp",
    credit: "Photo by ubeyonroad on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-neatly-made-bed-with-white-linens-and-pillows-wItbwu49Wdc",
  },
  "collection-04-a": {
    src: "/images/collection-04-a.jpg",
    width: 1500,
    height: 2000,
    alt: "A stack of folded white cotton, close up on the folded edges",
    credit: "Photo by Susan Wilkinson on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-of-a-white-sheet-on-a-bed-y9QJFGvdLWk",
  },
  "collection-04-b": {
    src: "/images/collection-04-b.jpg",
    width: 1500,
    height: 2000,
    alt: "Crinkled white cotton lying loose in soft daylight, close up",
    credit: "Photo by Susan Wilkinson on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-textile-on-brown-wooden-table-DCPR_t-IbG0",
  },
  "collection-04-c": {
    src: "/images/collection-04-c.jpg",
    width: 2000,
    height: 1333,
    alt: "White sheets hanging on a washing line in the sun, with a green garden behind",
    credit: "Photo by Mathias Reding on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-fabric-drying-in-the-sun-outdoors-P4XW-AXjrOA",
  },
  "collection-05-a": {
    src: "/images/collection-05-a.jpg",
    width: 1334,
    height: 2000,
    alt: "A white pillow in a plain white pillowcase propped against a white wall on an unmade bed",
    credit: "Photo by Annie Spratt on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bed-pillow-against-white-wall-mIsAdq1jqKg",
    // The pillow sits in the lower half of the frame; the 4:5 range card
    // would otherwise centre-crop to bare wall.
    objectPosition: "center 70%",
  },
  "collection-05-b": {
    src: "/images/collection-05-b.jpg",
    width: 1333,
    height: 2000,
    alt: "Three white pillows in plain white pillowcases on a bed with a dark wooden headboard",
    credit: "Photo by Abhinav Bhardwaj on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-white-pillow-on-a-bed-LFMNXcFd0SA",
  },
  "collection-05-c": {
    src: "/images/collection-05-c.jpg",
    width: 2000,
    height: 1501,
    alt: "Two white pillows in plain white pillowcases stacked on a bed, in soft grey light",
    credit: "Photo by the blowup on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-bed-pillow-on-bed-9W6BgX5hTvI",
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
  "cover-01": {
    src: "/images/cover-01.jpg",
    width: 1500,
    height: 2000,
    alt: "Folded white cotton with sharp creases, close up",
    credit: "Photo by Mary Borozdina on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-close-up-of-white-sheets-and-sheets-on-a-bed-7jheUC0gLsg",
  },
  "band-01": {
    src: "/images/band-01.jpg",
    width: 2000,
    height: 1333,
    alt: "A rumpled white bed in dappled morning light, the pillow and sheets catching the sun beside a wooden bedside table",
    credit: "Photo by MChe Lee on Unsplash",
    creditUrl: "https://unsplash.com/photos/rumpled-white-bed-in-sunlit-bedroom--Fe_er8ZTuU",
  },
  "band-02": {
    src: "/images/band-02.jpg",
    width: 2000,
    height: 1333,
    alt: "Three white pillows propped against a dark headboard, lit by a hard shaft of morning light, in black and white",
    credit: "Photo by Hansheng Zhao on Unsplash",
    creditUrl: "https://unsplash.com/photos/white-pillows-with-morning-shadows-sYEUhcRwWW8",
  },
  "materials-velvet": {
    src: "/images/materials-velvet.jpg",
    width: 1200,
    height: 1600,
    alt: "Close-up of velvet fabric in warm brown and cream tones",
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
  "about-01": {
    src: "/images/about-01.jpg",
    width: 1525,
    height: 2000,
    alt: "Leaf shadows falling across a white cotton sheet and the edge of a duvet on a bed",
    credit: "Photo by Laura Güldner on Unsplash",
    creditUrl: "https://unsplash.com/photos/a-bed-with-a-white-comforter-and-white-sheets-iq5PjTk0gu4",
  },
  "footer-01": {
    src: "/images/footer-01.jpg",
    width: 1600,
    height: 1096,
    alt: "A sunlit bedroom with a made bed, a wooden bench and a potted tree on hardwood floors",
    credit: "Photo by curaits on Unsplash",
    creditUrl: "https://unsplash.com/photos/bedroom-with-bed-and-wooden-bench-GkKVXQixXlE",
  },
  "footer-02": {
    src: "/images/footer-02.jpg",
    width: 2000,
    height: 1600,
    alt: "A quiet bedroom corner: a grey upholstered bed with cream bedding, a small pendant lamp and a pale wooden floor",
    credit: "Photo by Wemel Wood on Unsplash",
    creditUrl: "https://unsplash.com/photos/minimalist-bedroom-with-a-neatly-made-bed-uhQHGyLungI",
  },
};

export const img = (k: ImageKey) => images[k];
