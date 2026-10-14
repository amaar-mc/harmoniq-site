import * as THREE from 'three';
import {
  createBrushedTextures,
  createFoamNormalTexture,
  createGrainNormalTexture,
  createKnitTextures,
} from './textures';

export type Quality = 'high' | 'low';

export const PALETTE = {
  titanium: '#B9B6B0',
  titaniumEtch: '#6F6C67',
  textile: '#8D8A86',
  textileSheen: '#D9D5CF',
  graphite: '#2A2A2C',
  earRest: '#38383B',
  champagne: '#CDB79C',
  gasket: '#1C1C1E',
  glass: '#2E2F33',
  signal: '#F4F6F8',
} as const;

export interface HarmoniqMaterials {
  titanium: THREE.MeshPhysicalMaterial;
  etch: THREE.MeshPhysicalMaterial;
  textile: THREE.MeshPhysicalMaterial;
  liner: THREE.MeshPhysicalMaterial;
  earRest: THREE.MeshPhysicalMaterial;
  contacts: THREE.MeshPhysicalMaterial[];
  gasket: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  glassCore: THREE.MeshPhysicalMaterial;
  bezel: THREE.MeshPhysicalMaterial;
  light: THREE.MeshBasicMaterial;
  glow: THREE.ShaderMaterial;
  dispose(): void;
}

/** Soft, restrained glow around the light line (analytic stadium falloff). */
export function createGlowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 1 },
      uColor: { value: new THREE.Color(PALETTE.signal) },
      uHalf: { value: new THREE.Vector2(7.5, 0.6) },
      uSize: { value: new THREE.Vector2(44, 16) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vLocal;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      uniform vec2 uSize;
      void main() {
        vLocal = (uv - 0.5) * uSize;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewW = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vLocal;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      uniform float uIntensity;
      uniform vec3 uColor;
      uniform vec2 uHalf;
      void main() {
        // Distance to the light line's centre segment (a stadium SDF).
        vec2 p = vLocal;
        p.x = max(abs(p.x) - (uHalf.x - uHalf.y), 0.0);
        float d = max(length(p) - uHalf.y, 0.0);
        float g = exp(-d * d / 2.2) * 0.42 + exp(-d * d / 26.0) * 0.07;
        float facing = smoothstep(0.0, 0.55, dot(normalize(vNormalW), normalize(vViewW)));
        float a = g * uIntensity * facing;
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createMaterials(quality: Quality = 'high'): HarmoniqMaterials {
  const brushed = createBrushedTextures();
  // Brush streaks: one tile spans ~60 mm along the band and ~90 mm across,
  // so each texel row is ~0.18 mm — visible as fine lines at hero scale.
  brushed.roughness.repeat.set(0.17, 0.11);
  brushed.normal.repeat.set(0.17, 0.11);
  const knit = createKnitTextures();
  knit.normal.repeat.set(1.25, 1.25);
  knit.color.repeat.set(1.25, 1.25);
  const foam = createFoamNormalTexture();
  foam.repeat.set(2.2, 2.2);
  const grain = createGrainNormalTexture();
  grain.repeat.set(2, 2);

  const titanium = new THREE.MeshPhysicalMaterial({
    name: 'titanium',
    color: '#b4b3b0',
    metalness: 1,
    roughness: 0.36,
    roughnessMap: brushed.roughness,
    normalMap: brushed.normal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    anisotropy: 0.5,
    anisotropyRotation: 0,
    envMapIntensity: 1,
  });

  const etch = new THREE.MeshPhysicalMaterial({
    name: 'etch',
    color: PALETTE.titaniumEtch,
    metalness: 0.85,
    roughness: 0.62,
    alphaTest: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  etch.alphaToCoverage = true;

  const textile = new THREE.MeshPhysicalMaterial({
    name: 'textile',
    color: '#7e7d7b',
    map: knit.color,
    roughness: 0.95,
    metalness: 0,
    sheen: 0.55,
    sheenColor: new THREE.Color('#bdbab5'),
    sheenRoughness: 0.55,
    normalMap: knit.normal,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });

  const liner = new THREE.MeshPhysicalMaterial({
    name: 'liner',
    color: '#4a4a4f',
    roughness: 0.5,
    metalness: 0,
    normalMap: grain,
    normalScale: new THREE.Vector2(0.12, 0.12),
    clearcoat: 0.35,
    clearcoatRoughness: 0.42,
  });

  const earRest = new THREE.MeshPhysicalMaterial({
    name: 'earRest',
    color: '#45454a',
    roughness: 0.55,
    metalness: 0,
    normalMap: grain,
    normalScale: new THREE.Vector2(0.1, 0.1),
    sheen: 0.25,
    sheenColor: new THREE.Color('#77757a'),
    sheenRoughness: 0.6,
  });

  const contactBase = new THREE.MeshPhysicalMaterial({
    name: 'contact',
    color: '#d4c6b2',
    metalness: 1,
    roughness: 0.27,
    emissive: new THREE.Color(PALETTE.champagne),
    emissiveIntensity: 0,
  });
  const contacts = Array.from({ length: 5 }, (_, i) => {
    const m = contactBase.clone();
    m.name = `contact_${i}`;
    return m;
  });
  contactBase.dispose();

  const gasket = new THREE.MeshPhysicalMaterial({
    name: 'gasket',
    color: '#222224',
    roughness: 0.95,
    metalness: 0,
    normalMap: foam,
    normalScale: new THREE.Vector2(0.6, 0.6),
  });

  const glass =
    quality === 'high'
      ? new THREE.MeshPhysicalMaterial({
          name: 'glass',
          color: '#7d8087',
          metalness: 0,
          roughness: 0.06,
          transmission: 0.95,
          thickness: 4,
          ior: 1.5,
          attenuationColor: new THREE.Color('#4b4d54'),
          attenuationDistance: 10,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          specularIntensity: 1,
        })
      : new THREE.MeshPhysicalMaterial({
          name: 'glass',
          color: '#3a3b40',
          metalness: 0,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          ior: 1.5,
        });

  const glassCore = new THREE.MeshPhysicalMaterial({
    name: 'glassCore',
    color: '#3b3c41',
    roughness: 0.55,
    metalness: 0.15,
    clearcoat: 0.2,
  });

  const bezel = new THREE.MeshPhysicalMaterial({
    name: 'bezel',
    color: '#4a4a4c',
    roughness: 0.35,
    metalness: 0.8,
  });

  const light = new THREE.MeshBasicMaterial({
    name: 'light',
    color: new THREE.Color(PALETTE.signal).multiplyScalar(1.6),
    toneMapped: false,
  });

  const glow = createGlowMaterial();

  const textures = [brushed.roughness, brushed.normal, knit.normal, knit.color, foam, grain];
  return {
    titanium,
    etch,
    textile,
    liner,
    earRest,
    contacts,
    gasket,
    glass,
    glassCore,
    bezel,
    light,
    glow,
    dispose() {
      textures.forEach((t) => t.dispose());
      etch.alphaMap?.dispose();
      [titanium, etch, textile, liner, earRest, gasket, glass, glassCore, bezel, light, glow, ...contacts].forEach((m) =>
        m.dispose(),
      );
    },
  };
}
