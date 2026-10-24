# GD Home Fabric — build contract

Single-page editorial site for a pillow brand, modelled on the motion language of
odysseeclinic.com.au/treatments but richer. Stack: Next 16 (app router), React 19,
Tailwind 4 (tokens in `app/globals.css`), `motion` (framer-motion v12 API, import from
`"motion/react"`), `lenis` for smooth scroll. TypeScript strict. Node is at
`/Users/rohit93/.local/opt/node/bin` (add to PATH); package manager is `pnpm`.

Everything is already installed. Do NOT add dependencies. Do NOT touch files you were
not assigned. Do NOT create stub versions of other agents' files.

## Look

- Background `bg-paper` (#faf7f2), text `text-ink` (#1c2230), body copy `text-ink-soft`.
- Preloader and soft panels use `bg-stone` (#b9afa6). Accent washes `bg-sand`.
- Display type: class `font-display` (Instrument Serif). Sizes: hero `text-[clamp(44px,7vw,112px)]`,
  section titles `text-[clamp(32px,4vw,56px)]`, card titles `text-[clamp(22px,2vw,28px)]`.
- Body: Hanken Grotesk 300, 15px, generous leading. Labels: class `label` (11px tracked caps).
- Hairlines: class `rule` or `border-hairline`. No drop shadows, no rounded corners > 2px,
  no gradients except image scrims. Photos get class `img-matte` on the wrapper.
- Horizontal gutter: `px-[var(--gutter)]`. Max content width 1440px, centred.
- Numbered indices render exactly like the reference: `(1).` in the `label` style.

## Motion language (all via `motion/react`, respect `useReducedMotion`)

- Easing: `[0.16, 1, 0.3, 1]` for reveals, `[0.65, 0, 0.35, 1]` for fades/blur.
- Reveals: `initial={{opacity:0, y:24}} whileInView={{opacity:1, y:0}} viewport={{once:true, margin:"-10%"}} transition={{duration:0.9, ease}}`.
  Stagger children 0.06–0.08s. Text lines may reveal with a `clip-path: inset(0 0 100% 0)` → `inset(0 0 0 0)` wipe.
- Scroll-linked effects use `useScroll({target, offset})` + `useTransform` + `useSpring` (stiffness 120, damping 30).
- Hero: image `filter: blur(28px)→blur(0)` and `scale 1.12→1` over the first 60% of the viewport scroll; headline fades up on `gdhf:ready`.
- Collections: text column fades to 0.25 opacity and shifts up 24px once the section's bottom passes 40% of the viewport; images translate at 0.85× scroll (parallax) and reveal with a clip-path wipe.
- Hover: images scale 1.03 over 1.2s; links use class `link-line`.
- Preloader: full-screen `bg-stone`, wordmark + line bottom-left (like the reference), holds ≥1.4s, then `y: 0 → -100%` over 1.1s with ease `[0.76, 0, 0.24, 1]`. While visible, `document.documentElement.classList.add("lenis-stopped")`. On exit it removes that class, sets `document.documentElement.dataset.ready = "true"` and dispatches `window.dispatchEvent(new CustomEvent("gdhf:ready"))`. If `sessionStorage.gdhf_seen` is set, hold only 0.6s.

## Files and owners

Data (consumed via props — components never import `lib/content` or `lib/images` directly):

- `lib/types.ts` — DONE. Read it first.
- `lib/content.ts` — COPY agent. `export const content: SiteContent`.
- `lib/images.ts` — IMAGE agent. `export const images: Record<ImageKey, ImageAsset>`,
  `export type ImageKey = ...` (string literal union of the keys below), and
  `export const img = (k: ImageKey) => images[k]`.

Required image keys (all must exist as `/public/images/<key>.jpg`, ≤1600px long edge, JPEG):

```
hero
collection-01-a collection-01-b collection-02-a collection-02-b collection-03-a collection-03-b
collection-04-a collection-04-b collection-05-a collection-05-b collection-06-a collection-06-b
product-01 … product-10
product-01-alt product-02-alt product-03-alt product-04-alt product-05-alt
materials-velvet materials-linen materials-cotton materials-silk
craft-01 craft-02 craft-03
footer-01
```

Components (`components/*.tsx`, each a single default export, `"use client"` where hooks are used).
Props are exact; import types from `@/lib/types`.

| File | Props | Notes |
|---|---|---|
| `SmoothScroll.tsx` | `{children}` | Lenis on window, `lerp: 0.08`, raf loop; starts stopped if `html` lacks `data-ready`, resumes on `gdhf:ready`. Cleans up. |
| `Preloader.tsx` | `{wordmark: string; line: string}` | Spec above. Renders nothing after exit (AnimatePresence). |
| `Nav.tsx` | `{wordmark: string; menu: {href,label}[]; cta: {label,href}}` | Fixed top bar, `mix-blend-difference text-white` so it inverts over photos. MENU opens a full-screen `bg-paper` overlay with staggered serif links + contact line; Escape/overlay-click closes; body gets `data-lenis-prevent`. |
| `Hero.tsx` | `{image: ImageAsset; headline: string; sub: string}` | 100svh. `next/image` `fill` `priority`. Blur/scale per spec. Headline bottom-left, sub right. Tiny “scroll” label bottom-centre that fades out on scroll. |
| `SideIndex.tsx` | `{items: {id,label}[]}` | Fixed bottom-left (hidden `<lg`), one line per section, active item gets a filled dot (`●`) and full opacity, others 0.5. Active via IntersectionObserver on `#id` sections (`rootMargin: "-45% 0px -45% 0px"`). Click → `lenis`-friendly `scrollIntoView`. |
| `Collections.tsx` | `{intro: string; collections: Collection[]; images: Record<string, ImageAsset>}` | `<section id="collection">`. Intro line like “Guided by science…” then one `CollectionSection` per item (define `CollectionSection` inside this file). Layout ≥lg: 12-col grid, text in cols 2–5 (`sticky top-28`), images in cols 7–12 stacked with parallax; `<lg` stacked. |
| `ProductGrid.tsx` | `{products: Product[]; images: Record<string, ImageAsset>}` | `<section id="range">`. Heading “The range”. 2-col on mobile, 4-col ≥lg. Card: image (hover → `imageHoverKey` crossfade if present), name, tagline, “from ₹x,xxx” formatted with `toLocaleString("en-IN")`, small pill per `bestFor`. Stagger reveal. |
| `Materials.tsx` | `{materials: Material[]; images: Record<string, ImageAsset>}` | `<section id="materials">`. Infinite horizontal marquee (two copies, `x: 0 → -50%` linear 40s, pauses on hover) of 3:4 swatch cards with name + note. |
| `Craft.tsx` | `{craft: SiteContent["craft"]; images: ImageAsset[]}` | `<section id="craft">`. Alternating image/text bands; headline reveals word by word; stats row with count-up from 0 on view (`animate` from motion). |
| `SizeGuide.tsx` | `{rows: SizeRow[]}` | `<section id="sizes">`. Table with hover row highlight; left of table an SVG outline that morphs (animate width/height) to the hovered size's proportions. |
| `Finder.tsx` | `{finder: SiteContent["finder"]; products: Product[]; images: Record<string, ImageAsset>}` | `<section id="finder">`. Two rows of toggle chips (position, firmness) → recommendation card with `AnimatePresence` crossfade using `recommend["<position>-<firmness>"]`; fall back to first product. |
| `Care.tsx` | `{items: Faq[]}` | `<section id="care">`. Accordion; only one open; `height: auto` animation via motion; `+`/`×` rotates. |
| `Footer.tsx` | `{footer: SiteContent["footer"]; image: ImageAsset; wordmark: string}` | `<footer>`. Big serif enquiry line, WhatsApp/email/Amazon links (`link-line`), address, “Image credits” link to `/credits`, back-to-top button that calls `window.scrollTo({top:0, behavior:"smooth"})`, giant faded wordmark at the very bottom (`text-[18vw]`, `text-ink/5`). |

Pages (INTEGRATOR agent): `app/page.tsx` wires everything in this order —
SmoothScroll › Preloader, Nav, SideIndex, main[Hero, Collections, ProductGrid, Materials, Craft, SizeGuide, Finder, Care], Footer.
`app/credits/page.tsx` lists every image credit from `lib/images.ts`.

## Quality bar

- `pnpm typecheck` and `pnpm build` must pass with zero errors.
- No console errors or hydration warnings. No horizontal overflow at 375px.
- Every image has real `alt`. Buttons have labels. Headings in order.
- Works with JS-disabled motion (reduced motion): content visible, no permanent `opacity:0`.
- `next/image` everywhere with `sizes` set; `fill` images need a positioned parent.
