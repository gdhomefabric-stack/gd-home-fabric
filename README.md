# GD Home Fabric

Single-page editorial website for GD Home Fabric, a New Delhi pillow brand
(goose-feather and down, microfibre, memory foam, kapok, bolsters and cushion
fillers) sold through Amazon.in and by direct enquiry. The page is built as a
calm, slow, Awwwards-style scroll: blurred hero, clip-path photo reveals,
smooth scrolling, a curtain footer. There is one route (`/`) plus `/credits`,
which lists the photographers behind every picture.

The two design documents are the source of truth:

- `CONTRACT.md` — look, tokens, component props and file ownership.
- `MOTION.md` — the motion system (easings, primitives in `lib/motion.tsx`,
  what every section must do).

## Stack

- Next 16 (app router, server components) on React 19
- Tailwind 4, tokens in `app/globals.css`
- `motion` (framer-motion v12 API, imported from `motion/react`)
- `lenis` for smooth scrolling
- TypeScript strict, `pnpm`, Node 24+

Fonts (Instrument Serif, Hanken Grotesk) load from the Google Fonts stylesheet
linked in `app/layout.tsx`, not `next/font`, so the build does not need to reach
Google.

## Run it

Node lives outside the default PATH on the build Mac:

```sh
export PATH="$HOME/.local/opt/node/bin:$PATH"
pnpm install
pnpm dev          # http://localhost:3200
pnpm build        # production build
pnpm start        # serve the production build on :3200
pnpm typecheck    # tsc --noEmit (also aliased as `pnpm lint`)
pnpm check        # typecheck + build, what CI should run
```

`node tools/shot.mjs <url> <outDir> [--mobile]` takes screenshots at several
scroll positions and reports console errors and horizontal overflow;
`node tools/interact.mjs <url> <outDir>` captures the interactive states (menu,
hover, finder, accordion, curtain footer). Both reuse the Playwright/Chromium
install documented in the header of `tools/shot.mjs` (not a dependency of this
project), and write into `.shots/`, which is gitignored. Point them at a
production build on a spare port (`pnpm build && pnpm start -- --port 3300`)
rather than the dev server on :3200. `tools/dev.sh` is the dev-server entry
used by the desktop preview launcher (webpack mode, see its header).

## Where things live

| Path | What |
|---|---|
| `lib/content.ts` | Every word on the site: brand, nav, collections, the ten products and prices, materials, craft, size guide, finder, care FAQ, footer and contact block |
| `lib/images.ts` | Photo manifest: `/public/images/<key>.jpg` with size, alt and credit |
| `lib/site.ts` | Site URL, name, description, keywords and the Open Graph image used by `<head>`, robots, sitemap and JSON-LD |
| `lib/motion.tsx` | Shared motion primitives (`TextReveal`, `Reveal`, `ImageReveal`, `Magnetic`, `Counter`) |
| `lib/scroll.ts` | One scroll API for Lenis and native scrolling (`scrollToTarget`, `replaceHash`), plus the `gdhf:scroll-start` event the nav listens for |
| `lib/media.ts` | `useMediaQuery`, hydration-safe (`false` on the server and during hydration) |
| `lib/reduced-motion.ts` | `useReducedMotionSafe`, the hydration-safe reduced-motion hook every component branches on |
| `components/` | One file per section, props fixed by `CONTRACT.md` |
| `app/page.tsx` | Wires the sections together and emits the JSON-LD |
| `app/layout.tsx` | Fonts, metadata, Open Graph, Twitter card, canonical, security headers live in `next.config.ts` |
| `app/template.tsx` | Route transition: the stone panel that wipes between `/` and `/credits` |
| `app/not-found.tsx` | The 404 |
| `app/robots.ts`, `app/sitemap.ts` | Generated `/robots.txt` and `/sitemap.xml` from `SITE_URL` |
| `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` | Favicons (a "GD" monogram): SVG for modern browsers, ICO for Safari, PNG for the iOS home screen and the JSON-LD logo |
| `public/og.jpg` | 1200×630 social preview, cropped from the hero photo |
| `tools/shot.mjs`, `tools/interact.mjs`, `tools/dev.sh` | Headless screenshot / interaction checks and the preview-launcher dev script (see "Run it") |

## Before launch

1. **Contact details.** Edit the `CONTACT` block at the top of
   `lib/content.ts`: `whatsapp` (currently a placeholder, so the footer shows
   no WhatsApp row and the custom-size FAQ says "by email"), `email`, `address`
   (one line; currently a placeholder, so the footer and structured data fall
   back to "New Delhi NCR, India") and `amazonStore` (point it at the real
   storefront URL rather than a search; a search URL is left out of the
   structured data). Placeholders are never rendered or sent to the browser,
   but the site is not finished until these are real.
2. **Site URL.** Set `NEXT_PUBLIC_SITE_URL` to the live origin (no trailing
   slash) so canonical links, Open Graph image URLs, `robots.txt` and
   `sitemap.xml` point at the right domain. Copy `.env.example` to `.env.local`
   for local use; the default is `https://gdhomefabric.in`.
3. **Photography.** The pictures are Unsplash photographs standing in for
   product shots. Replace them over time with your own: drop a JPEG (long edge
   ≤1600px) at `public/images/<key>.jpg`, update the `width`, `height`, `alt`
   and `credit` for that key in `lib/images.ts`, and regenerate `public/og.jpg`
   if you replace `hero.jpg` (1200×630, cropped from the new hero).
4. **Credits page.** `/credits` is generated from `lib/images.ts`. Keep it
   while any Unsplash photo remains (the licence does not require it, but it
   is good form); once every picture is your own, it can be removed along with
   the "Credits" entries in the nav menu and footer in `lib/content.ts`.
5. **Prices and copy.** Prices in `lib/content.ts` are whole rupees and appear
   on the cards, in the finder and in the structured data. Check them against
   the live Amazon listings before each push.
6. **Dependencies.** Before each deploy run `pnpm up next@latest` and
   `pnpm audit`, then `pnpm check`. Next ships security fixes as patch
   releases and `pnpm build` warns when the installed version has a known
   advisory; the lockfile pins the exact version Vercel installs, so the
   upgrade has to be committed.
7. Run `pnpm check` and open `/`, `/credits` and a bad URL (the 404) once on a
   phone-sized viewport.

## Deploy (Vercel)

0. The repository is initialised (`git init` has been run, branch `main`) but
   has no commit yet. Once:
   `git add -A && git commit -m "GD Home Fabric site"`
   (`.env*.local`, `.vercel`, `.next` and `.shots` are gitignored).
1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project**, import the repository. Framework preset:
   **Next.js** (detected automatically); build command `pnpm build`, output
   handled by Next. Node 24 or newer is required (`engines` in `package.json`
   is a floor, `>=24`, not a pin).
3. Under **Environment Variables** add `NEXT_PUBLIC_SITE_URL` =
   `https://<your-domain>` for Production (and the preview URL for Preview if
   you want correct share cards on previews).
4. Deploy, then **Settings → Domains**: add the custom domain (for example
   `gdhomefabric.in` and `www.gdhomefabric.in`, with `www` redirecting to the
   apex) and follow the DNS instructions at your registrar. Vercel issues the
   TLS certificate automatically.
5. After the first production deploy, request indexing in Google Search Console
   and submit `https://<your-domain>/sitemap.xml`.

Any other Node host works the same way: `pnpm install`, `pnpm build`,
`pnpm start` behind a reverse proxy, with `NEXT_PUBLIC_SITE_URL` set at build
time (it is inlined into the client bundle, so a change needs a rebuild).
