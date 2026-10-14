'use client';

import { CameraControls, Line } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PART_NAMES, type PartName } from '@/lib/harmoniq/config';
import { createHeadLines } from '@/lib/harmoniq/head';
import type { Quality } from '@/lib/harmoniq/materials';
import { LAB_PRESETS, type CameraPreset } from '@/lib/harmoniq/presets';
import type { HarmoniqModel } from '@/lib/harmoniq/createHarmoniqModel';
import { StudioEnvironment, StudioFloor, StudioLights } from '@/components/three/Studio';
import { useHarmoniqModel } from '@/components/three/useHarmoniqModel';
import styles from './lab.module.css';

type Backdrop = 'paper' | 'graphite' | 'charcoal';
const BACKDROPS: Record<Backdrop, string> = {
  paper: '#F2F0EC',
  graphite: '#26262A',
  charcoal: '#121213',
};

declare global {
  interface Window {
    __labReady?: boolean;
    __labFrame?: number;
    __labKick?: (frames: number) => void;
    __lab?: {
      set(state: {
        preset?: string;
        camera?: { position: [number, number, number]; target: [number, number, number]; fov: number; pitch?: number };
        explode?: number;
        glow?: number;
        light?: number;
        head?: boolean;
        backdrop?: Backdrop;
        hide?: string[];
      }): void;
    };
    __labStats?: { calls: number; triangles: number; geometryTriangles: number; meshes: number };
  }
}

function readParams() {
  const p = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const num = (k: string, d: number) => (p.has(k) ? Number(p.get(k)) : d);
  return {
    preset: p.get('preset') ?? 'hero',
    ui: p.get('ui') !== '0',
    explode: num('explode', 0),
    glow: num('glow', 0),
    light: num('light', 1),
    head: p.get('head') === '1',
    quality: (p.get('quality') as Quality) ?? 'high',
    backdrop: (p.get('bg') as Backdrop) ?? 'paper',
    hide: (p.get('hide') ?? '').split(',').filter(Boolean),
  };
}

function Device({ model, pitch, onFloor }: { model: HarmoniqModel; pitch: number; onFloor: (y: number) => void }) {
  useEffect(() => {
    model.group.rotation.x = THREE.MathUtils.degToRad(pitch);
    model.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model.group);
    onFloor(box.min.y);
  }, [model, pitch, onFloor]);
  return <primitive object={model.group} />;
}

function HeadUnderlay({ model, opacity }: { model: HarmoniqModel; opacity: number }) {
  const lines = useMemo(() => createHeadLines(), []);
  const offset = model.group.getObjectByName('content')!.position;
  const color = '#8B8781';
  return (
    <group scale={model.config.worldScale}>
      <group position={offset}>
        {[lines.profile, lines.ring, lines.arc, lines.earL, lines.earInnerL, lines.earR, lines.earInnerR, lines.brow].map(
          (pts, i) => (
            <Line key={i} points={pts} color={color} lineWidth={1} transparent opacity={opacity} depthWrite={false} />
          ),
        )}
      </group>
    </group>
  );
}

function Rig({ preset, instant }: { preset: CameraPreset; instant: boolean }) {
  const ref = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const first = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();
    c.setLookAt(...preset.position, ...preset.target, !first.current && !instant);
    first.current = false;
  }, [preset, camera]);
  return <CameraControls ref={ref} makeDefault minDistance={0.3} maxDistance={12} smoothTime={0.35} />;
}

/**
 * Backdrop as scene.background: glass transmission refracts the real backdrop,
 * while drei's shadow pass (which nulls scene.background) still clears clear.
 */
function Backdrop({ color }: { color: string }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    scene.background = new THREE.Color(color);
    invalidate();
    return () => {
      scene.background = null;
    };
  }, [scene, color, invalidate]);
  return null;
}

function Kicker() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    window.__labKick = (n: number) => {
      let i = 0;
      const tick = () => {
        invalidate();
        if (++i < n) requestAnimationFrame(tick);
      };
      tick();
    };
  }, [invalidate]);
  return null;
}

function Stats({ model }: { model: HarmoniqModel }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current % 20 === 0 || frames.current === 24) {
      const st = model.stats();
      window.__labStats = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometryTriangles: Math.round(st.triangles),
        meshes: st.meshes,
      };
    }
    window.__labFrame = frames.current;
    if (frames.current === 24) window.__labReady = true;
  });
  return null;
}

export default function LabScene() {
  const initial = useMemo(readParams, []);
  const [presetId, setPresetId] = useState(initial.preset);
  const [customCam, setCustomCam] = useState<CameraPreset | null>(null);
  const [explode, setExplode] = useState(initial.explode);
  const [glow, setGlow] = useState(initial.glow);
  const [light, setLight] = useState(initial.light);
  const [head, setHead] = useState(initial.head);
  const [quality, setQuality] = useState<Quality>(initial.quality);
  const [backdrop, setBackdrop] = useState<Backdrop>(initial.backdrop);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initial.hide));
  const [stats, setStats] = useState<Window['__labStats']>();
  const model = useHarmoniqModel(quality);
  const [floorY, setFloorY] = useState<number | null>(null);
  const preset = customCam ?? LAB_PRESETS.find((p) => p.id === presetId) ?? LAB_PRESETS[0];

  useEffect(() => {
    model?.setExplode(explode);
  }, [model, explode]);
  useEffect(() => {
    (window as unknown as { __harmoniq?: HarmoniqModel | null }).__harmoniq = model;
  }, [model]);
  useEffect(() => {
    if (!model) return;
    for (let i = 0; i < 5; i++) model.setContactGlow(i, glow);
  }, [model, glow]);
  useEffect(() => {
    model?.setLightLine(light);
  }, [model, light]);
  useEffect(() => {
    if (!model) return;
    for (const name of PART_NAMES) {
      const obj = model.parts[name];
      if (obj) obj.visible = !hidden.has(name);
    }
  }, [model, hidden]);
  useEffect(() => {
    const id = setInterval(() => setStats(window.__labStats), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    window.__lab = {
      set(st) {
        if (st.preset !== undefined) {
          setPresetId(st.preset);
          setCustomCam(null);
        }
        if (st.camera) setCustomCam({ id: 'custom', label: 'Custom', ...st.camera });
        if (st.explode !== undefined) setExplode(st.explode);
        if (st.glow !== undefined) setGlow(st.glow);
        if (st.light !== undefined) setLight(st.light);
        if (st.head !== undefined) setHead(st.head);
        if (st.backdrop !== undefined) setBackdrop(st.backdrop);
        if (st.hide !== undefined) setHidden(new Set(st.hide));
      },
    };
  }, []);

  const dark = backdrop !== 'paper';
  const toggle = (name: PartName) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  return (
    <div className={styles.root} style={{ background: BACKDROPS[backdrop] }} data-dark={dark ? '1' : '0'}>
      <Canvas
        className={styles.canvas}
        frameloop={initial.ui ? 'always' : 'demand'}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ fov: preset.fov, near: 0.05, far: 60, position: preset.position }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Backdrop color={BACKDROPS[backdrop]} />
        <StudioEnvironment mood={dark ? 'dark' : 'light'} />
        <StudioLights mood={dark ? 'dark' : 'light'} />
        {model && (
          <>
            <Device model={model} pitch={preset.pitch ?? 0} onFloor={setFloorY} />
            {floorY !== null && <StudioFloor key={`${floorY.toFixed(4)}-${dark}`} y={floorY - 0.002} opacity={dark ? 0.8 : 1} mood={dark ? 'dark' : 'light'} />}
            {head && <HeadUnderlay model={model} opacity={dark ? 0.5 : 0.75} />}
            <Stats model={model} />
          </>
        )}
        <Rig preset={preset} instant={!initial.ui} />
        <Kicker />
      </Canvas>

      {initial.ui && (
        <aside className={styles.panel} aria-label="Lab controls">
          <p className={styles.eyebrow}>Harmoniq · model lab</p>
          <section>
            <h2>Camera</h2>
            <div className={styles.chips}>
              {LAB_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.chip}
                  aria-pressed={p.id === presetId}
                  onClick={() => {
                    setCustomCam(null);
                    setPresetId(p.id);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>Explode</h2>
            <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(+e.target.value)} />
          </section>
          <section>
            <h2>Contact glow</h2>
            <input type="range" min={0} max={1} step={0.01} value={glow} onChange={(e) => setGlow(+e.target.value)} />
            <h2>Light line</h2>
            <input type="range" min={0} max={1.5} step={0.01} value={light} onChange={(e) => setLight(+e.target.value)} />
          </section>
          <section>
            <h2>Scene</h2>
            <div className={styles.chips}>
              {(Object.keys(BACKDROPS) as Backdrop[]).map((b) => (
                <button key={b} type="button" className={styles.chip} aria-pressed={backdrop === b} onClick={() => setBackdrop(b)}>
                  {b}
                </button>
              ))}
              <button type="button" className={styles.chip} aria-pressed={head} onClick={() => setHead(!head)}>
                head underlay
              </button>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={quality === 'low'}
                onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
              >
                mobile materials
              </button>
            </div>
          </section>
          <section>
            <h2>Parts</h2>
            <div className={styles.chips}>
              {PART_NAMES.map((n) => (
                <button key={n} type="button" className={styles.chip} aria-pressed={!hidden.has(n)} onClick={() => toggle(n)}>
                  {n}
                </button>
              ))}
            </div>
          </section>
          {stats && (
            <p className={styles.stats}>
              {stats.geometryTriangles.toLocaleString()} tris · {stats.meshes} meshes · {stats.calls} draw calls
            </p>
          )}
        </aside>
      )}
    </div>
  );
}
