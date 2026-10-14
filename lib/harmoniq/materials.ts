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
  contactGlow: THREE.ShaderMaterial;
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
        float g = exp(-d * d / 0.8) * 0.22 + exp(-d * d / 18.0) * 0.045;
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

/**
 * Light spill from the contacts onto the liner when they "warm up". All five
 * halos share one mesh: per-vertex index → uGlow[i]; the explode offset is
 * applied in the vertex shader so the halos travel with their pads.
 */
export function createContactGlowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGlow: { value: [0, 0, 0, 0, 0] },
      uExplode: { value: 0 },
      uColor: { value: new THREE.Color('#ffc890') },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aLocal;
      attribute vec2 aHalf;
      attribute float aIndex;
      attribute vec3 aDir;
      uniform float uExplode;
      uniform float uGlow[5];
      varying vec2 vLocal;
      varying vec2 vHalf;
      varying float vGlow;
      void main() {
        vLocal = aLocal;
        vHalf = aHalf;
        int i = int(aIndex + 0.5);
        float g = 0.0;
        for (int k = 0; k < 5; k++) if (k == i) g = uGlow[k];
        vGlow = g;
        vec3 p = position + aDir * uExplode;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vLocal;
      varying vec2 vHalf;
      varying float vGlow;
      uniform vec3 uColor;
      void main() {
        if (vGlow <= 0.001) discard;
        vec2 p = vLocal;
        p.x = max(abs(p.x) - (vHalf.x - vHalf.y), 0.0);
        float d = max(length(p) - vHalf.y, 0.0);
        float a = (exp(-d * d / 10.0) * 0.55 + exp(-d * d / 40.0) * 0.15) * vGlow;
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createMaterials(quality: Quality = 'high'): HarmoniqMaterials {
  const brushed = createBrushedTextures();
  // Brush hairlines: one tile spans ~60 mm along the band and ~50 mm across
  // (rows ≈ 0.1 mm). Anisotropy carries the brushed read; this is fine grain.
  brushed.roughness.repeat.set(0.17, 0.1);
  brushed.normal.repeat.set(0.17, 0.1);
  const knit = createKnitTextures();
  knit.normal.repeat.set(2.4, 2.4);
  knit.color.repeat.set(2.4, 2.4);
  const foam = createFoamNormalTexture();
  foam.repeat.set(0.9, 0.9);
  const grain = createGrainNormalTexture();
  grain.repeat.set(2, 2);

  const titanium = new THREE.MeshPhysicalMaterial({
    name: 'titanium',
    color: '#b6b4b0',
    metalness: 1,
    roughness: 0.27,
    roughnessMap: brushed.roughness,
    normalMap: brushed.normal,
    normalScale: new THREE.Vector2(0.08, 0.08),
    anisotropy: 0.55,
    anisotropyRotation: 0,
    envMapIntensity: 1,
  });

  // Laser-etched titanium: a dark, matte oxide, far less metallic than the
  // brushed surface around it.
  const etch = new THREE.MeshPhysicalMaterial({
    name: 'etch',
    color: '#55524e',
    metalness: 0.4,
    roughness: 0.65,
    envMapIntensity: 0.6,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const textile = new THREE.MeshPhysicalMaterial({
    name: 'textile',
    color: '#8a8987',
    map: knit.color,
    roughness: 0.95,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color(PALETTE.textileSheen),
    sheenRoughness: 0.35,
    normalMap: knit.normal,
    normalScale: new THREE.Vector2(1, 1),
  });

  const liner = new THREE.MeshPhysicalMaterial({
    name: 'liner',
    color: '#403f3d',
    roughness: 0.62,
    metalness: 0,
    normalMap: grain,
    normalScale: new THREE.Vector2(0.12, 0.12),
    sheen: 0.35,
    sheenColor: new THREE.Color('#5d5a57'),
    sheenRoughness: 0.6,
  });

  const earRest = new THREE.MeshPhysicalMaterial({
    name: 'earRest',
    color: '#3b3a3a',
    roughness: 0.72,
    metalness: 0,
    normalMap: grain,
    normalScale: new THREE.Vector2(0.1, 0.1),
    sheen: 0.5,
    sheenColor: new THREE.Color('#77757a'),
    sheenRoughness: 0.6,
  });

  const contactBase = new THREE.MeshPhysicalMaterial({
    name: 'contact',
    color: '#dccbb4',
    metalness: 1,
    roughness: 0.33,
    emissive: new THREE.Color('#ffcc94'),
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
    color: '#2e2c2a',
    roughness: 1,
    metalness: 0,
    normalMap: foam,
    normalScale: new THREE.Vector2(1.2, 1.2),
    sheen: 0.6,
    sheenColor: new THREE.Color('#6e6a65'),
    sheenRoughness: 0.9,
  });

  const glass =
    quality === 'high'
      ? new THREE.MeshPhysicalMaterial({
          name: 'glass',
          color: '#c9ccd2',
          metalness: 0,
          roughness: 0.04,
          transmission: 0.95,
          // thickness is in model units (mm × worldScale) while attenuationDistance
          // is in world units: 8 mm of glass, ~7 mm to fall to the smoke colour.
          thickness: 8,
          ior: 1.5,
          attenuationColor: new THREE.Color('#5a5650'),
          attenuationDistance: 0.1,
          clearcoat: 0.8,
          clearcoatRoughness: 0.05,
          specularIntensity: 0.7,
          envMapIntensity: 1.1,
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
    color: '#2b2c30',
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.2,
  });

  const bezel = new THREE.MeshPhysicalMaterial({
    name: 'bezel',
    color: '#2b2b2d',
    roughness: 0.6,
    metalness: 0.2,
  });

  const light = new THREE.MeshBasicMaterial({
    name: 'light',
    color: new THREE.Color(PALETTE.signal).multiplyScalar(1.6),
    toneMapped: false,
  });

  const glow = createGlowMaterial();
  const contactGlow = createContactGlowMaterial();

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
    contactGlow,
    dispose() {
      textures.forEach((t) => t.dispose());
      etch.alphaMap?.dispose();
      [titanium, etch, textile, liner, earRest, gasket, glass, glassCore, bezel, light, glow, contactGlow, ...contacts].forEach((m) =>
        m.dispose(),
      );
    },
  };
}
