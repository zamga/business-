/**
 * Offline render harness, loaded in headless Chromium by render-media.mjs.
 * Uses the same stage and structure modules as the live site.
 */
import { Stage, cameras, type CameraPose, type CompositionName, type Mood, type SunPose } from '../../src/three/stage';
import { renderAccumulated } from '../../src/three/accumulate';

export interface Shot {
  composition: CompositionName;
  camera: CameraPose;
  sun: SunPose;
  mood?: Mood;
  samples: number;
  softness?: number;
  sky?: number;
  skyShade?: number;
  aperture?: number;
  focus?: [number, number, number];
  assembly?: number;
}

let stage: Stage | null = null;
let stageMood: Mood | null = null;
let current = '';

function ensureStage(mood: Mood, width: number, height: number): Stage {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  if (!stage || stageMood !== mood) {
    stage?.dispose();
    stage = new Stage({ canvas, quality: 'offline', mood, preserveDrawingBuffer: true, maxPixelRatio: 1 });
    stageMood = mood;
    current = '';
  }
  stage.setSize(width, height);
  return stage;
}

declare global {
  interface Window {
    renderShot: (shot: Shot, width: number, height: number) => Promise<string>;
    cameras: typeof cameras;
  }
}

window.cameras = cameras;
window.renderShot = async (shot, width, height) => {
  const s = ensureStage(shot.mood ?? 'day', width, height);
  if (current !== shot.composition) {
    s.compose(shot.composition);
    current = shot.composition;
  }
  s.setAssembly(shot.assembly ?? 1);
  s.setCamera(shot.camera);
  s.setSun(shot.sun);
  const t0 = performance.now();
  renderAccumulated(s, {
    samples: shot.samples,
    softness: shot.softness,
    sky: shot.sky,
    skyShade: shot.skyShade,
    aperture: shot.aperture,
    focus: shot.focus,
    seed: 7,
  });
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const url = canvas.toDataURL('image/png');
  console.log(`rendered ${shot.composition} in ${Math.round(performance.now() - t0)} ms`);
  return url;
};
