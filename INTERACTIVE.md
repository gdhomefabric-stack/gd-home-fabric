# GD Home Fabric — phase 4: interaction, type, motion

Owner, 28 Oct 2026: "make the images and all more interactive and bigger, change the text
style and design, more motion". Builds on AESTHETIC.md (phase 3). FACTS.md still governs
every word; MOTION.md primitives stay the base.

## 1. Type

- Display face changes from Instrument Serif to **Cormorant Garamond** (self-hosted in
  `public/fonts`, weights 300 + 400, italic 400; `font-display: swap`). Update
  `--font-display` in `app/globals.css` and the `@font-face` rules in `public/fonts/fonts.css`;
  preload the latin 400 file in `app/layout.tsx` instead of Instrument Serif.
- Headlines get larger and lighter: hero `text-[clamp(64px,10vw,168px)] font-light leading-[0.95]
  tracking-[-0.02em]`; section titles `text-[clamp(48px,6.5vw,104px)] font-light`; card titles
  `text-[clamp(28px,2.6vw,40px)]`.
- **Italic accents**: one word per headline set in italic (`<em>` in a `font-light italic`
  span). The content author marks it with `*word*` in `lib/content.ts` strings; `TextReveal`
  gets a `markup` option that turns `*…*` into `<em>`. Hero: "Goose feather, in *pure* cotton."
- Section indices become oversized outlined numerals: "01" at `text-[clamp(96px,14vw,220px)]`
  with `-webkit-text-stroke: 1px currentColor; color: transparent`, sitting behind/above the
  section title (`SectionIndex` component, opacity 0.5, parallax y ±20 px).
- Labels stay Hanken Grotesk, tracking 0.16em.

## 2. Images: bigger and interactive

- **Lightbox** (`components/Lightbox.tsx`, new): every column photo, band and product photo is
  a button (`data-cursor="view"`) that opens a full-screen viewer: dark paper (`bg-ink/95`),
  photo `object-contain` up to 92vh, caption (alt), `←/→` between the photos of that section,
  Escape / click outside / close button; body scroll locked (Lenis stop); `AnimatePresence`
  scale 0.96→1 + fade; focus trapped and returned.
- **Cursor-follow parallax** on photos (`useMotionValue` from pointer position, inner image
  translates ±12 px and the card tilts ±2° via `rotateX/rotateY` with `SPRING_SOFT`); on
  touch devices it is off.
- **Pinned zoom band**: the two `PhotoBand`s pin for 150 vh (`sticky top-0` inside a
  `h-[250svh]` wrapper); while pinned the image scales 1.35→1 and the line slides up from
  below the fold; after the pin it releases. Reduced motion: no pin, static.
- **Hero**: slow Ken Burns (scale 1→1.08 over 20 s, `repeat Infinity, repeatType "mirror"`)
  on top of the blur-sharpen; after `gdhf:ready` the headline's letters rise one by one
  (`TextReveal byLetter`, 0.02 s stagger).
- **Collections**: photo column boxes `h-[min(100svh,1200px)]`, and the first photo of each
  section opens at a 1.06 scale and settles to 1 while in view (scroll-linked `useTransform`).
- **Materials**: swatches become a **drag-scrub gallery** (`drag="x"` with `dragConstraints`,
  inertia, cursor "grab"; the velocity marquee keeps running underneath at 0.4× when idle).
  Swatch size `w-[clamp(340px,40vw,560px)] aspect-[3/4]`.
- **Product cards**: hover reveals a second photo with a wipe from the left (`clip-path`),
  the size plate chip slides in, the price counts up with `Counter` once (keep static text
  for SSR).

## 3. More motion

- **Background colour shift**: `<main>` background animates with scroll (`useScroll` +
  `useTransform` → `backgroundColor`) from paper to `#efe9df` across the Range, and to
  `#1c2230` (ink) with paper text over the About section, back to paper after. Text colour
  flips with it (`data-theme="dark"` on that section drives `text-paper`).
- **Word ticker** between Range and Materials: a slow marquee line in display italic,
  `text-[clamp(40px,6vw,96px)]`, repeating the FACTS phrases "Goose feather · 500 thread count
  cotton · Standard · Queen · King · Vacuum packed ·".
- **Line draw**: every `.rule` hairline draws from left on view (`scaleX 0→1`, 1.2 s).
- **Side index**: active label morphs size (1 → 1.08) and the dot pulses once on change.
- **Finder result**: the chosen outline in `ProductPlate` strokes itself (`pathLength 0→1`).
- **Footer**: the giant wordmark letters rise individually; the enquiry line's words fade in.
- **Scroll progress**: stays. **Cursor**: ring grows to 120 px with "Open" on lightbox
  triggers, "Drag" over the materials gallery.
- Easing/durations per MOTION.md; everything degrades under reduced motion with content visible.

## Bar

Same as before: typecheck + `next build --webpack` clean; shot.mjs desktop/mobile logs [],
overflowing [], imagesBroken []; interact.mjs: menu closes on Escape, lightbox opens from a
column photo and closes on Escape; Lighthouse-style sanity: no image over 600 KB, hero only
priority. Every new word traceable to FACTS.md.
