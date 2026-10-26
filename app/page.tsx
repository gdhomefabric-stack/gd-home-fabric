import { checkContent, content, isPlaceholder } from "@/lib/content";
import { images, img, type ImageKey } from "@/lib/images";
import type { ImageAsset, SiteContent } from "@/lib/types";
import { ScrollVelocityProvider } from "@/lib/motion";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_LEGAL_NAME, SITE_NAME, SITE_URL } from "@/lib/site";

import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import Nav from "@/components/Nav";
import SideIndex from "@/components/SideIndex";
import Hero from "@/components/Hero";
import Collections from "@/components/Collections";
import ProductGrid from "@/components/ProductGrid";
import Materials from "@/components/Materials";
import Craft from "@/components/Craft";
import SizeGuide from "@/components/SizeGuide";
import Finder from "@/components/Finder";
import Care from "@/components/Care";
import Footer from "@/components/Footer";

/**
 * Home — the single editorial page. A server component: it only reads the
 * content and photo manifests and hands them to the client components as
 * plain props, in the order fixed by CONTRACT.md.
 *
 * Each client component gets only the manifest entries it renders (`pick`):
 * every client boundary serialises its props into the RSC payload, so passing
 * the whole 36-entry manifest four times would ship ~50KB of repeated strings.
 *
 * The global motion pieces (scroll hairline, custom cursor) are mounted once
 * here, ahead of the preloader, inside the one `ScrollVelocityProvider` that
 * every ImageReveal and the Materials marquee read their skew from. <main> is
 * the curtain over the fixed footer: it sits above it (`relative z-10
 * bg-paper`) and reserves the footer's measured height below itself
 * (`--footer-h`, published by Footer on <html>), so the footer is uncovered as
 * the page scrolls to its end.
 *
 * Structured data (Organization, WebSite and an ItemList of the range) is
 * emitted once as JSON-LD from this server component so crawlers get it in the
 * initial HTML; it is built from the same `content` the page renders. Each
 * product carries one Offer per Amazon.in listing (ASIN, price, dp URL); the
 * date-gated coupon is never part of it.
 */

// Fails the build if a variant's link, ASIN or a finder answer is wrong.
checkContent(content);

/** The manifest entries for `keys` (unknown keys are skipped, not stubbed). */
function pick(keys: Array<string | undefined>): Record<string, ImageAsset> {
  const out: Record<string, ImageAsset> = {};
  for (const key of keys) {
    if (!key || key in out) continue;
    const asset = images[key as ImageKey] as ImageAsset | undefined;
    if (asset) out[key] = asset;
  }
  return out;
}

/** Absolute URL for a public path ("/images/x.jpg" → "https://…/images/x.jpg"). */
const absolute = (path: string) => `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

/**
 * The footer's contact block with any unfilled placeholder removed on the
 * server. Footer already refuses to render a placeholder, but a client
 * component's props travel in the RSC payload, so without this "+91 XXXXX
 * XXXXX" would still sit in view-source. Empty values are treated as absent by
 * Footer (WhatsApp needs ≥10 digits; email and address are simply skipped).
 */
const footer: SiteContent["footer"] = {
  ...content.footer,
  whatsapp: isPlaceholder(content.footer.whatsapp) ? "" : content.footer.whatsapp,
  email: isPlaceholder(content.footer.email) ? "" : content.footer.email.trim(),
  address: isPlaceholder(content.footer.address) ? "" : content.footer.address.trim(),
};

/**
 * An Amazon storefront page, as opposed to a search-results page or the
 * product page "Shop on Amazon.in" uses until the storefront URL is supplied.
 */
const isStorefrontUrl = (url: string) => {
  try {
    const { pathname } = new URL(url);
    return !/^\/s\/?$/.test(pathname) && !/^\/dp\//.test(pathname);
  } catch {
    return false;
  }
};

/**
 * schema.org graph for the home page. Prices are whole rupees (Amazon.in, 26
 * Oct 2026); each product carries one Offer per size/pack listing, linking to
 * that listing on Amazon.in (pillows are sold only there).
 */
function structuredData() {
  const { products } = content;
  const organizationId = `${SITE_URL}/#organization`;

  const organization = {
    "@type": "Organization",
    "@id": organizationId,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    image: absolute(OG_IMAGE.url),
    logo: absolute("/apple-icon.png"),
    // Only once the owner has supplied them (`footer` above blanks placeholders).
    email: footer.email || undefined,
    address: footer.address
      ? { "@type": "PostalAddress", streetAddress: footer.address }
      : undefined,
    // Only a real storefront is a profile of the organisation.
    sameAs: isStorefrontUrl(footer.amazonStore) ? [footer.amazonStore] : undefined,
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-IN",
    publisher: { "@id": organizationId },
  };

  const itemList = {
    "@type": "ItemList",
    "@id": `${SITE_URL}/#range`,
    name: "The range",
    url: `${SITE_URL}/#range`,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => {
      // Only the owner's own product photo, never stock (none is set yet).
      const photo = product.imageKey
        ? (images[product.imageKey as ImageKey] as ImageAsset | undefined)
        : undefined;
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          "@id": `${SITE_URL}/#product-${product.slug}`,
          name: product.name,
          description: product.tagline,
          image: photo ? absolute(photo.src) : undefined,
          material: product.material,
          // Inline, not an `@id` reference: Google's Rich Results Test does
          // not resolve references for Product.brand.
          brand: { "@type": "Brand", name: SITE_NAME },
          offers: product.variants.map((v) => ({
            "@type": "Offer",
            sku: v.asin,
            name: `${v.size} ${v.pack}`,
            price: v.priceInr,
            priceCurrency: "INR",
            url: v.amazonUrl,
          })),
        },
      };
    }),
  };

  return { "@context": "https://schema.org", "@graph": [organization, website, itemList] };
}

/** JSON-LD must not be able to close its own <script>: escape every "<". */
const jsonLd = JSON.stringify(structuredData()).replace(/</g, "\\u003c");

export default function HomePage() {
  const { brand, nav, collections, products, materials, priceNote } = content;

  const collectionImages = pick(collections.flatMap((c) => c.imageKeys));
  const productImages = pick(products.flatMap((p) => [p.imageKey, p.imageHoverKey]));
  const materialImages = pick(materials.map((m) => m.imageKey));
  const finderImages = pick(products.map((p) => p.imageKey));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SmoothScroll>
        <ScrollVelocityProvider>
          <ScrollProgress />
          <Cursor />
          <Preloader wordmark={brand.wordmark} line={brand.preloaderLine} />
          <Nav wordmark={brand.wordmark} menu={nav.menu} cta={nav.cta} />
          <SideIndex items={nav.index} />

          <main id="top" className="relative z-10 bg-paper mb-[var(--footer-h,0px)]">
            <Hero image={img("hero")} headline={brand.heroHeadline} sub={brand.heroSub} />
            <Collections intro={brand.introLine} collections={collections} images={collectionImages} />
            <ProductGrid products={products} images={productImages} priceNote={priceNote} />
            <Materials materials={materials} images={materialImages} />
            <Craft craft={content.craft} images={[img("product-01-alt"), img("product-01")]} />
            <SizeGuide rows={content.sizeGuide} />
            <Finder
              finder={content.finder}
              products={products}
              images={finderImages}
              priceNote={priceNote}
            />
            <Care items={content.care} />
          </main>

          <Footer footer={footer} image={img("footer-01")} wordmark={brand.wordmark} />
        </ScrollVelocityProvider>
      </SmoothScroll>
    </>
  );
}
