# BERGWEISS — design rationale and system

## 1. The idea

**The architecture of a transaction.** A transaction is a structure. Its members are drawn before anything is built, and it holds only once every member is in place. The site is a set of construction drawings for that structure. Pages are numbered sheets with title blocks. Mandates are drawn as plans, elevations and sections. The firm's mark is the finished structure.

The mark is a **braced frame** with five members, and each member is one part of a transaction:

| Member | Element | Stage | Meaning |
| --- | --- | --- | --- |
| Foundation (base) | Strategy | 01 Assessment | Everything rests on the objective. |
| First column | Valuation | 02 Preparation | What the business is worth, and why. |
| Second column | Counterparties | 03 Engagement | Who belongs on the other side of the table. |
| Beam | Terms | 04 Negotiation | The agreement spans both columns. |
| Brace (redline) | Execution | 05 Completion | A frame without a brace can still rack out of square; execution makes it hold. |

Assembled, the five members form the logo. The site's signature interaction builds the logo from the firm's own process.

## 2. Directions considered

| | A. The Drawing Set (chosen) | B. The Room | C. Ledger and Light |
| --- | --- | --- | --- |
| Idea | The site as construction drawings; the mark as a finished transaction. | The transaction as rooms (data room, boardroom, table) in one continuous WebGL plan. | Purely typographic; a "line of agreement" that two text blocks converge on. |
| Visual language | Ink on mineral white, hairlines, axes, title blocks, hatching, one redline. | Axonometric 3D, soft light. | Monumental serif, Swiss grid, warm gradient. |
| Motion | Measured, orthogonal travel; members lock into place. | Continuous camera pans. | Converging type. |
| Signature | Five members assemble into the mark as the approach is read. | Walk through the deal room by room. | Two columns of text meet on a line. |
| Complexity | Medium; static, ~1 KB of JavaScript. | High; WebGL, heavy on mobile, risk to discretion. | Low; elegant but not ownable. |

Direction A wins because it is ownable (the mark is the idea), honest (it explains the process instead of decorating it), and fast.

### Category clichés, deliberately broken

- No handshakes, skylines, trading screens, charts, globes or gold.
- No mountain imagery despite the name. A peer that has won Awwwards recognition already rebuilds its mountain in 3D. Here *Berg* survives only as faint contour lines on the firm page.
- No scroll-jacking. Scrolling stays native; motion responds to it and never takes it over.

## 3. References and the principles drawn from them

Award claims were checked against the awards' own pages as returned by search. The sandbox could not load those pages directly.

- **Montfort**, Immersive Garden (Awwwards Site of the Day + Developer Award, June 2025; Site of the Month June 2025). Shows that a two-colour system can carry sophisticated motion. → *Restraint in colour, craft in movement.*
- **Tresmares Capital**, Dgrees (Awwwards SOTD + Developer Award, June 2026). A capital firm whose signature grows from its name. → *A signature should come from the brand's own truth; ours is structural, not scenic.*
- **David Chipperfield Architects**, Humans & Machines (Awwwards Honorable Mention, 2023). → *Authority through restraint; writing as a first-class section.*
- **Powerhouse Company**, Build in Amsterdam (Awwwards Site of the Month, April 2020). → *One positioning line drives the entire site.*
- **Poor Charlie's Almanack**, Stripe Press (Awwwards SOTD + Developer Award, Jan 2024; Typography Honors). → *Book-grade typography is itself the luxury.*

## 4. Identity

### Colour

| Token | Hex | Role | Contrast |
| --- | --- | --- | --- |
| `--ink` | `#0E1216` | Text, frame, dark sheets | 16.1:1 on mineral |
| `--mineral` | `#F1EDE5` | Paper, the "weiss" | — |
| `--mineral-shade` | `#E7E2D8` | Alternate sheet | ink 14.6:1 |
| `--stone` | `#565B60` | Secondary text on mineral | 5.9:1 |
| `--ash` | `#A3A7AA` | Secondary text on ink | 7.8:1 |
| `--redline` | `#B23A22` | The decisive element; errors | 5.1:1 on mineral |
| `--glow` | `#EF6A4B` | Redline on ink | 6.1:1 on ink |
| `--control` | `#85898D` | Form control borders | 3.0:1 (non-text) |

The redline borrows from two places: the red mark on a negotiated agreement, and alpenglow on white rock. It is used only for the decisive element: the brace, active states, numbering and errors.

### Typography

- **Newsreader** (Production Type, OFL): display and statements. The optical-size axis is pinned to a display master and weight is limited to 300–460: 49 KB roman, 42 KB italic. Upright for decisions, italic for execution.
- **Archivo** (Omnibus-Type, OFL): interface and body text, weight 380–620, 29 KB. Uppercase labels tracked at +0.12em, like architectural lettering.
- **Ampersand**: Archivo's own ampersand reads ambiguously in "M&A". A single-glyph font (0.8 KB) substitutes Newsreader's italic ampersand through `unicode-range`.
- **Fluid scale:** hero `min(19vw, 5.25rem)` on phones and `clamp(4rem, 9.6vw, 10.5rem)` from 640 px. The second hero line always starts on structural axis B. Section titles `clamp(2.6rem, 1.2rem + 4.6vw, 6.5rem)`. Body `clamp(1rem, 0.95rem + 0.2vw, 1.125rem)`.
- **Line breaks are deliberate:** `text-wrap: balance` on headings, `pretty` on paragraphs. Hero line breaks were calibrated from the fonts' advance widths so phrases never wrap mid-thought.

### Grid and space

- Columns: 4 below 640 px, 8 up to 1024 px, 12 above. Margins `clamp(1.25rem, 0.5rem + 3.2vw, 4.5rem)`; gutters `clamp(1rem, 0.6rem + 1.2vw, 2rem)`. Maximum content width 110rem.
- Five structural axes (A–E) are drawn in the hero and land exactly on column lines at every breakpoint: every column on phones, every two on tablets, every three on desktop. The headline, lead and title block align to them.
- Section rhythm: `--section` and `--section-tight`, both fluid. Editorial spreads put a label in columns 1–3 and content from column 4.

### Image system

- **Drawings, not stock photography.** Each mandate has an original drawing in architectural convention: sell-side is a plan of the table, buy-side a site plan of the market, valuation an elevation with a measured range, strategic alternatives an options study over contours, structuring a section through the layers of consideration. The lines are non-scaling hairlines, and the decisive element is drawn in redline. On hover, the rest of the drawing recedes so the decision stands out.
- **Future photography brief:** places of ownership (workshop floors, family offices, boardrooms empty before a meeting), shot in natural light with architectural framing. Warm, desaturated grade; people seen at work rather than posed. Frame photographs with the same figure component (hairline frame, registration marks, figure reference).

## 5. Motion

Tokens: `--ease-draft: cubic-bezier(.65,0,.15,1)` (deliberate start, decisive settle) and `--ease-out: cubic-bezier(.2,.7,.1,1)`. Durations: 160, 320, 640, 960 and 1400 ms. Only `transform` and `opacity` are animated, plus colour on hover.

| Moment | Trigger | Duration and easing | Sequence |
| --- | --- | --- | --- |
| Hero axes | Page load | 1400 ms draft | Axes A–E draw downward, 70 ms apart; grid bubbles fade in from 300 ms. |
| Hero headline | Page load | 1100 ms draft | Each line rises through its own mask; line two starts 120 ms later. |
| Hero mark glyph | Page load | 820 ms draft each | Base 380 ms → columns 500 and 620 ms → beam 740 ms → brace 940 ms. |
| Lead, actions, title block | Page load | 900 / 800 ms out | From 320 ms; title-block rows 80 ms apart. |
| Section reveals | 12 % visible | 640 ms out | Opacity plus 20 px rise, staggered 70 ms; runs once. |
| Section rules | Visible | 960 ms draft | Hairline draws left to right. |
| Signature assembly | A stage crosses the reading line | 560 + 560 ms draft | See below. |
| Menu | Button | 560 ms draft | Sheet drops from the top; items rise 60 ms apart. |
| Page change | Navigation | 220 ms in, 420 ms out | Old sheet lifts away, new sheet settles; the header stays fixed. |
| Buttons | Hover | 320 ms out | Registration ticks close in on the corners; the arrow advances 0.3rem. |

With **reduced motion**, every transition and keyframe is reduced to an instant change. The signature interaction keeps its meaning: see below.

### Signature interaction: the assembly

- **Mechanism:** five absolutely positioned members inside a square frame, sized in container-query units. Each member starts at an exploded offset. Travel is split into two nested layers: x moves first, then y (560 ms each, 380 ms overlap), like a drafting arm. Leaving reverses the order. The brace slides home along its own axis.
- **Trigger:** a stage counts as reached when its top crosses the reading line (50 % of the viewport on desktop, 70 % on phones, below the sticky drawing). Positions are read once per animation frame, so jumps by keyboard, anchor or scroll restoration always land in the right state.
- **Feedback:** redline joint nodes appear when a member locks; the stage readout updates (`02 / 05 — Valuation, first column`); the active stage text darkens.
- **Completion:** 900 ms after the brace locks, the hatching resolves into solid fills, the construction outlines fade, and the caption reads *"Assembled, the five elements form our mark: a structure that holds."*
- **Mobile:** the drawing is sticky beneath the header (40 % of the viewport) and the stages scroll under it. Member labels are hidden.
- **Reduced motion:** members never move. Unplaced members wait in position as faint outlines; reaching a stage makes its member solid.
- **No JavaScript:** the structure is shown assembled, and every stage is ordinary readable text.
- **Accessibility:** the drawing is a single `role="img"` with a full description. The stages are an ordered list of headings and paragraphs.

## 6. Usability and conversion

- Primary action **"Discuss a transaction"** is in the header on desktop, the hero, the menu, and the closing section of every page. Service pages pass `?topic=` to prefill the form.
- The hero title block answers *what, for whom, which mandates, what role* in four rows, and its mandate names link directly to each service: two moves to any key page.
- The enquiry form asks only what routing needs: who you are, the topic, name and email, plus optional organisation, phone and context, and consent. It validates inline, shows a focused error summary, and reports honest states: sending, success only on a `2xx` response, failure with data kept, and not-connected.

## 7. Verified results (local audit, October 2026)

- Lighthouse, mobile, production build: Performance 98–100, Accessibility 100, Best Practices 100, SEO 100. LCP 1.8–2.3 s, CLS 0, TBT 0 ms.
- axe-core, WCAG 2.2 AA: 0 violations on 12 pages at 1440 px and on a Pixel 7.
- `astro check` (strictest TypeScript): 0 errors, 0 warnings.
- Home page weight: about 150 KB transferred, including fonts. JavaScript: 1.2 KB gzipped.
