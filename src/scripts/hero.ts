/**
 * Chooses how the home hero shows the model, and loads the 3D scene only
 * when it will actually run:
 *
 * - Landscape screen with a mouse and a hardware-accelerated WebGL 2: the
 *   live scene (three.js, loaded on demand) takes over from the identically
 *   framed poster. Software renderers keep the poster.
 * - Portrait screen, first page of the visit: a four-second film of the
 *   structure assembling, ending on the poster's exact frame.
 * - Reduced motion, Save-Data, or anything failing: the poster stays.
 *
 * The poster always paints first. On a first visit the intro overlay covers
 * the hero; if the scene or film is ready before the overlay opens, the model
 * assembles as it opens. If not, it appears already assembled, so nothing
 * on screen ever jumps.
 */
import { sunClock } from '../lib/sun';

const root = document.documentElement;
const hero = document.querySelector<HTMLElement>('[data-hero]');

type Connection = { saveData?: boolean };

const firstVisit = root.classList.contains('is-intro');
let introOver = !firstVisit;
const introFinished: Promise<void> = firstVisit
  ? new Promise((resolve) =>
      window.addEventListener(
        'bw:intro-done',
        () => {
          introOver = true;
          resolve();
        },
        { once: true },
      ),
    )
  : Promise.resolve();

const idle = (): Promise<void> =>
  new Promise((resolve) => {
    const go = () =>
      'requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 1500 }) : setTimeout(resolve, 200);
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  });

if (hero) setup(hero);

function setup(hero: HTMLElement): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as Navigator & { connection?: Connection }).connection?.saveData === true;
  if (reduced || saveData) return;
  const landscape = matchMedia('(min-width: 40em) and (min-aspect-ratio: 1/1)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (landscape.matches && mouse && 'WebGL2RenderingContext' in window) void live(hero, landscape);
  else if (!landscape.matches && firstVisit) film(hero);
}

async function live(hero: HTMLElement, landscape: MediaQueryList): Promise<void> {
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  const stage = hero.querySelector<HTMLElement>('[data-hero-stage]');
  const poster = hero.querySelector<HTMLImageElement>('.hero__poster img');
  const clock = hero.querySelector<HTMLElement>('.hero__clock-wide');
  if (!canvas || !stage || !poster) return;

  // A first visit loads straight away, under cover of the intro; later
  // visits wait until the page is idle so the poster stays the first paint.
  if (!firstVisit) await idle();
  if (!acceleratedWebGL()) return;

  let exploded = false;
  try {
    const { mountHero } = await import('../three/hero');
    const handle = await mountHero({
      canvas,
      host: stage,
      posterAspect: Number(poster.dataset.wideAspect) || 16 / 9,
      startExploded: () => (exploded = firstVisit && !introOver),
      onReady: () => {
        // Under the intro the switch is invisible; afterwards it crossfades
        // between two identical frames.
        if (exploded) hero.classList.add('is-instant');
        hero.classList.add('is-live');
      },
      onSun: (pose) => {
        if (clock) clock.textContent = sunClock(pose.azimuth);
      },
      onFail: () => hero.classList.remove('is-live'),
    });
    landscape.addEventListener(
      'change',
      () => {
        // The portrait layout has its own poster; this scene would be framed for the wrong one.
        handle.dispose();
        hero.classList.remove('is-live');
      },
      { once: true },
    );
    if (exploded) {
      await introFinished;
      hero.classList.remove('is-instant');
      handle.assemble();
    }
  } catch {
    hero.classList.remove('is-live');
  }
}

/**
 * True only when WebGL 2 runs on a real GPU. Software rasterisers (a
 * blocklisted GPU, a virtual machine, headless browsers) would stall the
 * page for seconds, so those devices keep the poster.
 */
function acceleratedWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(renderer);
  } catch {
    return false;
  }
}

function film(hero: HTMLElement): void {
  const video = hero.querySelector<HTMLVideoElement>('[data-hero-film]');
  if (!video) return;
  const stop = () => {
    hero.classList.remove('is-filming');
    video.pause();
  };
  video.addEventListener(
    'loadeddata',
    async () => {
      // Too late: the overlay has opened on the assembled poster already.
      if (introOver) return;
      hero.classList.add('is-filming', 'is-instant');
      await introFinished;
      hero.classList.remove('is-instant');
      try {
        await video.play();
      } catch {
        // Autoplay refused (for example in Low Power Mode): keep the poster.
        stop();
      }
    },
    { once: true },
  );
  // The last frame is the poster's frame; hand back to the sharper still.
  video.addEventListener('ended', () => hero.classList.remove('is-filming'), { once: true });
  video.preload = 'auto';
  video.load();
}
