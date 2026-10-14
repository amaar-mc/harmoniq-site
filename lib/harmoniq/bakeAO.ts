import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';

/**
 * Bakes per-vertex ambient occlusion into a `color` attribute by ray casting
 * against the assembled device (three-mesh-bvh). Runs once at build time and
 * costs nothing per frame. Meshes flagged `userData.noAO` neither receive nor
 * occlude (decals, glow, glass); `userData.aoOccluderOnly` occludes only.
 *
 * Materials read the result through `patchAO`, whose `uAO` uniform fades the
 * occlusion out while the device is exploded.
 */
export interface AOOptions {
  rays?: number;
  /** Max occlusion distance (mm). */
  maxDist?: number;
  /** Ray origin offset along the normal (mm). */
  bias?: number;
  strength?: number;
}

function hemisphereSamples(count: number): THREE.Vector3[] {
  // Hammersley points mapped to a cosine-weighted hemisphere (+Z up).
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    let bits = i;
    bits = ((bits << 16) | (bits >>> 16)) >>> 0;
    bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
    bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
    bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
    bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
    const u = (i + 0.5) / count;
    const v = bits / 4294967296;
    const r = Math.sqrt(u);
    const phi = 2 * Math.PI * v;
    out.push(new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(Math.max(0, 1 - u))));
  }
  return out;
}

export function bakeVertexAO(root: THREE.Object3D, opts: AOOptions = {}) {
  const rays = opts.rays ?? 28;
  const maxDist = opts.maxDist ?? 9;
  const bias = opts.bias ?? 0.04;
  const strength = opts.strength ?? 1;
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const receivers: THREE.Mesh[] = [];
  const occluderGeos: THREE.BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.noAO) return;
    const local = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', m.geometry.getAttribute('position').clone());
    if (m.geometry.getIndex()) g.setIndex(m.geometry.getIndex()!.clone());
    g.applyMatrix4(local);
    occluderGeos.push(g.getIndex() ? g.toNonIndexed() : g);
    if (m.userData.aoConstant !== undefined) {
      const c = new Float32Array(m.geometry.getAttribute('position').count * 3).fill(m.userData.aoConstant);
      m.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
    } else if (!m.userData.aoOccluderOnly) receivers.push(m);
  });
  const merged = mergeGeometries(occluderGeos, false);
  occluderGeos.forEach((g) => g.dispose());
  const bvh = new MeshBVH(merged);
  const samples = hemisphereSamples(rays);
  const ray = new THREE.Ray();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const t = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  const helper = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  for (const m of receivers) {
    const local = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    nm.getNormalMatrix(local);
    const pos = m.geometry.getAttribute('position');
    const nor = m.geometry.getAttribute('normal');
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(local);
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      helper.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0);
      t.crossVectors(helper, n).normalize();
      b.crossVectors(n, t);
      let occ = 0;
      for (const s of samples) {
        d.set(0, 0, 0).addScaledVector(t, s.x).addScaledVector(b, s.y).addScaledVector(n, s.z).normalize();
        ray.origin.copy(p).addScaledVector(n, bias);
        ray.direction.copy(d);
        const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
        if (hit && hit.distance < maxDist) {
          const k = hit.distance / maxDist;
          occ += 1 - k * k;
        }
      }
      const ao = Math.max(0, 1 - (occ / rays) * strength);
      const v = Math.pow(ao, 1.1);
      colors[i * 3] = v;
      colors[i * 3 + 1] = v;
      colors[i * 3 + 2] = v;
    }
    m.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  merged.dispose();
}

/**
 * Makes a material multiply its diffuse/specular colour by the baked AO,
 * scaled by a shared uniform so occlusion can fade out during the explode.
 */
export function patchAO(material: THREE.Material, uniform: { value: number }) {
  const m = material as THREE.MeshPhysicalMaterial;
  m.vertexColors = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev?.call(m, shader, renderer);
    shader.uniforms.uAO = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uAO;\nvoid main() {')
      .replace(
        '#include <color_fragment>',
        '#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n  diffuseColor.rgb *= mix( vec3( 1.0 ), vColor.rgb, uAO );\n#endif',
      );
  };
  m.customProgramCacheKey = () => 'ao';
  m.needsUpdate = true;
}
