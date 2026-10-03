/**
 * The live hero: the structure on the page, under a sun the visitor moves.
 * Architects test a model's shadows on a heliodon; here the pointer is the
 * sun. The canvas is framed to match the pre-rendered poster exactly, so it
 * can replace the poster without a visible change.
 *
 * Renders only when something changes (pointer, scroll, resize, assembly) and
 * only while the hero is on screen. Hands back to the poster if the device
 * cannot hold the frame rate or the WebGL context is lost.
 */
import { Stage, cameras, type CameraPose, type SunPose } from './stage';

export interface HeroOptions {
  canvas: HTMLCanvasElement;
  /** Element whose box the canvas fills. */
  host: HTMLElement;
  /** Aspect ratio of the poster the canvas must match. */
  posterAspect: number;
  /** Asked just before the first frame: start exploded, to assemble on `assemble()`? */
  startExploded: () => boolean;
  /** First frame is on the canvas. */
  onReady: () => void;
  /** The sun moved; for the sun-study readout. */
  onSun?: (pose: SunPose) => void;
  /** Live rendering stopped; show the poster again. */
  onFail: () => void;
}

export interface HeroHandle {
  assemble: () => void;
  dispose: () => void;
}

/** The resting light, identical to the poster's. */
export const REST_SUN: SunPose = { azimuth: 115, elevation: 30 };
const ASSEMBLY_MS = 3200;
const SUN_SMOOTHING_S = 0.45;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Shortest signed angle from a to b, in degrees. */
const angleDelta = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/** Hands the main thread back between setup steps, so the page never stalls. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function mountHero(options: HeroOptions): Promise<HeroHandle> {
  const { canvas, host, posterAspect } = options;
  await yieldToMain();
  const stage = new Stage({ canvas, quality: 'live', maxPixelRatio: 1.5, shadowSize: 2048 });
  await yieldToMain();
  stage.compose('monument');
  stage.setFraming(posterAspect);
  const baseCamera: CameraPose = cameras.heroWide as CameraPose;

  let width = 0;
  let height = 0;
  const sun: SunPose = { ...REST_SUN };
  const sunGoal: SunPose = { ...REST_SUN };
  let scroll = 0;
  let assembly = 1;
  let assemblyStart = -1;
  let visible = true;
  let dirty = true;
  let frame = 0;
  let last = 0;
  let disposed = false;
  let continuous = false;
  const frameTimes: number[] = [];
  let checkedPerformance = false;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    width = rect.width;
    height = rect.height;
    stage.setSize(width, height);
    dirty = true;
    request();
  };

  const applyCamera = () => {
    // Scrolling away pulls the camera back and up, as if stepping away from the model.
    const k = 1 + 0.1 * scroll;
    const pose: CameraPose = {
      ...baseCamera,
      position: [baseCamera.position[0] * k, baseCamera.position[1] + 0.9 * scroll, baseCamera.position[2] * k],
      target: [baseCamera.target[0], baseCamera.target[1] + 0.15 * scroll, baseCamera.target[2]],
    };
    stage.setCamera(pose);
  };

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !visible) return;
    // The pointer is the sun, seen behind the model: across the screen it
    // swings from the left, through backlight, to the right; up the screen it rises.
    const x = clamp(event.clientX / window.innerWidth, 0, 1);
    const y = clamp(event.clientY / window.innerHeight, 0, 1);
    sunGoal.azimuth = 303 - x * 190;
    sunGoal.elevation = 58 - y * 44;
    request();
  };

  const onScroll = () => {
    const rect = host.getBoundingClientRect();
    const next = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
    if (next !== scroll) {
      scroll = next;
      dirty = true;
      request();
    }
  };

  const tick = (now: number) => {
    frame = 0;
    if (disposed || !visible) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    // Only back-to-back frames say anything about the device's frame rate.
    if (continuous && last && !checkedPerformance) frameTimes.push(now - last);
    last = now;

    let animating = false;

    if (assemblyStart >= 0 && assembly < 1) {
      assembly = clamp((now - assemblyStart) / ASSEMBLY_MS, 0, 1);
      stage.setAssembly(assembly);
      dirty = true;
      animating = assembly < 1;
    }

    const blend = 1 - Math.exp(-dt / SUN_SMOOTHING_S);
    const dAz = angleDelta(sun.azimuth, sunGoal.azimuth);
    const dEl = sunGoal.elevation - sun.elevation;
    if (Math.abs(dAz) > 0.02 || Math.abs(dEl) > 0.02) {
      sun.azimuth += dAz * blend;
      sun.elevation += dEl * blend;
      dirty = true;
      animating = true;
    }

    if (dirty) {
      applyCamera();
      stage.setSun({ azimuth: sun.azimuth, elevation: sun.elevation - 8 * scroll });
      stage.render();
      options.onSun?.(sun);
      dirty = false;
    }

    guardPerformance();
    continuous = animating;
    if (animating) request();
    else last = 0;
  };

  function request() {
    if (!frame && !disposed && visible) frame = requestAnimationFrame(tick);
  }

  /** Measures real frame times once, while animating; steps down, then gives up. */
  function guardPerformance() {
    if (checkedPerformance || frameTimes.length < 40) return;
    checkedPerformance = true;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    if (median > 45) {
      fail();
    } else if (median > 24 && stage.renderer.getPixelRatio() > 1) {
      stage.renderer.setPixelRatio(1);
      width = 0;
      resize();
    }
  }

  function fail() {
    dispose();
    options.onFail();
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) {
      dirty = true;
      request();
    }
  });
  const ro = new ResizeObserver(resize);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      dirty = true;
      request();
    }
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    fail();
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    stage.dispose();
  }

  resize();
  onScroll();
  applyCamera();
  stage.setSun(sun);
  await yieldToMain();
  await stage.compile();
  if (disposed) return { assemble: () => {}, dispose };
  await yieldToMain();
  assembly = options.startExploded() ? 0 : 1;
  stage.setAssembly(assembly);
  stage.render();

  io.observe(host);
  ro.observe(host);
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  options.onReady();

  return {
    assemble() {
      if (assembly >= 1 || assemblyStart >= 0) return;
      assemblyStart = performance.now();
      request();
    },
    dispose,
  };
}
