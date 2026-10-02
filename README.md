# BERGWEISS — corporate website

The website of BERGWEISS, an M&A advisory firm for business owners, family businesses, acquirers, family offices and private equity investors.

The concept, **the architecture of a transaction**, treats the site as a set of construction drawings. Strategy, valuation, counterparties, terms and execution are the five members of a braced frame. The assembled frame is the BERGWEISS mark. Design rationale, tokens and motion specifications are in [`docs/DESIGN.md`](docs/DESIGN.md).

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | [Astro 7](https://astro.build), static output | Zero JavaScript by default, content collections with schemas, first-class font pipeline. |
| Language | TypeScript (`astro/tsconfigs/strictest`) | The content model is typed end to end; `npm run check` must stay at zero errors. |
| Styling | Plain CSS with cascade layers and design tokens | A bespoke system; no framework classes to fight. |
| Motion | CSS transitions and keyframes, driven by 1.2 KB (gzipped) of TypeScript on the home page | Transform and opacity only, no animation library, native scrolling preserved. |
| Page transitions | Cross-document View Transitions (`@view-transition`) | No router script; browsers without support navigate normally. |
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

Before running the tests locally, run `npx playwright install chromium`, or set `PW_CHROMIUM_PATH` to an existing Chromium.

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
3. `npm test`: 24 Playwright scenarios on desktop and mobile, including axe WCAG 2.2 AA on every page.
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

Newsreader (Production Type) and Archivo (Omnibus-Type) are used under the SIL Open Font License 1.1. The licence texts are in `src/assets/fonts/`. All drawings and brand assets in this repository were made for BERGWEISS.
