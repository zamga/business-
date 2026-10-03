// Turns rendered PNGs and film frames into the site's media masters.
//   node scripts/render/process-media.mjs <renderDir> [stills] [films]
// Stills become high-quality WebP masters in src/assets/models/ (Astro derives
// AVIF/WebP sizes from them at build time). Films are encoded with ffmpeg into
// public/media/ as H.264 MP4 and VP9 WebM, plus a poster from the last frame.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [, , renderDir, ...parts] = process.argv;
if (!renderDir) throw new Error('Usage: node scripts/render/process-media.mjs <renderDir> [stills] [films]');
const doStills = parts.length === 0 || parts.includes('stills');
const doFilms = parts.length === 0 || parts.includes('films');

const models = path.join(root, 'src/assets/models');
const media = path.join(root, 'public/media');
await mkdir(models, { recursive: true });
await mkdir(media, { recursive: true });

for (const file of doStills ? (await readdir(renderDir)).filter((f) => f.endsWith('.png')) : []) {
  const out = path.join(models, file.replace(/\.png$/, '.webp'));
  await sharp(path.join(renderDir, file)).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(out);
  console.log(`still  ${path.relative(root, out)}`);
}

const framesRoot = path.join(renderDir, 'frames');
const films = doFilms && existsSync(framesRoot) ? await readdir(framesRoot) : [];
for (const film of films) {
  const dir = path.join(framesRoot, film);
  const frames = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
  if (frames.length === 0) continue;
  const input = path.join(dir, 'f%04d.png');
  const mp4 = path.join(media, `${film}.mp4`);
  const webm = path.join(media, `${film}.webm`);
  // Even dimensions, BT.709, faststart so playback begins before the download ends.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', '25', '-i', input,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', '-an', mp4,
  ]);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', '25', '-i', input,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', webm,
  ]);
  const poster = path.join(models, `${film}-end.webp`);
  await sharp(path.join(dir, frames.at(-1))).webp({ quality: 90 }).toFile(poster);
  console.log(`film   ${path.relative(root, mp4)}, ${path.relative(root, webm)}, ${path.relative(root, poster)}`);
}
