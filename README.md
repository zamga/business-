# BERGWEISS — corporate website

The website of BERGWEISS, an M&A advisory firm for business owners, family businesses, acquirers, family offices and private equity investors.

The concept, **the architecture of a transaction**, treats the site as a set of construction drawings, and the BERGWEISS mark as a structure built from them. Strategy, valuation, counterparties, terms and execution are the five members of a braced frame. The site shows that frame twice: drawn, in the scroll-driven assembly, and built, as a physical model rendered in 3D. The model stands live in the home hero, where the pointer moves the sun, and it appears in every photograph and film on the site. Design rationale, tokens and motion specifications are in [`docs/DESIGN.md`](docs/DESIGN.md).

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | [Astro 7](https://astro.build), static output | Zero JavaScript by default, content collections with schemas, first-class font pipeline. |
| Language | TypeScript (`astro/tsconfigs/strictest`) | The content model is typed end to end; `npm run check` must stay at zero errors. |
| Styling | Plain CSS with cascade layers and design tokens | A bespoke system; no framework classes to fight. |
| Motion | CSS transitions and keyframes, plus small inline TypeScript modules (intro, cursor, reveals, gallery, film) | Transform, opacity and clip-path only; no animation library; scrolling is always native. |
| 3D | [three.js](https://threejs.org) r186, loaded on demand | Only on landscape screens with a mouse and hardware-accelerated WebGL 2, after the poster has painted (140 KB gzipped). Phones, software renderers, reduced motion and Save-Data never run it. |
| Imagery | Model photography and film rendered in-house from the same 3D scene | Headless Chromium renders the stills and film frames; `sharp` writes the masters; Astro's image pipeline serves AVIF/WebP at responsive sizes; `ffmpeg` encodes MP4 (H.264) and WebM (VP9). |
| Page transitions | Cross-document View Transitions (`@view-transition`) | A redline brace wipes across the screen; no router script; other browsers navigate normally. |
| Navigation speed | Speculation Rules (`prerender`, moderate eagerness) | Near-instant page changes in Chromium; ignored elsewhere. |
| Fonts | Newsreader + Archivo (SIL OFL 1.1), self-hosted via the Astro Fonts API | Axis-trimmed variable fonts: ~120 KB in total, with metric-matched fallbacks to prevent layout shift. |
| Hosting | Any static host | `_headers` is generated for Netlify and Cloudflare Pages. |

## Getting started

Requires Node.js 22.12 or later (`.nvmrc`).

```sh
npm ci
npm run dev        # http://localhost:4321
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the build locally |
| `npm run check` | Type-check Astro and TypeScript files |
| `npm test` | Playwright: accessibility (axe, WCAG 2.2 AA), signature interaction, enquiry form, navigation |
| `npm run test:lighthouse` | Lighthouse CI budgets against `dist/` |
| `npm run assets:fonts` | Rebuild trimmed font files (Python + fontTools) |
| `npm run assets:brand` | Rebuild mark, wordmark, lockup and favicon SVGs |
| `npm run assets:images` | Rebuild favicons, logo PNG and Open Graph images |
| `npm run media:render` | Render the model photography and films and write them into the site (see below) |
| `npm run media:process` | Convert an existing render folder into site media |

Before running the tests locally, run `npx playwright install chromium`, or set `PW_CHROMIUM_PATH` to an existing Chromium.

## Model photography and film

Every image and film on the site is rendered from one 3D model of the mark, so the imagery is the brand itself rather than stock.

| What | Where |
| --- | --- |
| The model: members, steel joints, concrete, assembly | `src/three/structure.ts` |
| The studio: paper floor matched to the page colour, sun, shift lens, compositions, camera presets | `src/three/stage.ts` |
| Offline rendering: soft shadows, sky occlusion, depth of field | `src/three/accumulate.ts` |
| The live hero (pointer moves the sun) | `src/three/hero.ts`, loaded by `src/scripts/hero.ts` |
| Shot list for stills and films | `scripts/render/render-media.mjs` |
| Masters used by the site | `src/assets/models/*.webp`, `public/media/*.mp4` and `*.webm` |
| Plate references, titles and alt text | `src/data/models.ts` |

`npm run media:render` re-renders everything (about ten minutes with software WebGL); pass `only=night stills` or `films` to narrow it. Renders are deterministic: an unchanged scene produces identical files. After changing the hero's camera or light, re-render `hero-wide`, `hero-tall` and `assembly-tall` together so the poster, the film's last frame and the live scene still match.

Each mandate chooses its model photograph in its YAML file (`model.key`: `plan`, `field`, `range`, `options` or `layers`) and carries its own `model.caption`.

## Configuration

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SITE_URL` | Production | Canonical origin for canonical URLs, Open Graph, sitemap and `robots.txt`. If it is missing, the build counts as a **preview**: every page gets `noindex` and `robots.txt` disallows crawling. |
| `PUBLIC_ENQUIRY_ENDPOINT` | To receive enquiries | URL that accepts the form as `multipart/form-data` and returns `2xx`. Examples: a Formspree, Basin or Getform endpoint, or your own API. The form includes a `_gotcha` honeypot field, which Formspree recognises. If this is empty, the form says plainly that nothing was sent. |
| `PUBLIC_SHOW_DRAFTS` | Preview only | `true` renders draft Insights with a visible draft banner. |

The CSP in `_headers` adds the enquiry endpoint's origin to `connect-src` and `form-action` automatically.

## Editing content

All firm facts and copy live in `src/content/` and `src/data/`. Schemas in `src/content.config.ts` validate them at build time, so a missing field fails the build instead of breaking a page.

| What | Where | Notes |
| --- | --- | --- |
| Firm facts: legal entity, contact, offices, social | `src/data/site.ts` | Leave a value `null` until it is confirmed. Contact details stay hidden until set. Legal fields show a visible *To be confirmed* marker. |
| Mandates (service pages) | `src/content/services/*.yaml` | One file per mandate. The schema enforces objective, role, scope, exactly five process stages, questions and SEO fields. Wrap words in `*asterisks*` to set them in italic in headlines. |
| Audiences, approach stages, principles | `src/data/*.ts` | Typed data used by the home, approach and firm pages. |
| Insights | `src/content/insights/*.md` | Markdown with front matter. An article publishes only with `draft: false`. The Insights section and its navigation link appear once one article is published. |
| Team | `src/content/team.yaml` | Add people only with their consent. Experience from before BERGWEISS goes in `priorExperience` and is labelled as such. |
| Transactions | `src/content/transactions.yaml` | Each entry requires `clientConsent: true` and an `attribution` (`firm` or `prior-experience`). The page and its navigation link appear once one entry exists. |

After changing a mandate headline, run `npm run assets:images` to refresh its Open Graph image.

## Deployment

The build output is plain static files in `dist/`:

- **Netlify / Cloudflare Pages:** build command `npm run build`, publish directory `dist`. Both hosts apply `dist/_headers` (security headers, CSP, immutable caching for hashed assets). Preview deploys without `SITE_URL` are automatically `noindex`.
- **Vercel:** same build settings. Copy the headers from `dist/_headers` into `vercel.json` if you need them there.

Rollback works through your host's deploy history. Every deploy is an immutable static build.

## Quality gates

`.github/workflows/ci.yml` runs on every pull request:

1. `npm run check`: type-check, zero errors.
2. `npm run build`: schemas validate all content.
3. `npm test`: Playwright on desktop and mobile: axe WCAG 2.2 AA on every page, the signature assembly, the enquiry form, navigation, and the v2 experience (intro, hero fallbacks, film controls, pinned gallery, cursor).
4. `npm run test:lighthouse`: accessibility must score 100, best practices and SEO at least 95, CLS at most 0.1. Performance (≥ 90), LCP (≤ 2.5 s) and TBT (≤ 200 ms) are tracked as warnings.

## Outstanding information

These items are not in the brief, so the site leaves them out or marks them as pending rather than inventing them:

- Registered company name, registered office, register and number, VAT number, directors, regulatory status (legal notice and privacy notice).
- Contact email, phone and office locations.
- Form-processing provider and endpoint; hosting provider (privacy notice).
- Team biographies, with consent.
- Publishable transactions, with client consent and attribution.
- Confirmation of the five mandates and of the advisory-only role statement.
- Production domain (`SITE_URL`).

## Licences

Newsreader (Production Type) and Archivo (Omnibus-Type) are used under the SIL Open Font License 1.1. The licence texts are in `src/assets/fonts/`. three.js is MIT-licensed. All drawings, renders, films and brand assets in this repository were made for BERGWEISS.
