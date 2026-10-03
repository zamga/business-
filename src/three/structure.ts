/**
 * The BERGWEISS structure as a physical model. The five members sit on the
 * mark's own 100-unit grid and keep its 4-unit gaps. In the model those gaps
 * are steel joints: shoes under and over the columns, and pins that fix the
 * brace into its corners. Members are cast in pale mineral concrete; the brace
 * is red-painted steel. Shared by the live hero and the offline renderer, so
 * every image of the brand comes from one source.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type MemberKey = 'base' | 'left' | 'right' | 'beam' | 'brace';
export const memberOrder: MemberKey[] = ['base', 'left', 'right', 'beam', 'brace'];

/** World units per unit of the 100-unit mark grid: the frame is 4 units wide. */
export const UNIT = 0.04;
/** Member section: 8 grid units square. */
export const SECTION = 8 * UNIT;
/** Height of the assembled frame in world units. */
export const FRAME_HEIGHT = 100 * UNIT;

interface MemberSpec {
  size: [number, number, number];
  position: [number, number, number];
  rotationZ: number;
}

/** Positions are the mark's rectangles with y pointing up and the origin at the base's centre. */
export const memberSpecs: Record<MemberKey, MemberSpec> = {
  base: { size: [100 * UNIT, SECTION, SECTION], position: [0, 4 * UNIT, 0], rotationZ: 0 },
  left: { size: [SECTION, 76 * UNIT, SECTION], position: [-46 * UNIT, 50 * UNIT, 0], rotationZ: 0 },
  right: { size: [SECTION, 76 * UNIT, SECTION], position: [46 * UNIT, 50 * UNIT, 0], rotationZ: 0 },
  beam: { size: [100 * UNIT, SECTION, SECTION], position: [0, 96 * UNIT, 0], rotationZ: 0 },
  brace: { size: [99 * UNIT, 0.82 * SECTION, 0.82 * SECTION], position: [0, 50 * UNIT, 0], rotationZ: Math.PI / 4 },
};

/* ------------------------------------------------------------ textures */

/** Deterministic PRNG so every render of the brand is identical. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable smooth value noise in [0, 1]. */
function valueNoise(size: number, cells: number, rand: () => number): Float32Array {
  const grid = new Float32Array(cells * cells).map(() => rand());
  const at = (x: number, y: number) => grid[(y % cells) * cells + (x % cells)]!;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      out[y * size + x] = a + (b - a) * sy;
    }
  }
  return out;
}

interface SurfaceMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Fair-faced concrete: soft cloudy mottling, fine aggregate, and the odd air
 * pore. Albedo, roughness and height all come from one height field.
 */
function concreteMaps(seed: number, tint: [number, number, number], size: number): SurfaceMaps {
  const rand = mulberry32(seed);
  const cloud = valueNoise(size, 5, rand);
  const mottle = valueNoise(size, 17, rand);
  const fine = valueNoise(size, 64, rand);
  const n = size * size;
  const height = new Float32Array(n);
  const tone = new Float32Array(n);
  const grain = mulberry32(seed + 7);
  for (let i = 0; i < n; i++) {
    const g = grain();
    // Aggregate: a sparse scatter of slightly darker and lighter grains.
    const aggregate = g < 0.05 ? -0.05 : g > 0.985 ? 0.035 : (g - 0.5) * 0.016;
    tone[i] = 0.085 * (cloud[i]! - 0.5) + 0.04 * (mottle[i]! - 0.5) + aggregate;
    height[i] = 0.55 + 0.25 * (fine[i]! - 0.5) + 0.15 * (mottle[i]! - 0.5) + aggregate * 2;
  }
  // Air pores: small, sharp pits.
  const pores = Math.round((size * size) / 2600);
  for (let p = 0; p < pores; p++) {
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    const r = 0.8 + rand() * (size / 512) * 1.6;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d > 1) continue;
        const i = ((cy + dy + size) % size) * size + ((cx + dx + size) % size);
        height[i] = Math.min(height[i]!, 0.1 + 0.4 * d * d);
        tone[i] = Math.min(tone[i]!, -0.12 * (1 - d));
      }
    }
  }

  const make = (fn: (i: number) => [number, number, number]) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < n; i++) {
      const [r, g, b] = fn(i);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  };

  const map = make((i) => {
    const k = 1 + tone[i]!;
    return [Math.min(255, tint[0] * k), Math.min(255, tint[1] * k), Math.min(255, tint[2] * k)];
  });
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = make((i) => {
    const v = 214 + 60 * (height[i]! - 0.55);
    return [v, v, v];
  });
  const bumpMap = make((i) => {
    const v = 255 * Math.min(1, Math.max(0, height[i]!));
    return [v, v, v];
  });
  return { map, roughnessMap, bumpMap };
}

/**
 * Box projection: every face gets UVs from its own two axes, so the surface
 * keeps one scale along a 4-unit beam and across its 0.3-unit face.
 */
function boxProjectUVs(geometry: THREE.BufferGeometry, density: number, offset: [number, number]): void {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const nor = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) {
      u = z;
      v = y;
    } else if (ay >= az) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * density + offset[0];
    uv[i * 2 + 1] = v * density + offset[1];
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/* ------------------------------------------------------------ materials */

export interface StructureMaterials {
  concrete: THREE.MeshStandardMaterial;
  steel: THREE.MeshPhysicalMaterial;
  fixings: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  ghost: THREE.MeshStandardMaterial;
  ghostFixings: THREE.MeshStandardMaterial;
}

export interface MaterialOptions {
  /** Texture resolution: 1024 for stills; 384 is plenty live. */
  textureSize?: number;
}

export function createMaterials(options: MaterialOptions = {}): StructureMaterials {
  const size = options.textureSize ?? 512;
  const c = concreteMaps(11, [201, 200, 196], size);
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: c.map,
    roughness: 1,
    roughnessMap: c.roughnessMap,
    bumpMap: c.bumpMap,
    bumpScale: 0.9,
    metalness: 0,
  });

  const paint = concreteMaps(23, [255, 255, 255], Math.min(size, 256));
  const steel = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#952a1c'),
    roughness: 0.5,
    roughnessMap: paint.roughnessMap,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.5,
  });

  // Galvanised steel: light, matte-metallic, quieter than the concrete it joins.
  const fixings = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b4b5b2'),
    metalness: 0.75,
    roughness: 0.42,
    envMapIntensity: 4,
  });

  const plinth = concrete.clone();
  plinth.color = new THREE.Color('#f6f3ee');

  const ghost = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9d6cf'), roughness: 0.92 });
  const ghostFixings = new THREE.MeshStandardMaterial({ color: new THREE.Color('#cfcac1'), roughness: 0.8 });

  return { concrete, steel, fixings, plinth, ghost, ghostFixings };
}

/* ------------------------------------------------------------ the frame */

export interface FrameOptions {
  braced?: boolean;
  /** Members in the pale "ghost" finish, for structures not yet decided. */
  ghost?: boolean;
  /** Seed for where each member's texture starts, so no two members match. */
  seed?: number;
}

export interface Frame {
  group: THREE.Group;
  members: Partial<Record<MemberKey, THREE.Object3D>>;
}

function shadowed<T extends THREE.Object3D>(object: T): T {
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return object;
}

/** Steel shoe filling a 4-unit gap at a column end, set back so the gap still reads. */
function shoe(material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new RoundedBoxGeometry(4.4 * UNIT, 4 * UNIT, 4.4 * UNIT, 2, 0.003), material);
}

/**
 * Brace end: a thin cap plate, a pin along the brace axis, and a steel angle
 * seated in the frame's inner corner. `sign` picks the end (+1 upper right).
 */
function braceJoint(material: THREE.Material, sign: 1 | -1): THREE.Group {
  const joint = new THREE.Group();
  const end = 49.5 * UNIT;
  const corner = 42 * Math.SQRT2 * UNIT;
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.6 * UNIT, 6.9 * UNIT, 6.9 * UNIT, 1, 0.002), material);
  cap.position.x = sign * (end + 0.3 * UNIT);
  const pinLength = corner - end - 1.9 * UNIT;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.25 * UNIT, 1.25 * UNIT, pinLength, 24), material);
  pin.rotation.z = Math.PI / 2;
  pin.position.x = sign * (end + pinLength / 2);
  // The angle is square to the frame, not to the brace.
  const angle = new THREE.Group();
  angle.position.x = sign * corner;
  angle.rotation.z = -Math.PI / 4;
  const flat = new THREE.Mesh(new RoundedBoxGeometry(5.5 * UNIT, 0.8 * UNIT, 6 * UNIT, 1, 0.002), material);
  flat.position.set(-sign * 2.75 * UNIT, -sign * 0.4 * UNIT, 0);
  const upright = new THREE.Mesh(new RoundedBoxGeometry(0.8 * UNIT, 5.5 * UNIT, 6 * UNIT, 1, 0.002), material);
  upright.position.set(-sign * 0.4 * UNIT, -sign * 2.75 * UNIT, 0);
  angle.add(flat, upright);
  joint.add(cap, pin, angle);
  return joint;
}

export function createFrame(materials: StructureMaterials, options: FrameOptions = {}): Frame {
  const { braced = true, ghost = false, seed = 1 } = options;
  const rand = mulberry32(seed * 101);
  const group = new THREE.Group();
  const members: Partial<Record<MemberKey, THREE.Object3D>> = {};
  const fixings = ghost ? materials.ghostFixings : materials.fixings;

  for (const key of memberOrder) {
    if (key === 'brace' && !braced) continue;
    const spec = memberSpecs[key];
    const [w, h, d] = spec.size;
    const isBrace = key === 'brace';
    const geometry = new RoundedBoxGeometry(w, h, d, 3, 0.012);
    if (!isBrace) boxProjectUVs(geometry, 0.9, [rand() * 8, rand() * 8]);
    const mesh = new THREE.Mesh(geometry, isBrace ? materials.steel : ghost ? materials.ghost : materials.concrete);

    // Each member sits in a pivot so assembly offsets never fight its own rotation.
    const pivot = new THREE.Group();
    pivot.position.set(...spec.position);
    pivot.rotation.z = spec.rotationZ;
    pivot.add(mesh);

    if (key === 'left' || key === 'right') {
      const reach = h / 2 + 2 * UNIT;
      for (const s of [-1, 1]) {
        const part = shoe(fixings);
        part.position.y = s * reach;
        pivot.add(part);
      }
    }
    if (isBrace) pivot.add(braceJoint(fixings, 1), braceJoint(fixings, -1));

    group.add(shadowed(pivot));
    members[key] = pivot;
  }
  return { group, members };
}

/* ------------------------------------------------------------ assembly */

export interface MemberPose {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

/**
 * Exploded offsets: every member waits outside the frame on the side it
 * enters from, as in the mark's own animation. The brace slides home along
 * its axis. Nothing passes through the floor.
 */
export const explodedOffsets: Record<MemberKey, { offset: [number, number, number]; spin: [number, number, number] }> = {
  base: { offset: [0.0, 0.0, 1.6], spin: [0.0, 0.25, 0.0] },
  left: { offset: [-1.0, 1.0, 0.6], spin: [0.0, -0.25, 0.12] },
  right: { offset: [1.0, 1.25, -0.5], spin: [0.0, 0.22, -0.1] },
  beam: { offset: [0.15, 1.35, 0.35], spin: [0.1, -0.18, 0.0] },
  brace: { offset: [1.25, 1.25, 0.0], spin: [0.0, 0.0, 0.0] },
};

export function captureRestPoses(frame: Frame): Partial<Record<MemberKey, MemberPose>> {
  const poses: Partial<Record<MemberKey, MemberPose>> = {};
  for (const key of memberOrder) {
    const obj = frame.members[key];
    if (obj) poses[key] = { position: obj.position.clone(), rotation: obj.rotation.clone() };
  }
  return poses;
}

export const easeOutExpo = (x: number): number => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Where each member's travel starts within the assembly, and its share of it. */
const ASSEMBLY_STAGGER = 0.15;
const ASSEMBLY_TRAVEL = 0.4;

/**
 * Places every member for an assembly progress in [0, 1]. Members arrive in
 * the order a transaction is built, overlapping, each with a decisive settle.
 */
export function applyAssembly(frame: Frame, rest: Partial<Record<MemberKey, MemberPose>>, progress: number): void {
  memberOrder.forEach((key, i) => {
    const obj = frame.members[key];
    const base = rest[key];
    if (!obj || !base) return;
    const local = Math.min(1, Math.max(0, (progress - i * ASSEMBLY_STAGGER) / ASSEMBLY_TRAVEL));
    const k = 1 - (key === 'brace' ? easeInOutCubic(local) : easeOutExpo(local));
    const ex = explodedOffsets[key];
    obj.position.set(
      base.position.x + ex.offset[0] * k,
      base.position.y + ex.offset[1] * k,
      base.position.z + ex.offset[2] * k,
    );
    obj.rotation.set(base.rotation.x + ex.spin[0] * k, base.rotation.y + ex.spin[1] * k, base.rotation.z + ex.spin[2] * k);
  });
}

/** Progress at which a member locks into place, for captions synced to the film. */
export function lockProgress(index: number): number {
  return index * ASSEMBLY_STAGGER + ASSEMBLY_TRAVEL;
}
