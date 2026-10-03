// Renders the brand's model photography and film frames from the 3D scene.
//   node scripts/render/render-media.mjs <harnessDir> <outDir> [only=name,name] [stills] [films]
// The harness directory holds index.html and the esbuild bundle of harness.ts
// (see scripts/render/README.md). Film frames land in <outDir>/frames/<film>/
// and are encoded by scripts/render/encode-media.sh.
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const [, , harnessDir, outDir, ...rest] = process.argv;
const only = rest.find((a) => a.startsWith('only='))?.slice(5).split(',');
const doStills = rest.includes('stills') || !rest.includes('films');
const doFilms = rest.includes('films');

const server = http
  .createServer(async (req, res) => {
    try {
      const file = path.join(harnessDir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on('pageerror', (e) => console.error('  [page error]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(() => typeof window.renderShot === 'function');
const cams = await page.evaluate(() => window.cameras);

/** The hero's resting light: from behind and to the right, so the shadow falls under the headline. */
const heroSun = { azimuth: 115, elevation: 30 };
/** On the portrait (mobile) hero the shadow falls towards the reader instead. */
const tallSun = { azimuth: 150, elevation: 28 };
const day = { softness: 1.2, sky: 0.8 };

const stills = {
  'hero-wide': { size: [2400, 1350], shot: { composition: 'monument', camera: cams.heroWide, sun: heroSun, samples: 64, ...day } },
  'hero-tall': { size: [1200, 1500], shot: { composition: 'monument', camera: cams.heroTall, sun: tallSun, samples: 64, ...day } },
  joint: {
    size: [1600, 2000],
    shot: { composition: 'monument', camera: cams.joint, sun: { azimuth: -30, elevation: 38 }, samples: 112, ...day, aperture: 0.018, focus: [-1.56, 0.47, 0.1] },
  },
  plan: { size: [2000, 2000], shot: { composition: 'plan', camera: cams.plan, sun: { azimuth: -35, elevation: 52 }, samples: 48, ...day } },
  field: {
    size: [2400, 1350],
    shot: { composition: 'field', camera: cams.field, sun: { azimuth: -52, elevation: 30 }, samples: 112, ...day, aperture: 0.05, focus: [1.35, 0.9, 0.0] },
  },
  range: { size: [2400, 1350], shot: { composition: 'range', camera: cams.range, sun: { azimuth: -48, elevation: 30 }, samples: 48, ...day } },
  options: { size: [2400, 1350], shot: { composition: 'options', camera: cams.options, sun: { azimuth: -40, elevation: 34 }, samples: 48, ...day } },
  layers: { size: [1600, 2000], shot: { composition: 'layers', camera: cams.layers, sun: { azimuth: -38, elevation: 30 }, samples: 48, ...day } },
  night: {
    size: [2400, 1350],
    shot: { composition: 'monument', mood: 'night', camera: cams.night, sun: { azimuth: 70, elevation: 15 }, samples: 64, softness: 0.8, sky: 0.25, skyShade: 0.3 },
  },
  racked: { size: [2400, 1350], shot: { composition: 'racked', camera: cams.racked, sun: { azimuth: -45, elevation: 32 }, samples: 48, ...day } },
  front: { size: [2000, 2000], shot: { composition: 'monument', camera: cams.front, sun: { azimuth: -34, elevation: 40 }, samples: 48, ...day } },
};

const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

const films = {
  // The members assemble in the order a transaction is built, then hold while the light moves.
  'assembly-wide': {
    size: [1600, 900],
    frames: 200,
    shot(t) {
      const e = easeInOutSine(t);
      const k = 1.12 - 0.16 * e;
      return {
        composition: 'monument',
        camera: { position: [7.0 * k, 2.1 + 0.3 * (1 - e), 11.0 * k], target: [0, 2.1 + 0.25 * (1 - e), 0], fov: 27 },
        sun: { azimuth: 115 - 12 * t, elevation: 30 + 3 * t },
        samples: 10,
        ...day,
        skyShade: 0.3,
        assembly: Math.min(1, t / 0.6),
      };
    },
  },
  // Mobile hero: the same assembly from the portrait hero camera, ending exactly on the poster.
  'assembly-tall': {
    size: [720, 900],
    frames: 110,
    shot(t) {
      return { composition: 'monument', camera: cams.heroTall, sun: tallSun, samples: 8, ...day, skyShade: 0.3, assembly: Math.min(1, t / 0.86) };
    },
  },
};

await mkdir(outDir, { recursive: true });

async function render(shot, [w, h]) {
  await page.setViewportSize({ width: w, height: h });
  const url = await page.evaluate(([s, w, h]) => window.renderShot(s, w, h), [shot, w, h]);
  return Buffer.from(url.split(',')[1], 'base64');
}

if (doStills) {
  for (const [name, { size, shot }] of Object.entries(stills)) {
    if (only && !only.includes(name)) continue;
    const t0 = Date.now();
    await writeFile(path.join(outDir, `${name}.png`), await render(shot, size));
    console.log(`${name}.png ${size.join('x')} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

if (doFilms) {
  for (const [name, film] of Object.entries(films)) {
    if (only && !only.includes(name)) continue;
    const dir = path.join(outDir, 'frames', name);
    await mkdir(dir, { recursive: true });
    const t0 = Date.now();
    for (let i = 0; i < film.frames; i++) {
      const t = i / (film.frames - 1);
      await writeFile(path.join(dir, `f${String(i).padStart(4, '0')}.png`), await render(film.shot(t), film.size));
      if (i % 20 === 0) console.log(`${name}: frame ${i}/${film.frames} after ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    console.log(`${name}: ${film.frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

await browser.close();
server.close();
