/**
 * The model room. The floor is the page itself: a paper material that
 * resolves to exactly the site's background colour wherever light falls, so
 * the structure stands on the page and only its shadow marks the ground. The
 * sun can be moved; the camera has a shift lens, as in architectural
 * photography, so verticals stay true while the subject moves off centre.
 *
 * Live and offline frames go through the same pipeline: the scene renders
 * into a floating-point target and is tone mapped once, by OutputPass, so the
 * live canvas, the stills and the film match to the pixel. This module is all
 * the live hero needs; offline accumulation lives in accumulate.ts.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  UNIT,
  applyAssembly,
  captureRestPoses,
  createFrame,
  createMaterials,
  mulberry32,
  type Frame,
  type MemberKey,
  type MemberPose,
  type StructureMaterials,
} from './structure';

export type Mood = 'day' | 'night';
export type Quality = 'live' | 'offline';
export type CompositionName = 'monument' | 'plan' | 'field' | 'range' | 'options' | 'layers' | 'racked';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Lens shift as a fraction of the frame: +x moves the subject right, +y up. */
  shift?: [number, number];
}

export interface SunPose {
  /** Degrees around the vertical axis; 0 is from the camera side (+z), 90 from +x. */
  azimuth: number;
  /** Degrees above the floor. */
  elevation: number;
}

interface MoodSpec {
  background: string;
  /** Floor colour inside a full shadow, before sky occlusion. */
  shade: string;
  exposure: number;
  hemi: [string, string, number];
  sun: [string, number];
  env: number;
  /** Warm pool of light on the floor around the structure (night only). */
  pool: [string, number, number] | null;
}

export const MOODS: Record<Mood, MoodSpec> = {
  day: {
    background: '#f1ede5',
    shade: '#c4c4c0',
    exposure: 1,
    hemi: ['#e9eef1', '#cfcac2', 1.0],
    sun: ['#fff5ea', 5.0],
    env: 0.32,
    pool: null,
  },
  night: {
    background: '#0e1216',
    shade: '#0e1216',
    exposure: 1.1,
    hemi: ['#2c3640', '#0a0c0e', 0.5],
    sun: ['#fff0e0', 6.0],
    env: 0.1,
    pool: ['#6f6a63', 0.16, 4.2],
  },
};

/* --------------------------------------------- tone-mapped colour match */

/** Khronos PBR Neutral, as used by THREE.NeutralToneMapping. */
function neutral(c: [number, number, number]): [number, number, number] {
  const start = 0.8 - 0.04;
  const desat = 0.15;
  const x = Math.min(c[0], c[1], c[2]);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  let r = c[0] - offset;
  let g = c[1] - offset;
  let b = c[2] - offset;
  const peak = Math.max(r, g, b);
  if (peak < start) return [r, g, b];
  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  r *= newPeak / peak;
  g *= newPeak / peak;
  b *= newPeak / peak;
  const k = 1 - 1 / (desat * (peak - newPeak) + 1);
  return [r + (newPeak - r) * k, g + (newPeak - g) * k, b + (newPeak - b) * k];
}

/** Linear colour that lands exactly on `hex` after exposure and neutral tone mapping. */
export function preToneMapped(hex: string, exposure: number): THREE.Color {
  const target = new THREE.Color(hex);
  const goal: [number, number, number] = [target.r, target.g, target.b];
  let guess: [number, number, number] = [...goal];
  for (let i = 0; i < 80; i++) {
    const out = neutral([guess[0] * exposure, guess[1] * exposure, guess[2] * exposure]);
    guess = guess.map((v, j) => Math.max(0, v + (goal[j]! - out[j]!) * 1.1)) as [number, number, number];
  }
  return new THREE.Color(guess[0], guess[1], guess[2]);
}

/* ------------------------------------------------------------ paper */

const paperVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vWorldPosition;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
}
`;

const paperFragment = /* glsl */ `
uniform vec3 paper;
uniform vec3 shade;
uniform float skyShade;
uniform mat4 contactMatrix;
uniform vec3 contactSize;
uniform float contactStrength;
uniform float contactReach;
uniform vec3 pool;
uniform float poolRadius;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>

float boxDistance(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  float sunVis = 1.0;
  float skyVis = 1.0;
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow sunShadow = directionalLightShadows[ 0 ];
    sunVis = getShadow( directionalShadowMap[ 0 ], sunShadow.shadowMapSize, sunShadow.shadowIntensity, sunShadow.shadowBias, sunShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] );
    #if NUM_DIR_LIGHT_SHADOWS > 1
      DirectionalLightShadow skyShadow = directionalLightShadows[ 1 ];
      skyVis = getShadow( directionalShadowMap[ 1 ], skyShadow.shadowMapSize, skyShadow.shadowIntensity, skyShadow.shadowBias, skyShadow.shadowRadius, vDirectionalShadowCoord[ 1 ] );
    #endif
  #endif

  // Contact occlusion along the base, analytic so it stays smooth while the model moves.
  vec3 local = (contactMatrix * vec4(vWorldPosition, 1.0)).xyz;
  float lift = max(0.0, local.y + contactSize.y);
  float edge = max(boxDistance(local.xz, contactSize.xz), 0.0);
  float contact = contactStrength * exp(-edge / contactReach) * exp(-lift / contactReach);

  vec3 color = mix(paper, shade, 1.0 - sunVis);
  color *= 1.0 - skyShade * (1.0 - skyVis);
  color *= 1.0 - contact;
  float r = length(vWorldPosition.xz);
  color += pool * exp(-(r * r) / (poolRadius * poolRadius)) * sunVis;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function createPaper(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    lights: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        paper: { value: new THREE.Color() },
        shade: { value: new THREE.Color() },
        skyShade: { value: 0 },
        contactMatrix: { value: new THREE.Matrix4() },
        contactSize: { value: new THREE.Vector3(1, 1, 1) },
        contactStrength: { value: 0 },
        contactReach: { value: 0.1 },
        pool: { value: new THREE.Color(0, 0, 0) },
        poolRadius: { value: 5 },
      },
    ]),
    vertexShader: paperVertex,
    fragmentShader: paperFragment,
  });
}

/* ------------------------------------------------------------ stage */

export interface StageOptions {
  canvas: HTMLCanvasElement;
  quality: Quality;
  mood?: Mood;
  preserveDrawingBuffer?: boolean;
  maxPixelRatio?: number;
  /** Shadow map size; defaults to 4096 offline, 2048 live. */
  shadowSize?: number;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  readonly materials: StructureMaterials;
  readonly quality: Quality;
  readonly mood: Mood;
  readonly sun: THREE.DirectionalLight;
  /** Fill light that only the offline renderer uses, from a new direction for every sample. */
  readonly sky: THREE.DirectionalLight;
  readonly target = new THREE.Vector3();
  readonly paper: THREE.ShaderMaterial;
  private readonly hemi: THREE.HemisphereLight;
  private readonly content = new THREE.Group();
  /** Live only: the HDR target the scene renders into, and the tone-mapping pass to the canvas. */
  private readonly frame?: THREE.WebGLRenderTarget;
  private readonly output?: OutputPass;
  sunPose: SunPose = { azimuth: -38, elevation: 34 };
  private shift: [number, number] = [0, 0];
  private framing: number | null = null;
  private width = 1;
  private height = 1;
  hero: { frame: Frame; rest: Partial<Record<MemberKey, MemberPose>> } | undefined;

  constructor(options: StageOptions) {
    this.quality = options.quality;
    this.mood = options.mood ?? 'day';
    const mood = MOODS[this.mood];
    const offline = this.quality === 'offline';

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      // Live, a software renderer would stall the page; offline it is the renderer.
      failIfMajorPerformanceCaveat: !offline,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = mood.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.materials = createMaterials({ textureSize: offline ? 1024 : 384 });

    // Seamless studio: background, fog and lit paper all resolve to the page colour.
    const studio = preToneMapped(mood.background, mood.exposure);
    this.scene.background = studio;
    this.scene.fog = new THREE.Fog(studio, 22, 70);

    this.paper = createPaper();
    const u = this.paper.uniforms;
    u.paper!.value = studio.clone();
    u.shade!.value = preToneMapped(mood.shade, mood.exposure);
    if (mood.pool) {
      u.pool!.value = new THREE.Color(mood.pool[0]).multiplyScalar(mood.pool[1]);
      u.poolRadius!.value = mood.pool[2];
    }

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = mood.env;
    pmrem.dispose();

    this.hemi = new THREE.HemisphereLight(mood.hemi[0], mood.hemi[1], mood.hemi[2]);
    this.scene.add(this.hemi);

    const shadowSize = options.shadowSize ?? (offline ? 4096 : 2048);
    this.sun = new THREE.DirectionalLight(mood.sun[0], mood.sun[1]);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.015;
    this.sun.shadow.radius = offline ? 1.5 : 2.5;
    this.scene.add(this.sun, this.sun.target);

    this.sky = new THREE.DirectionalLight(mood.hemi[0], 0);
    this.sky.castShadow = offline;
    this.sky.shadow.mapSize.set(2048, 2048);
    this.sky.shadow.bias = -0.0003;
    this.sky.shadow.normalBias = 0.03;
    this.sky.shadow.radius = 6;
    this.scene.add(this.sky, this.sky.target);
    this.setShadowBounds(6);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), this.paper);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor, this.content);

    if (!offline) {
      // Half float keeps the pre-tone-mapped paper (slightly above 1.0) intact; MSAA does the antialiasing.
      const ext = this.renderer.extensions;
      const hdr = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
      this.frame = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4 });
      this.output = new OutputPass();
      this.output.renderToScreen = true;
    }
  }

  private setShadowBounds(extent: number) {
    for (const light of [this.sun, this.sky]) {
      const cam = light.shadow.camera;
      cam.left = cam.bottom = -extent;
      cam.right = cam.top = extent;
      cam.near = 1;
      cam.far = 60;
      cam.updateProjectionMatrix();
    }
  }

  get pixelWidth(): number {
    return Math.floor(this.width * this.renderer.getPixelRatio());
  }

  get pixelHeight(): number {
    return Math.floor(this.height * this.renderer.getPixelRatio());
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.renderer.setSize(this.width, this.height, false);
    this.frame?.setSize(this.pixelWidth, this.pixelHeight);
    this.applyView();
  }

  /**
   * Frames the camera like `object-fit: cover` on an image of the given
   * aspect, so the live canvas matches a pre-rendered poster pixel for pixel
   * at any viewport size. Pass null to frame to the canvas itself.
   */
  setFraming(aspect: number | null): void {
    this.framing = aspect;
    this.applyView();
  }

  /** Applies framing and lens shift, plus an optional sub-pixel jitter used while accumulating. */
  applyView(jitterX = 0, jitterY = 0): void {
    const w = this.pixelWidth;
    const h = this.pixelHeight;
    const [sx, sy] = this.shift;
    const ref = this.framing;
    let fullW = w;
    let fullH = h;
    if (ref) {
      if (w / h > ref) fullH = w / ref;
      else fullW = h * ref;
    }
    this.camera.aspect = fullW / fullH;
    if (!ref && sx === 0 && sy === 0 && jitterX === 0 && jitterY === 0) {
      this.camera.clearViewOffset();
      return;
    }
    const x = (fullW - w) / 2 - sx * fullW + jitterX;
    const y = (fullH - h) / 2 + sy * fullH + jitterY;
    this.camera.setViewOffset(fullW, fullH, x, y, w, h);
  }

  setCamera(pose: CameraPose): void {
    this.camera.position.set(...pose.position);
    this.target.set(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.lookAt(this.target);
    this.shift = pose.shift ?? [0, 0];
    this.applyView();
    this.camera.updateProjectionMatrix();
  }

  setSun(pose: SunPose): void {
    this.sunPose = pose;
    placeLight(this.sun, this.target, pose);
  }

  /* ------------------------------------------------------ compositions */

  clear(): void {
    this.hero = undefined;
    this.content.clear();
    this.paper.uniforms.contactStrength!.value = 0;
  }

  compose(name: CompositionName): void {
    this.clear();
    const m = this.materials;
    switch (name) {
      case 'monument': {
        const frame = createFrame(m, { seed: 1 });
        this.content.add(frame.group);
        this.hero = { frame, rest: captureRestPoses(frame) };
        this.setShadowBounds(5.5);
        break;
      }
      case 'racked': {
        // A frame without its brace racks out of square. The brace lies where it fell.
        const frame = createFrame(m, { seed: 3 });
        const lean = 0.13;
        const foot = 8 * UNIT;
        for (const key of ['left', 'right'] as const) {
          const obj = frame.members[key];
          if (!obj) continue;
          obj.rotation.z = -lean;
          obj.position.x += 42 * UNIT * Math.sin(lean);
          obj.position.y = foot + 42 * UNIT * Math.cos(lean);
        }
        const beam = frame.members.beam;
        if (beam) {
          beam.position.x += 84 * UNIT * Math.sin(lean);
          beam.position.y -= 84 * UNIT * (1 - Math.cos(lean));
        }
        const brace = frame.members.brace;
        if (brace) {
          // Only the member fell; its pins and angles stay with the frame.
          brace.children.slice(1).forEach((joint) => joint.removeFromParent());
          brace.position.set(-0.35, 0.82 * 4 * UNIT, 1.25);
          brace.rotation.set(0, 0.32, 0);
        }
        this.content.add(frame.group);
        this.setShadowBounds(6);
        break;
      }
      case 'plan': {
        // The parts laid out flat before assembly, like a drawing set on a table.
        const frame = createFrame(m, { seed: 2 });
        const lay = (key: MemberKey, pos: [number, number, number], rot: [number, number, number]) => {
          const obj = frame.members[key];
          if (!obj) return;
          obj.position.set(...pos);
          obj.rotation.set(...rot);
        };
        lay('base', [0, 4 * UNIT, 2.3], [0, 0, 0]);
        lay('beam', [0, 4 * UNIT, -2.3], [0, 0, 0]);
        lay('left', [-2.75, 4 * UNIT, 0], [Math.PI / 2, 0, 0]);
        lay('right', [2.75, 4 * UNIT, 0], [Math.PI / 2, 0, 0]);
        lay('brace', [0, 0.82 * 4 * UNIT, 0], [0, Math.PI / 4, 0]);
        this.content.add(frame.group);
        this.setShadowBounds(6);
        break;
      }
      case 'field': {
        // A market of structures: many considered, one decided.
        const rand = mulberry32(5);
        let seed = 10;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const chosen = row === 1 && col === 2;
            const frame = createFrame(m, { braced: chosen, ghost: !chosen, seed: seed++ });
            frame.group.scale.setScalar(0.42);
            frame.group.position.set((col - 1.5) * 2.7 + (rand() - 0.5) * 0.5, 0, (row - 1) * 2.6 + (rand() - 0.5) * 0.4);
            frame.group.rotation.y = (rand() - 0.5) * 0.5;
            this.content.add(frame.group);
          }
        }
        this.setShadowBounds(9);
        break;
      }
      case 'range': {
        // One structure measured at five scales; the decided value carries the brace.
        const scales = [0.46, 0.58, 0.72, 0.86, 1.0];
        const gap = 0.6;
        let x = -(scales.reduce((sum, s) => sum + 4 * s, 0) + gap * (scales.length - 1)) / 2;
        scales.forEach((s, i) => {
          const chosen = i === 3;
          const frame = createFrame(m, { braced: chosen, ghost: !chosen, seed: 20 + i });
          frame.group.scale.setScalar(s);
          frame.group.position.set(x + 2 * s, 0, 0);
          x += 4 * s + gap;
          this.content.add(frame.group);
        });
        this.setShadowBounds(8);
        break;
      }
      case 'options': {
        // Three possible structures on one site, each on its own plinth.
        const plinthGeo = new THREE.BoxGeometry(2.6, 0.24, 1.8);
        const proportions: [number, number, number][] = [
          [0.62, 0.42, 0.5],
          [0.5, 0.5, 0.5],
          [0.5, 0.72, 0.5],
        ];
        [-3.1, 0, 3.1].forEach((x, i) => {
          const plinth = new THREE.Mesh(plinthGeo, m.plinth);
          plinth.position.set(x, 0.12, 0);
          plinth.castShadow = plinth.receiveShadow = true;
          this.content.add(plinth);
          const chosen = i === 1;
          const frame = createFrame(m, { braced: chosen, ghost: !chosen, seed: 30 + i });
          frame.group.position.set(x, 0.24, 0);
          frame.group.scale.set(...proportions[i]!);
          this.content.add(frame.group);
        });
        this.setShadowBounds(8);
        break;
      }
      case 'layers': {
        // Consideration in layers, each tied by its own brace.
        for (let level = 0; level < 3; level++) {
          const frame = createFrame(m, { seed: 40 + level });
          const s = 0.62;
          frame.group.scale.setScalar(s);
          frame.group.position.set(0, level * 4 * s, 0);
          if (level % 2 === 1) frame.group.scale.x = -s;
          this.content.add(frame.group);
        }
        this.setShadowBounds(8);
        break;
      }
    }
    this.updateContact();
  }

  /** Assembly progress for the monument's members, 0 exploded to 1 assembled. */
  setAssembly(progress: number): void {
    if (!this.hero) return;
    applyAssembly(this.hero.frame, this.hero.rest, progress);
    this.updateContact();
  }

  /** Keeps the analytic contact shadow under the monument's base. */
  private updateContact(): void {
    const base = this.hero?.frame.members.base;
    const u = this.paper.uniforms;
    if (!base) {
      u.contactStrength!.value = 0;
      return;
    }
    this.content.updateMatrixWorld(true);
    (u.contactMatrix!.value as THREE.Matrix4).copy(base.matrixWorld).invert();
    (u.contactSize!.value as THREE.Vector3).set(50 * UNIT, 4 * UNIT, 4 * UNIT);
    u.contactStrength!.value = this.mood === 'day' ? 0.34 : 0.5;
    u.contactReach!.value = this.quality === 'offline' ? 0.07 : 0.11;
  }

  /* ------------------------------------------------------ live render */

  /** Compiles every shader for the target it will draw into, without blocking where the browser allows. */
  async compile(): Promise<void> {
    this.renderer.setRenderTarget(this.frame ?? null);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  render(): void {
    this.sky.intensity = 0;
    if (!this.frame || !this.output) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.renderer.setRenderTarget(this.frame);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.output.render(this.renderer, null as unknown as THREE.WebGLRenderTarget, this.frame, 0, false);
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const material of Object.values(this.materials) as THREE.Material[]) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
    this.paper.dispose();
    this.scene.environment?.dispose();
    this.frame?.dispose();
    this.output?.dispose();
    this.renderer.dispose();
  }
}

export function sunDirection({ azimuth, elevation }: SunPose): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

export function placeLight(light: THREE.DirectionalLight, target: THREE.Vector3, pose: SunPose): void {
  light.position.copy(target).addScaledVector(sunDirection(pose), 24);
  light.target.position.copy(target);
  light.target.updateMatrixWorld();
}

/* ------------------------------------------------------------ presets */

export const cameras = {
  heroWide: { position: [8.6, 2.15, 13.2], target: [0, 1.95, 0], fov: 25, shift: [0.25, -0.02] },
  heroTall: { position: [6.23, 3.25, 12.28], target: [-0.2, 1.5, 0.9], fov: 28, shift: [-0.06, 0.04] },
  front: { position: [0, 2.0, 22], target: [0, 2.0, 0], fov: 13.5 },
  joint: { position: [-0.62, 0.84, 1.52], target: [-1.48, 0.52, 0.0], fov: 34 },
  plan: { position: [0.001, 15.5, 0.6], target: [0, 0, 0], fov: 30 },
  field: { position: [4.7, 1.9, 6.1], target: [1.3, 0.8, 0.0], fov: 34 },
  range: { position: [7.5, 2.8, 27], target: [0.4, 1.5, 0], fov: 21 },
  options: { position: [0.6, 3.2, 12.5], target: [0, 1.0, 0], fov: 30 },
  layers: { position: [5.6, 1.5, 13.6], target: [0, 3.72, 0], fov: 31 },
  night: { position: [6.2, 1.3, 9.8], target: [0, 1.8, 0], fov: 29, shift: [0.27, 0] },
  racked: { position: [4.9, 1.45, 9.6], target: [0.2, 1.55, 0.4], fov: 30, shift: [0.08, 0] },
} satisfies Record<string, CameraPose>;
