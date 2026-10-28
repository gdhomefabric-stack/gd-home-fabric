# GD Home Fabric — phase 3: editorial photography

Owner, 28 Oct 2026: "they have more larger images in background and much better things,
give it more aesthetic touch". Reference frames: `.shots/reference/ref-manifesto.jpg`,
`ref-sections.jpg`, `ref-sections-2.jpg` (odysseeclinic.com.au/treatments at 1440 px).

What the reference does that we do not:

1. A full-viewport **manifesto band** right after the hero: dark, blurred, full-bleed photo with a
   large serif paragraph on the right half whose words brighten as you scroll.
2. **Photos dominate.** Beside a narrow sticky text column, photos run **edge to edge to the right
   viewport edge**, stacked back to back (8 px gaps), each nearly a full viewport tall.
3. Almost no cream between photos; cream is for the text column only.

Keep everything in CONTRACT.md / MOTION.md / FACTS.md. FACTS.md still governs every word:
new copy may only restate facts already there.

## Image keys (IMAGE agent sources these; components reference them)

All ≤ 2400 px long edge, JPEG q 82, Unsplash free licence only (`premium:false`, `plus:false`),
no logos, no text, no babies, calm neutral palette. Themes:

| key | orientation | subject |
|---|---|---|
| `manifesto` | landscape 2400 | dim bedroom or white pillow/linen in low, soft light; will be darkened and blurred |
| `band-01` | landscape 2400 | bed in morning light, white pillows, wide |
| `band-02` | landscape 2400 | stacked or paired white pillows, wide and quiet |
| `cover-01` | portrait 1800 | a plain white pillowcase / empty cotton pillow cover, or folded white cotton |
| `about-01` | portrait 1800 | white cotton texture or a made bed detail |
| `footer-02` | landscape 2400 | serene bedroom, window light |
| `collection-<index>-a/b/c` | a: portrait, b: portrait, c: landscape | one set per collection in `lib/content.ts`, matching that collection's subject (read its title and body); a and b must exist, c optional |

Keep the existing keys that are still used (`hero`, `collection-01-a/b`, `product-01`, `product-01-alt`,
`materials-*`, `footer-01`). Unused JPEGs may stay on disk.

## Components

**`components/Manifesto.tsx`** (new) — `{image: ImageAsset; eyebrow: string; text: string}`.
`min-h-[100svh]` full-bleed. Photo `fill` + `object-cover`, `filter: brightness(.55) blur(10px)`,
scale 1.1 (no edge bleed), a bottom-to-top scrim. Eyebrow bottom-left in `label text-paper/80`.
Paragraph in cols 7–12 (≥lg), `font-display text-paper text-[clamp(28px,3.3vw,50px)] leading-[1.15]`,
split into words; each word's opacity goes 0.25 → 1 as `useScroll({target, offset:["start 80%","end 60%"]})`
progress passes its index (useTransform per word, no spring). Reduced motion: all words at 1.

**`components/PhotoBand.tsx`** (new) — `{image: ImageAsset; line: string; eyebrow?: string; height?: "70svh"|"85svh"}`.
Full-bleed (`w-screen` via `relative left-1/2 -translate-x-1/2`, inside an `overflow-x-clip` wrapper),
photo with parallax (inner `-inset-y-[10%]`, y ±8 %, scale 1.08→1 on reveal), scrim at the bottom,
one serif line bottom-left in paper, `text-[clamp(28px,4vw,64px)]`, TextReveal. `sizes="100vw"`, lazy.

**`components/Collections.tsx`** — layout change only. ≥lg: text in cols 2–5 (`sticky top-28`),
photo column cols 7–12 **and bleeding to the right viewport edge** (`lg:mr-[calc(var(--gutter)*-1)]`,
section wrapper `overflow-x-clip`). Photos stacked with `gap-2`, each box `h-[min(92svh,1100px)]`,
`object-cover`, ImageReveal parallax 0.08 and skew; 2–3 photos per collection (`imageKeys` may have
3 entries). `<lg`: each photo full-bleed (`-mx-[var(--gutter)]`), `h-[70svh]`. Keep the index,
title, body, list, passed-section fade and cursor="view".

**`components/ProductGrid.tsx`** — cards get photos back: `imageKey` on the pillow = `product-01`
(hover `product-01-alt`), on the cover = `cover-01`. Card photo `aspect-[4/5]` on ≥lg two columns
(each ≈ 46 vw), ImageReveal; the drawn `ProductPlate` becomes a small inset chip bottom-left
(≈ 140 px wide, paper background) so the sizes stay visible. Under the grid one line in `label`:
"Representative photographs. The pillow is plain white." plus the existing price note.

**`components/Materials.tsx`** — swatches `w-[clamp(300px,34vw,480px)] aspect-[3/4]`, title
`text-[clamp(40px,5vw,72px)]`, section `py-[clamp(96px,12vw,200px)]`.

**`components/Craft.tsx` (About)** — kill the empty cream: ≥lg two columns, text cols 2–5 sticky,
one tall edge-bleed photo cols 7–12 (`about-01`, `h-[min(92svh,1100px)]`, bleed right like
Collections); stats row under the text. No second photo band inside (PhotoBand handles that).

**`components/Footer.tsx`** — strip becomes `footer-02`, full-bleed, `h-[70svh]`, parallax.

**`components/Hero.tsx`** — headline `text-[clamp(56px,8.5vw,136px)]`, sub smaller
(`max-w-[32ch]`) bottom-right; nothing else.

**`app/page.tsx`** (integrator) — order: Hero › Manifesto › Collections › ProductGrid › PhotoBand
(band-01, "Vacuum packed. Full loft in 24 to 48 hours.") › Materials › Craft › PhotoBand
(band-02, "Three sizes. Standard, Queen and King.") › SizeGuide › Finder › Care; Footer.
Section rhythm: every section `pt-[clamp(96px,12vw,200px)]` except bands.

Manifesto text (facts only, ≤ 45 words), e.g.: "A pillow is a simple thing, done carefully.
Goose feather, held in a 500 thread count pure cotton shell that keeps the feather in and
lets the air through. Three sizes. Sold on Amazon.in, where GD Home Fabric has been for
six years and more." Eyebrow: "GD Home Fabric".

## Bar

- `pnpm typecheck` + `pnpm exec next build --webpack` clean; shot.mjs desktop/mobile: logs [],
  overflowing [] (bleeds must not create horizontal scroll), imagesBroken [].
- Only `hero` has `priority`; bands and column photos lazy with correct `sizes`.
- Reduced motion shows every photo and word.
- Side-by-side with the reference frames at 1440: photo area per viewport ≥ the reference's.
