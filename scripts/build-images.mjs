// Generates favicons, the logo PNG and Open Graph images from brand sources.
// Run after changing the mark, the fonts or the service headlines:
//   node scripts/build-images.mjs
// Uses Playwright's Chromium; set CHROMIUM_PATH to use a specific binary.
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pub = path.join(root, 'public');
// Fonts are inlined: a page created with setContent cannot load file:// URLs.
const fontData = {};
for (const f of ['newsreader-display.woff2', 'newsreader-display-italic.woff2', 'archivo.woff2', 'ampersand.woff2']) {
  fontData[f] = `data:font/woff2;base64,${(await readFile(path.join(root, 'src/assets/fonts', f))).toString('base64')}`;
}
const fontUrl = (f) => fontData[f];
const markSvg = await readFile(path.join(pub, 'brand/bergweiss-mark.svg'), 'utf8');
// Model photography (src/assets/models), inlined for the same reason as the fonts.
const modelData = {};
const model = async (key) =>
  (modelData[key] ??= `data:image/webp;base64,${(await readFile(path.join(root, 'src/assets/models', `${key}.webp`))).toString('base64')}`);
const lockupSvg = await readFile(path.join(pub, 'brand/bergweiss-lockup.svg'), 'utf8');
const faviconSvg = await readFile(path.join(pub, 'favicon.svg'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const emph = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');

const fonts = `
@font-face{font-family:N;src:url(${fontUrl('newsreader-display.woff2')}) format('woff2');font-weight:300 460}
@font-face{font-family:N;src:url(${fontUrl('newsreader-display-italic.woff2')}) format('woff2');font-style:italic;font-weight:300 400}
@font-face{font-family:A;src:url(${fontUrl('archivo.woff2')}) format('woff2');font-weight:380 620}
@font-face{font-family:Amp;src:url(${fontUrl('ampersand.woff2')}) format('woff2');unicode-range:U+26}`;

const og = ({ label, headline, sheet, modelUri, full }) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#f1ede5;color:#0e1216}
.s{position:absolute;inset:40px;border:1px solid rgb(14 18 22/.42)}
.ax{position:absolute;top:0;bottom:0;width:1px;background:rgb(14 18 22/.12)}
.r{position:absolute;width:14px;height:14px;border:0 solid #0e1216}
.lab{position:absolute;left:80px;top:84px;font:540 15px/1 Amp,A;letter-spacing:.12em;text-transform:uppercase;color:#b23a22}
h1{position:absolute;left:78px;right:80px;top:132px;font:300 92px/0.96 N;letter-spacing:-.025em;text-wrap:balance}
.m{position:absolute;top:41px;right:41px;width:520px;height:452px;object-fit:cover}
.m--full{left:41px;width:1118px;height:548px;object-position:right center}
.with-model h1{right:600px;font-size:68px}
.with-model.full h1{right:430px}
h1 em{font-style:italic}
.lock{position:absolute;left:80px;bottom:84px;height:40px}
.lock svg{height:40px;width:auto}
.sheet{position:absolute;right:80px;bottom:84px;font:540 14px/1.4 Amp,A;letter-spacing:.12em;text-transform:uppercase;color:#565b60;text-align:right}
</style></head><body class="${modelUri ? `with-model${full ? ' full' : ''}` : ''}">
<div class="s">
  <span class="ax" style="left:0"></span><span class="ax" style="left:25%"></span><span class="ax" style="left:50%"></span><span class="ax" style="left:75%"></span>
  <span class="r" style="left:-8px;top:-8px;border-top-width:1px;border-left-width:1px"></span>
  <span class="r" style="right:-8px;top:-8px;border-top-width:1px;border-right-width:1px"></span>
  <span class="r" style="left:-8px;bottom:-8px;border-bottom-width:1px;border-left-width:1px"></span>
  <span class="r" style="right:-8px;bottom:-8px;border-bottom-width:1px;border-right-width:1px"></span>
</div>
${modelUri ? `<img class="m${full ? ' m--full' : ''}" src="${modelUri}" alt="">` : ''}
<p class="lab">${esc(label)}</p>
<h1>${emph(headline)}</h1>
<div class="lock">${lockupSvg}</div>
<p class="sheet">${esc(sheet)}</p>
</body></html>`;

const pages = [
  { file: 'default', label: 'Mergers & Acquisitions Advisory', headline: 'Strategic decisions. *Precisely executed.*', sheet: 'Sheet 01 — Index', model: 'hero-wide', full: true },
  { file: 'approach', label: 'Approach', headline: 'The architecture *of a transaction.*', sheet: 'Sheet 03 — Approach', model: 'plan' },
  { file: 'firm', label: 'The firm', headline: 'An adviser at the table, *on your side of it.*', sheet: 'Sheet 04 — The firm', model: 'front' },
  { file: 'contact', label: 'Contact', headline: 'Discuss a *transaction.*', sheet: 'Sheet 05 — Contact', model: 'hero-wide', full: true },
];

const serviceDir = path.join(root, 'src/content/services');
for (const f of (await readdir(serviceDir)).filter((n) => n.endsWith('.yaml'))) {
  const d = yaml.load(await readFile(path.join(serviceDir, f), 'utf8'));
  pages.push({
    file: f.replace(/\.yaml$/, ''),
    label: `${d.ref} · ${d.name}`,
    headline: d.headline,
    sheet: `Sheet 02.${d.order} — ${d.name}`,
    model: d.model.key,
  });
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });

await mkdir(path.join(pub, 'og'), { recursive: true });
for (const p of pages) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(og({ ...p, modelUri: p.model ? await model(p.model) : undefined }), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(pub, 'og', `${p.file}.png`) });
  console.log(`og/${p.file}.png`);
}

const icon = async (size, out, { padded = false } = {}) => {
  await page.setViewportSize({ width: size, height: size });
  const body = padded
    ? `<div style="width:${size}px;height:${size}px;background:#f1ede5;display:grid;place-items:center">
         <div style="width:${Math.round(size * 0.62)}px;height:${Math.round(size * 0.62)}px">${markSvg}</div></div>`
    : `<div style="width:${size}px;height:${size}px">${faviconSvg}</div>`;
  await page.setContent(`<!doctype html><html><head><style>*{margin:0}svg{width:100%;height:100%;display:block}</style></head><body>${body}</body></html>`);
  await page.screenshot({ path: path.join(pub, out), omitBackground: !padded });
  console.log(out);
};

await icon(32, 'favicon-32.png');
await icon(180, 'apple-touch-icon.png', { padded: true });
await icon(192, 'icon-192.png', { padded: true });
await icon(512, 'icon-512.png', { padded: true });

// Logo for structured data: lockup on transparent background.
await page.setViewportSize({ width: 1200, height: 200 });
await page.setContent(`<!doctype html><html><head><style>*{margin:0}body{display:grid;place-items:center;width:1200px;height:200px}svg{height:120px;width:auto}</style></head><body>${lockupSvg}</body></html>`);
await page.screenshot({ path: path.join(pub, 'brand/bergweiss-lockup.png'), omitBackground: true });
console.log('brand/bergweiss-lockup.png');

await browser.close();
