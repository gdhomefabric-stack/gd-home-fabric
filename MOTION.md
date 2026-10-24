# GD Home Fabric — motion system (phase 2)

Goal: the site should *feel* like a top-tier Awwwards editorial build. Every element arrives
with intent, scrolling has weight, hover has response, nothing pops. Reference feel:
odysseeclinic.com.au (calm, slow, blurred hero) + the standard luxury kit (Lenis, masked
text, clip-path image reveals, velocity skew, magnetic buttons, custom cursor, curtain footer).

Shared primitives live in `lib/motion.tsx` — USE THEM instead of re-implementing:

| Export | What it does |
|---|---|
| `EASE_OUT_EXPO`, `EASE_IN_OUT`, `EASE_SOFT`, `SPRING_SOFT`, `VIEWPORT` | the only easings/springs we use |
| `useReady()` | true once the preloader has fired `gdhf:ready` (or `data-ready` was already set) |
| `useScrollVelocity()` | spring-smoothed window scroll velocity (px/s) as a MotionValue |
| `<ScrollVelocityProvider>` / `useSharedScrollVelocity()` | one velocity spring for the whole page (mounted once in `app/page.tsx`); `ImageReveal` and Materials read it from here instead of each owning a spring |
| `<TextReveal text as id className delay stagger trigger>` | word-mask reveal (each word slides up from `y:110%` inside an overflow-hidden span). The words are the accessible text (no duplicate sr-only copy, except `byLetter`). `trigger="view"` (default), `"ready"` (hero), `"immediate"` |
| `<Reveal delay y blur trigger>` | fade-up with a blur-in (`blur(8px) → 0`) for paragraphs, lists, cards. `blur={false}` around anything that is itself clip-wiping (photo cards) |
| `<ImageReveal parallax skew scaleFrom delay clipFrom className>` | clip-path wipe (`inset(0 0 100% 0) → 0`; `clipFrom="bottom"` wipes upward) + inner scale `1.25 → 1` + scroll parallax ±8% + scroll-velocity skewY. Put a `next/image fill` inside. |
| `<Magnetic strength>` | child follows the pointer with a spring, snaps back on leave |
| `<Counter value>` | counts `"2,400+"` up from 0 when in view, keeps prefix/suffix and grouping |
| `cn(...)` | class joiner |

## Timing & easing rules

- Reveals: `duration 1.0–1.3s`, `EASE_OUT_EXPO`. Text stagger `0.045s/word`. Card stagger `0.07s`.
- Clip wipes: `EASE_IN_OUT` 1.3s. Hover scale: 1.04 over 1.2s `EASE_OUT_EXPO`.
- Springs for pointer-following things (cursor, magnetic): stiffness 150–250, damping 15–30.
- Scroll-linked values always pass through `useSpring(..., SPRING_SOFT)` so they glide.
- Nothing animates `width/height/top/left` except the size-guide SVG. Use transform/opacity/clip-path/filter.
- `useReducedMotion()` ⇒ every primitive renders the final state immediately. Never leave content invisible.

## What each piece must do after phase 2

**Global (new files)**
- `components/Cursor.tsx` — custom cursor: 8px `bg-ink` dot that tracks instantly + 40px ring that lags on a spring; `mix-blend-difference` so it inverts over photos. Over `[data-cursor="view"]` elements the ring grows to 88px, fills `bg-paper`, shows the label "View" (serif); over links/buttons (`a, button, [data-cursor="link"]`) it shrinks to 24px; over `[data-cursor="dot"]` (small labelled controls: finder chips, care toggles) only the dot remains. Pointer down squeezes the ring (0.8) and swells the dot (1.6). Hidden entirely when `(pointer: coarse)` or reduced motion. Must be mounted once in `app/page.tsx` (and `/credits`).
- `components/ScrollProgress.tsx` — 1px `bg-ink` hairline fixed at the very top, `scaleX` = `useSpring(scrollYProgress)`, `transform-origin: left`.
- `app/template.tsx` — route transition: a `bg-stone` panel covers the page on mount and slides up (`y: 0 → -100%`, 0.9s `EASE_IN_OUT`) so moving to `/credits` and back feels like one site. Skip the panel on the very first load if the preloader is present (`document.documentElement.dataset.ready !== "true"` at mount ⇒ render nothing).

**Preloader** — wordmark letters stagger in (`TextReveal trigger="immediate"` per letter is fine), a small counter `000 → 100` bottom-right in `label` style, then the panel slides up and the hero (already underneath) finishes its scale `1.12 → 1`. Hold ≥1.6s first visit, 0.6s repeat.

**Nav** — hides on scroll-down (`y: -100%`) and returns on scroll-up using `useScroll` + velocity sign; adds a `backdrop-blur` + `bg-paper/70` once past the hero. Wordmark and `Enquire` are `Magnetic`. Menu overlay: links `TextReveal` staggered; a thin vertical hairline draws in; closing reverses.

**Hero** — keep the blur-sharpen. Headline via `TextReveal trigger="ready"` with `0.06s` stagger; sub via `Reveal trigger="ready" delay 0.5`; the "scroll" indicator's 1px line loops `scaleY 0 → 1` from top (2s, repeat). Image inner scale `1.12 → 1` after ready.

**SideIndex** — the dot slides between rows with `layoutId="index-dot"`; rows get `Reveal` on first appearance; the whole index fades out over the footer (`#enquire` in view).

**Collections** — titles `TextReveal`, body/list `Reveal` with `0.1s` delay steps; photo column uses `ImageReveal parallax={0.1}` (a) and `0.06` (b), skew on; the `(1).` index and the "N pillows" label slide in from the left. Passed-section fade stays. Each image has `data-cursor="view"`.

**ProductGrid** — cards `Reveal` stagger 0.07; image inside `ImageReveal skew={false} parallax={0.04}`; hover: inner image scale 1.04 + crossfade to hover image + the name underlines (`link-line`); `data-cursor="view"`. Price slides up from under a mask on hover (`y: 100% → 0`).

**Materials** — marquee speed reacts to the shared scroll velocity: base `x` velocity 60px/s, add `|scrollVelocity| * 0.25`, direction follows the scroll direction (use `useAnimationFrame` and a MotionValue, wrap modulo). Swatches skew with velocity; hover (or a finger on the track) pauses the base drift. Touch devices keep the marquee (`touch-action: pan-y`); only reduced motion gets the static strip.

**Craft** — title word reveal (keep), paragraphs `Reveal`, images `ImageReveal parallax={0.12}` (alternate bands), stats `Counter`.

**SizeGuide** — rows `Reveal` stagger; the SVG rect animates with `SPRING_SOFT`; the dimension labels (e.g. "17 × 27") crossfade with `AnimatePresence mode="wait"`.

**Finder** — the selected chip highlight is a sliding pill (`layoutId="finder-pill-position"` / `"finder-pill-firmness"`); recommendation card crossfades (keep) with its image `ImageReveal`; the price counts up with `Counter`.

**Care** — accordion stays; the `+` rotates 45° on open; answer text `Reveal` once open; row hover shifts the question right 6px.

**Footer** — curtain reveal: `<main>` gets `relative z-10 bg-paper mb-[var(--footer-h)]` and the footer is `fixed bottom-0 -z-0 h-[var(--footer-h)]` (measure with a ResizeObserver and set the CSS var on `<html>`), so the footer is uncovered as you scroll to the end. The photo strip wipes from the bottom (`clipFrom="bottom"`, no skew, parallax driven by the curtain's progress, since a fixed box has no page position). Enquiry line `TextReveal`, giant wordmark rises with `y: 30% → 0` + `opacity 0 → 0.06` on view, links `Magnetic` (0.15 on the long serif contact lines).

## Verification

`node tools/shot.mjs` screenshots after an 1800ms settle (`--settle=` to change it), which outlasts the 1.3s clip wipe plus the card stagger, so scroll-triggered reveals must have fired at every captured position: if a region is blank in a capture, the trigger is wrong (usually `useInView` on a zero-height wrapper, `once` + margin too strict, or a `clip-path` initial state on an element whose parent never intersects). Fix the trigger, do not loosen the spec.
