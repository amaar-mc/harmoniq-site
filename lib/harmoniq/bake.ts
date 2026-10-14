import * as THREE from 'three';
import { HARMONIQ_CONFIG, PART_NAMES, type HarmoniqConfig, type PartName } from './config';
import { finishModel, type HarmoniqModel } from './createHarmoniqModel';
import { Band } from './geometry/band';
import { createMaterials, type HarmoniqMaterials, type Quality } from './materials';
import { createWordmarkTexture } from './textures';

/**
 * Baked model format ("HQB1"). The procedural generator stays the source of
 * truth; `scripts/bake-model.mjs` runs it once (geometry + ray-cast AO, the
 * slow part) and stores the result, so the site only has to parse buffers and
 * build materials. Layout: magic, u32 JSON length, JSON (padded to 4 bytes),
 * then the binary chunks the JSON points into.
 *
 * Positions and UVs are quantised to uint16 per component (≈0.003 mm at this
 * size), normals and tangents stored as normalized int16, AO as uint8.
 */

const MAGIC = 0x31425148; // 'HQB1'

type ArrayKind = 'f32' | 'i16' | 'u8' | 'u16' | 'u32';

interface Chunk {
  kind: ArrayKind;
  offset: number;
  length: number;
}

interface AttrJSON extends Chunk {
  itemSize: number;
  normalized: boolean;
  /** Quantised to uint16 between per-component min and max (decoded to float32 on load). */
  quant?: { min: number[]; max: number[] };
}

interface GeometryJSON {
  attributes: Record<string, AttrJSON>;
  index?: Chunk;
}

interface NodeJSON {
  parent: number;
  type: 'group' | 'mesh';
  name: string;
  userData: Record<string, unknown>;
  p: number[];
  q: number[];
  s: number[];
  geometry?: number;
  material?: string;
  renderOrder?: number;
  frustumCulled?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

interface BakeJSON {
  version: 1;
  quality: Quality;
  nodes: NodeJSON[];
  geometries: GeometryJSON[];
  anchors: Record<string, number[]>;
  explode: Partial<Record<PartName, number[]>>;
}

const CTOR = { f32: Float32Array, i16: Int16Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array };

function materialKeys(mats: HarmoniqMaterials) {
  const map = new Map<THREE.Material, string>();
  for (const [k, v] of Object.entries(mats)) {
    if (Array.isArray(v)) v.forEach((m, i) => map.set(m, `${k}.${i}`));
    else if (v instanceof THREE.Material) map.set(v, k);
  }
  return map;
}

function resolveMaterial(mats: HarmoniqMaterials, key: string): THREE.Material {
  const [k, i] = key.split('.');
  const v = (mats as unknown as Record<string, THREE.Material | THREE.Material[]>)[k];
  return Array.isArray(v) ? v[Number(i)] : v;
}

/** Serialises a generated model (geometry, AO, hierarchy, anchors). */
export function serializeModel(model: HarmoniqModel, quality: Quality): ArrayBuffer {
  const content = model.group.getObjectByName('content')!;
  const device = content.getObjectByName('device')!;
  const keys = materialKeys(model.materials);
  const chunks: ArrayBufferView[] = [];
  let offset = 0;
  const push = (arr: ArrayBufferView): Chunk => {
    const kind: ArrayKind =
      arr instanceof Float32Array ? 'f32' : arr instanceof Int16Array ? 'i16' : arr instanceof Uint8Array ? 'u8' : arr instanceof Uint16Array ? 'u16' : 'u32';
    const c: Chunk = { kind, offset, length: (arr as Float32Array).length };
    chunks.push(arr);
    offset += arr.byteLength;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      offset += pad;
    }
    return c;
  };

  const geoIndex = new Map<THREE.BufferGeometry, number>();
  const geometries: GeometryJSON[] = [];
  const encodeGeometry = (g: THREE.BufferGeometry) => {
    const found = geoIndex.get(g);
    if (found !== undefined) return found;
    const attributes: Record<string, AttrJSON> = {};
    for (const [name, attr] of Object.entries(g.attributes)) {
      const a = attr as THREE.BufferAttribute;
      const n = a.count * a.itemSize;
      const src = new Float32Array(n);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) src[i * a.itemSize + c] = a.getComponent(i, c);
      let data: ArrayBufferView = src;
      let normalized = false;
      let quant: AttrJSON['quant'];
      if (name === 'position' || name === 'uv') {
        const min = new Array(a.itemSize).fill(Infinity);
        const max = new Array(a.itemSize).fill(-Infinity);
        for (let i = 0; i < n; i++) {
          const c = i % a.itemSize;
          min[c] = Math.min(min[c], src[i]);
          max[c] = Math.max(max[c], src[i]);
        }
        const q = new Uint16Array(n);
        for (let i = 0; i < n; i++) {
          const c = i % a.itemSize;
          const r = max[c] - min[c];
          q[i] = r > 0 ? Math.round(((src[i] - min[c]) / r) * 65535) : 0;
        }
        data = q;
        quant = { min, max };
      } else if (name === 'normal' || name === 'tangent') {
        const q = new Int16Array(n);
        for (let i = 0; i < n; i++) q[i] = Math.round(Math.max(-1, Math.min(1, src[i])) * 32767);
        data = q;
        normalized = true;
      } else if (name === 'color') {
        const q = new Uint8Array(n);
        for (let i = 0; i < n; i++) q[i] = Math.round(Math.max(0, Math.min(1, src[i])) * 255);
        data = q;
        normalized = true;
      }
      attributes[name] = { ...push(data), itemSize: a.itemSize, normalized, quant };
    }
    const idx = g.getIndex();
    let index: Chunk | undefined;
    if (idx) {
      const big = g.getAttribute('position').count > 65535;
      const arr = big ? new Uint32Array(idx.count) : new Uint16Array(idx.count);
      for (let i = 0; i < idx.count; i++) arr[i] = idx.getX(i);
      index = push(arr);
    }
    geometries.push({ attributes, index });
    geoIndex.set(g, geometries.length - 1);
    return geometries.length - 1;
  };

  const nodes: NodeJSON[] = [];
  const walk = (obj: THREE.Object3D, parent: number) => {
    for (const child of obj.children) {
      const mesh = child as THREE.Mesh;
      const node: NodeJSON = {
        parent,
        type: mesh.isMesh ? 'mesh' : 'group',
        name: child.name,
        userData: { ...child.userData },
        p: child.position.toArray(),
        q: child.quaternion.toArray(),
        s: child.scale.toArray(),
      };
      if (mesh.isMesh) {
        node.geometry = encodeGeometry(mesh.geometry);
        const key = keys.get(mesh.material as THREE.Material);
        if (!key) throw new Error(`Unknown material on ${child.name}`);
        node.material = key;
        node.renderOrder = mesh.renderOrder;
        node.frustumCulled = mesh.frustumCulled;
        node.castShadow = mesh.castShadow;
        node.receiveShadow = mesh.receiveShadow;
      }
      nodes.push(node);
      walk(child, nodes.length - 1);
    }
  };
  // Parts must be serialised at rest.
  model.setExplode(0);
  walk(device, -1);

  const anchors: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(model.anchors)) anchors[k] = v.clone().sub(content.position).toArray();
  const explode: Partial<Record<PartName, number[]>> = {};
  for (const [k, v] of Object.entries(model.explodeDir)) if (v) explode[k as PartName] = v.toArray();

  const json: BakeJSON = { version: 1, quality, nodes, geometries, anchors, explode };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
  const head = 8 + jsonBytes.byteLength + jsonPad;
  const out = new Uint8Array(head + offset);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, jsonBytes.byteLength + jsonPad, true);
  out.set(jsonBytes, 8);
  out.fill(0x20, 8 + jsonBytes.byteLength, head);
  let o = head;
  for (const c of chunks) {
    out.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), o);
    o += c.byteLength;
  }
  return out.buffer;
}

/** Rebuilds a model from a bake: no geometry generation, no AO ray casting. */
export function loadBakedModel(
  buffer: ArrayBuffer,
  options: { fontFamily?: string; config?: HarmoniqConfig } = {},
): HarmoniqModel {
  const cfg = options.config ?? HARMONIQ_CONFIG;
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('Not a Harmoniq bake');
  const jsonLen = dv.getUint32(4, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, jsonLen))) as BakeJSON;
  const bin = 8 + jsonLen;
  const view = (c: Chunk) => new CTOR[c.kind](buffer, bin + c.offset, c.length);

  const quality = json.quality;
  const mats = createMaterials(quality);
  const geos = json.geometries.map((gj) => {
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(gj.attributes)) {
      if (a.quant) {
        const q = view(a);
        const f = new Float32Array(q.length);
        const { min, max } = a.quant;
        for (let i = 0; i < q.length; i++) {
          const c = i % a.itemSize;
          f[i] = min[c] + (q[i] / 65535) * (max[c] - min[c]);
        }
        g.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
      } else g.setAttribute(name, new THREE.BufferAttribute(view(a), a.itemSize, a.normalized));
    }
    if (gj.index) g.setIndex(new THREE.BufferAttribute(view(gj.index), 1));
    g.computeBoundingSphere();
    return g;
  });

  const device = new THREE.Group();
  device.name = 'device';
  const parts = {} as Record<PartName, THREE.Object3D>;
  const objs: THREE.Object3D[] = [];
  for (const n of json.nodes) {
    let obj: THREE.Object3D;
    if (n.type === 'mesh') {
      const m = new THREE.Mesh(geos[n.geometry!], resolveMaterial(mats, n.material!));
      m.renderOrder = n.renderOrder ?? 0;
      m.frustumCulled = n.frustumCulled ?? true;
      m.castShadow = n.castShadow ?? false;
      m.receiveShadow = n.receiveShadow ?? false;
      obj = m;
    } else obj = new THREE.Group();
    obj.name = n.name;
    Object.assign(obj.userData, n.userData);
    obj.position.fromArray(n.p);
    obj.quaternion.fromArray(n.q);
    obj.scale.fromArray(n.s);
    (n.parent < 0 ? device : objs[n.parent]).add(obj);
    objs.push(obj);
    const part = n.userData.part as PartName | undefined;
    if (part && (PART_NAMES as readonly string[]).includes(part)) parts[part] = obj;
  }

  // Runtime-only material state (same as the generator).
  const L = cfg.lightLine;
  mats.glow.uniforms.uHalf.value.set(L.length / 2, L.height / 2);
  mats.glow.uniforms.uSize.value.set(52, 22);
  const family = options.fontFamily ?? 'Inter, "Helvetica Neue", Arial, sans-serif';
  mats.etch.alphaMap = createWordmarkTexture(cfg.wordmark.text, family, 300).texture;
  mats.etch.needsUpdate = true;

  const explodeDir: Partial<Record<PartName, THREE.Vector3>> = {};
  for (const [k, v] of Object.entries(json.explode)) if (v) explodeDir[k as PartName] = new THREE.Vector3().fromArray(v);
  const rawAnchors: Record<string, THREE.Vector3> = {};
  for (const [k, v] of Object.entries(json.anchors)) rawAnchors[k] = new THREE.Vector3().fromArray(v);

  return finishModel({ device, parts, explodeDir, mats, cfg, band: new Band(cfg), quality, rawAnchors, bakeAO: false });
}
