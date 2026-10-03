/**
 * Offline progressive rendering for stills and film. Averages many renders,
 * each with sub-pixel jitter, a sun sampled across its disc (soft shadows), a
 * shadowed sky light from a random direction (occlusion) and, optionally, a
 * thin lens (depth of field). Tone maps once at the end, like a camera.
 */
import * as THREE from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { mulberry32 } from './structure';
import { placeLight, type Stage } from './stage';

export interface AccumulateOptions {
  samples: number;
  /** Angular radius of the sun in degrees: larger is a softer shadow. */
  softness?: number | undefined;
  /** Intensity of the sky fill light. */
  sky?: number | undefined;
  /** How much sky occlusion darkens the paper floor. */
  skyShade?: number | undefined;
  /** Lens radius in world units; 0 keeps everything sharp. */
  aperture?: number | undefined;
  /** Point in perfect focus; defaults to the camera target. */
  focus?: [number, number, number] | undefined;
  seed?: number | undefined;
}

const blendMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { tAcc: { value: null }, tNew: { value: null }, weight: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader:
      'uniform sampler2D tAcc; uniform sampler2D tNew; uniform float weight; varying vec2 vUv;' +
      'void main(){ gl_FragColor = mix(texture2D(tAcc, vUv), texture2D(tNew, vUv), weight); }',
    depthTest: false,
    depthWrite: false,
  });

export function renderAccumulated(stage: Stage, options: AccumulateOptions): void {
  const { samples, softness = 1.2, sky = 0.8, skyShade = 0.45, aperture = 0, focus, seed = 1 } = options;
  const { renderer, camera, scene } = stage;
  const rand = mulberry32(seed);
  const w = stage.pixelWidth;
  const h = stage.pixelHeight;
  const make = () => new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: true });
  const sample = make();
  let acc = make();
  let next = make();
  const blend = new FullScreenQuad(blendMaterial());
  const uniforms = (blend.material as THREE.ShaderMaterial).uniforms;
  const output = new OutputPass();
  output.renderToScreen = true;

  const basePos = camera.position.clone();
  const focusPoint = focus ? new THREE.Vector3(...focus) : stage.target.clone();
  const baseSun = { ...stage.sunPose };
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  stage.paper.uniforms.skyShade!.value = skyShade;

  for (let i = 0; i < samples; i++) {
    stage.applyView(rand() - 0.5, rand() - 0.5);

    if (aperture > 0) {
      // Thin lens: move the eye across the aperture, keep the focus point fixed.
      const r = Math.sqrt(rand()) * aperture;
      const a = rand() * Math.PI * 2;
      camera.position.copy(basePos);
      camera.lookAt(focusPoint);
      camera.updateMatrixWorld();
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      camera.position.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
      camera.lookAt(focusPoint);
    }

    // Sun sampled across its disc.
    const sr = Math.sqrt(rand()) * softness;
    const sa = rand() * Math.PI * 2;
    placeLight(stage.sun, stage.target, {
      azimuth: baseSun.azimuth + (sr * Math.cos(sa)) / Math.max(0.2, Math.cos(THREE.MathUtils.degToRad(baseSun.elevation))),
      elevation: baseSun.elevation + sr * Math.sin(sa),
    });

    // Sky: one shadowed fill light, cosine-weighted towards the zenith, never below 20 degrees.
    const elevation = 20 + (70 * Math.asin(Math.sqrt(rand()))) / (Math.PI / 2);
    stage.sky.intensity = sky;
    placeLight(stage.sky, stage.target, { azimuth: rand() * 360, elevation });

    renderer.setRenderTarget(sample);
    renderer.render(scene, camera);

    uniforms.tAcc!.value = acc.texture;
    uniforms.tNew!.value = sample.texture;
    uniforms.weight!.value = 1 / (i + 1);
    renderer.setRenderTarget(next);
    blend.render(renderer);
    [acc, next] = [next, acc];
  }

  camera.position.copy(basePos);
  camera.lookAt(stage.target);
  stage.applyView();
  stage.setSun(baseSun);
  stage.sky.intensity = 0;
  stage.paper.uniforms.skyShade!.value = 0;

  renderer.setRenderTarget(null);
  output.render(renderer, null as unknown as THREE.WebGLRenderTarget, acc, 0, false);

  sample.dispose();
  acc.dispose();
  next.dispose();
  blend.dispose();
  (blend.material as THREE.Material).dispose();
  output.dispose();
}
