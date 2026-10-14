'use client';

import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Product-shoot studio: a soft gradient sweep plus rectangular light panels
 * rendered once into the environment map. Long strip panels give the brushed
 * titanium its long strip highlights; black flags give the metal edges.
 */
interface DomeColors {
  top: string;
  upper: string;
  horizon: string;
  floor: string;
  floorDeep: string;
  /** Strength of the soft shadow side (back-right of the set). */
  shade: number;
}

function GradientDome({ colors }: { colors: DomeColors }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(colors.top) },
          uUpper: { value: new THREE.Color(colors.upper) },
          uHorizon: { value: new THREE.Color(colors.horizon) },
          uFloor: { value: new THREE.Color(colors.floor) },
          uFloorDeep: { value: new THREE.Color(colors.floorDeep) },
          uShade: { value: colors.shade },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          uniform vec3 uTop, uUpper, uHorizon, uFloor, uFloorDeep;
          uniform float uShade;
          void main() {
            vec3 d = normalize(vDir);
            float y = d.y;
            vec3 sky = mix(uUpper, uTop, smoothstep(0.1, 0.9, y));
            vec3 floorC = mix(uFloor, uFloorDeep, smoothstep(-0.05, -0.85, y));
            vec3 c = y > 0.02 ? sky : floorC;
            // Soft dark horizon band: gives vertical metal faces an edge.
            float band = 1.0 - smoothstep(0.0, 0.12, abs(y - 0.03));
            c = mix(c, uHorizon, band * 0.85);
            // Shade side of the set (back, wearer's right) for contrast.
            float k = smoothstep(0.15, 0.95, dot(d, normalize(vec3(-0.85, 0.05, -0.55))));
            c *= 1.0 - k * uShade;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [colors],
  );
  return (
    <mesh material={material} scale={40}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  );
}

const LIGHT_DOME: DomeColors = {
  top: '#9e9e9d',
  upper: '#727271',
  horizon: '#232323',
  floor: '#a9a49c',
  floorDeep: '#938f88',
  shade: 0.3,
};

const DARK_DOME: DomeColors = {
  top: '#3a3a3d',
  upper: '#1a1a1c',
  horizon: '#070707',
  floor: '#2a2928',
  floorDeep: '#1d1c1b',
  shade: 0.5,
};

export type StudioMood = 'light' | 'dark';

export function StudioEnvironment({ mood = 'light', intensity = 1 }: { mood?: StudioMood; intensity?: number }) {
  const light = mood === 'light';
  return (
    <Environment key={mood} resolution={512} frames={1} environmentIntensity={intensity}>
      <GradientDome colors={light ? LIGHT_DOME : DARK_DOME} />
      {/* Overhead softbox */}
      <Lightformer form="rect" intensity={light ? 1.6 : 1.8} position={[0, 7, 1]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
      {/* Large key softbox, camera-left front, slightly above */}
      <Lightformer form="rect" intensity={light ? 2.2 : 1.6} position={[6.5, 3.2, 4.5]} scale={[7, 4.5, 1]} target={[0, 0, 0]} />
      {/* Long key strip: the long highlight that runs along the band */}
      <Lightformer form="rect" intensity={light ? 3.4 : 2.8} position={[5.5, 1.1, 5]} scale={[20, 0.7, 1]} target={[0, 0, 0]} />
      {/* Low strip below the horizon: vertical titanium faces seen from above
          mirror it as the long highlight along the band */}
      <Lightformer form="rect" intensity={light ? 1.8 : 1.6} position={[3.5, -1.6, 5.5]} scale={[24, 0.8, 1]} target={[0, 0, 0]} />
      {/* Second strip, right front */}
      <Lightformer form="rect" intensity={light ? 1.8 : 1.6} position={[-6, 2.4, 4]} scale={[16, 0.6, 1]} target={[0, 0, 0]} />
      {/* Back rim */}
      <Lightformer form="rect" intensity={light ? 2.4 : 2.2} position={[0.5, 3, -7]} scale={[18, 1.6, 1]} target={[0, 0, 0]} />
      {!light && (
        <>
          {/* Dark studio: a dim body card for soft gradients and a low rim
              that edges the lower silhouette against charcoal */}
          <Lightformer form="rect" intensity={0.6} position={[5, 0.5, 4]} scale={[12, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2} position={[0, -1.2, -6.5]} scale={[18, 0.6, 1]} target={[0, 0, 0]} />
        </>
      )}
      {/* Vertical side strips for the arm and module edges */}
      <Lightformer form="rect" intensity={light ? 1.8 : 2.6} position={[7.5, 0.6, -3.5]} scale={[1.1, 9, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={light ? 1.2 : 2} position={[-7.5, 0.8, 2.5]} scale={[1.1, 9, 1]} target={[0, 0, 0]} />
      {/* Soft box behind the set: lights the liner, contacts and inner cushion */}
      <Lightformer form="rect" intensity={light ? 1.4 : 1.2} position={[-1.5, 1.6, -6]} scale={[7, 3.5, 1]} target={[0, 0, 0]} />
      {/* Black flags */}
      <Lightformer form="rect" intensity={1} color="#000000" position={[-7, 0.2, 1.5]} scale={[5, 3, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1} color="#000000" position={[2.5, 5.5, -5]} scale={[6, 1.6, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Key light: lifts diffuse materials (textile, liner) and adds a crisp ping on metal. */
export function StudioLights({ mood = 'light' }: { mood?: StudioMood }) {
  const light = mood === 'light';
  return (
    <>
      <directionalLight position={[3.5, 6, 4.5]} intensity={light ? 1.4 : 1.1} color="#fffcf7" />
      <directionalLight position={[-3, 3, -5]} intensity={light ? 0.8 : 0.8} color="#eef1f5" />
      <hemisphereLight args={['#f4f1ec', '#8a847a', light ? 0.35 : 0.22]} />
    </>
  );
}

export function StudioFloor({ y, opacity = 1 }: { y: number; opacity?: number }) {
  return (
    <group position={[0, y, 0]}>
      <ContactShadows
        opacity={0.28 * opacity}
        scale={5.2}
        blur={4.5}
        far={2.4}
        resolution={512}
        color="#2d2924"
        frames={1}
      />
      <ContactShadows
        opacity={0.55 * opacity}
        scale={3}
        blur={0.9}
        far={0.12}
        resolution={512}
        color="#221f1b"
        frames={1}
      />
    </group>
  );
}
