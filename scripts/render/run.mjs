// The brand's model photography and film, in one command:
//   npm run media:render                          everything
//   npm run media:render -- only=night stills     one still
//   npm run media:render -- films                 both films
// Bundles the render harness (the same three.js scene as the live hero),
// renders in headless Chromium with software WebGL, then converts the
// results into site media with process-media.mjs.
// Set CHROMIUM_PATH to use a specific Chromium build.
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const work = path.join(os.tmpdir(), 'bergweiss-render');
const out = path.join(work, 'out');

await rm(work, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: [path.join(root, 'scripts/render/harness.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  outfile: path.join(work, 'harness.js'),
  logLevel: 'warning',
});
await writeFile(
  path.join(work, 'index.html'),
  '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style></head>' +
    '<body><canvas id="c"></canvas><script type="module" src="./harness.js"></script></body></html>',
);

const run = (script, ...rest) =>
  execFileSync(process.execPath, [path.join(root, 'scripts/render', script), ...rest], { stdio: 'inherit', cwd: root });

run('render-media.mjs', work, out, ...args);
const kinds = args.filter((a) => a === 'stills' || a === 'films');
run('process-media.mjs', out, ...kinds);
