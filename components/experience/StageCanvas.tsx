'use client';

import { ContactShadows, Line } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import { StudioEnvironment } from '@/components/three/Studio';
import { useBakedHarmoniqModel } from '@/components/three/useHarmoniqModel';
import type { HarmoniqModel } from '@/lib/harmoniq/createHarmoniqModel';
import { createHeadLines } from '@/lib/harmoniq/head';
import { downgradeGlass, type Quality } from '@/lib/harmoniq/materials';
import { breathAt } from '@/lib/motion/breath';
import { director, type Pose } from './director';
import { createPose } from './poses';

/**
 * The one persistent WebGL stage. frameloop="never": the scroll director's
 * ticker calls `director.render(t)` only when something changed, so a still
 * page costs nothing and the stage pauses entirely when it is not visible.
 */

const DEG = Math.PI / 180;
const FIELDS = Object.keys(createPose()) as (keyof Pose)[];

/** Which part's explode offset moves each anchor. */
const ANCHOR_PART: Record<string, string> = {
  crownTop: 'crown',
  shellFront: 'shell',
  titaniumSide: 'shell',
  lightLine: 'lightLine',
  lightLineA: 'lightLine',
  lightLineB: 'lightLine',
  wordmark: 'shell',
  contactCentre: 'contact_2',
  contactLeft: 'contact_3',
  liner: 'liner',
  moduleL: 'module_L',
  armL: 'arm_L',
  earRestL: 'earRest_L',
  contact_0: 'contact_0',
  contact_1: 'contact_1',
  contact_2: 'contact_2',
  contact_3: 'contact_3',
  contact_4: 'contact_4',
};

/* -------------------------------------------------------------------------- */

const LIGHTS = {
  key: { light: 1.4, dark: 1.1 },
  fill: { light: 0.8, dark: 0.8 },
  hemi: { light: 0.35, dark: 0.22 },
};

interface StageRefs {
  rig: THREE.Group | null;
  key: THREE.DirectionalLight | null;
  fill: THREE.DirectionalLight | null;
  hemi: THREE.HemisphereLight | null;
  floor: THREE.Group | null;
  pool: THREE.Mesh | null;
  head: (Line2 | null)[];
  headGroup: THREE.Group | null;
  /** Frames during which the device is held at rest so the floor shadow bakes correctly. */
  restFrames: number;
}

function Head({ model, refs }: { model: HarmoniqModel; refs: StageRefs }) {
  const lines = useMemo(() => {
    const h = createHeadLines();
    return [h.profile, h.ring, h.arc, h.earL, h.earInnerL, h.earR, h.earInnerR, h.brow];
  }, []);
  const offset = model.group.getObjectByName('content')!.position;
  return (
    <group
      ref={(g) => {
        refs.headGroup = g;
      }}
      scale={model.config.worldScale}
      visible={false}
    >
      <group position={offset}>
        {lines.map((pts, i) => (
          <Line
            key={i}
            ref={(l) => {
              refs.head[i] = l as unknown as Line2 | null;
            }}
            points={pts}
            color="#C9C5BE"
            lineWidth={1}
            transparent
            opacity={0}
            depthWrite={false}
          />
        ))}
      </group>
    </group>
  );
}

const poolMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color('#d9d3c9') }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p * vec2(1.0, 1.35));
        float a = (1.0 - smoothstep(0.0, 1.0, r));
        a = a * a * 0.42 * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
  });

function Floor({ model, refs }: { model: HarmoniqModel; refs: StageRefs }) {
  const y = model.restY * model.config.worldScale - 0.002;
  const mat = useMemo(poolMaterial, []);
  useLayoutEffect(() => {
    // Hold the device at rest for the shadow bake frame.
    refs.restFrames = 1;
  }, [refs]);
  return (
    <group
      ref={(g) => {
        refs.floor = g;
      }}
      position={[0, y, 0]}
    >
      <mesh
        ref={(m) => {
          refs.pool = m;
        }}
        rotation-x={-Math.PI / 2}
        position={[0.05, -0.001, -0.05]}
        material={mat}
        renderOrder={-1}
        visible={false}
      >
        <planeGeometry args={[5.2, 3.6]} />
      </mesh>
      <ContactShadows opacity={0.26} scale={9} blur={3.2} far={1.4} resolution={1024} color="#2d2924" frames={1} />
      <ContactShadows opacity={0.55} scale={4} blur={0.9} far={0.12} resolution={512} color="#221f1b" frames={1} />
    </group>
  );
}

/** Re-applies the live pose after the floor's shadow bake (registered after <Floor/>). */
function RestoreRig({ apply }: { apply: () => void }) {
  useFrame(() => apply());
  return null;
}

function Driver({
  model,
  refs,
  envLight,
  envDark,
}: {
  model: HarmoniqModel | null;
  refs: StageRefs;
  envLight: THREE.Scene;
  envDark: THREE.Scene;
}) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const bg = useMemo(() => new THREE.Color(director.bg), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const lastBg = useRef('');
  const lastFloor = useRef(-1);

  useLayoutEffect(() => {
    scene.background = bg;
    return () => {
      scene.background = null;
    };
  }, [scene, bg]);

  useFrame((state, rawDt) => {
    const T = director.target;
    if (!T) return;
    if (!director.current) director.current = { ...T };
    const C = director.current;
    const dt = Math.min(Math.max(rawDt, 0), 0.1);
    director.frames++;
    if (director.snap) {
      Object.assign(C, T);
      director.snap = false;
    }

    // Damping (frame-rate independent). The scroll itself is already smoothed by Lenis.
    const a = 1 - Math.exp(-6.5 * dt);
    let unsettled = 0;
    for (const f of FIELDS) {
      const d = T[f] - C[f];
      C[f] += d * a;
      unsettled = Math.max(unsettled, Math.abs(d));
    }
    if (unsettled < 2e-4) for (const f of FIELDS) C[f] = T[f];
    director.needsRender = unsettled > 2e-4 || C.breath > 0.01;

    // Camera: spherical orbit around a target that follows the device's lift.
    target.set(C.tx, C.ty + C.lift, C.tz);
    const ce = Math.cos(C.el * DEG);
    camera.position.set(
      target.x + C.dist * ce * Math.sin(C.az * DEG),
      target.y + C.dist * Math.sin(C.el * DEG),
      target.z + C.dist * ce * Math.cos(C.az * DEG),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.fov = C.fov;
    camera.near = Math.max(0.02, C.dist * 0.05);
    camera.far = C.dist + 30;
    camera.updateProjectionMatrix();
    // Screen shift (NDC) without changing perspective.
    camera.projectionMatrix.elements[8] = -C.sx;
    camera.projectionMatrix.elements[9] = -C.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();

    // Background, environment and lights by mood. The env switches at the
    // midpoint of an intensity dip so the change is never seen.
    if (director.bg !== lastBg.current) {
      lastBg.current = director.bg;
      bg.set(director.bg);
    }
    const mood = C.mood;
    const envSrc = mood < 0.5 ? envLight : envDark;
    if (envSrc.environment && scene.environment !== envSrc.environment) scene.environment = envSrc.environment;
    scene.environmentIntensity = 1 - 0.6 * Math.sin(Math.PI * Math.min(1, Math.max(0, mood)));
    scene.environmentRotation.set(0, C.sweep * DEG, 0);
    const lerp = (o: { light: number; dark: number }) => o.light + (o.dark - o.light) * mood;
    if (refs.key) refs.key.intensity = lerp(LIGHTS.key);
    if (refs.fill) refs.fill.intensity = lerp(LIGHTS.fill);
    if (refs.hemi) refs.hemi.intensity = lerp(LIGHTS.hemi);

    if (!model || !refs.rig) {
      director.emitFrame();
      return;
    }

    applyRig(C, refs, refs.restFrames > 0);
    if (refs.restFrames > 0) refs.restFrames--;

    // Device state.
    model.setExplode(C.explode);
    for (let i = 0; i < 5; i++) model.setContactGlow(i, Math.min(1, Math.max(0, C.glow - i)));
    const b = breathAt(director.time);
    const breath = 1 - C.breath * 0.42 * (1 - b);
    model.setLightLine(C.light * breath * Math.min(1, director.intro * 1.25));

    // Construction-line head: lines draw one after another.
    const hg = refs.headGroup;
    if (hg) {
      const on = C.headAlpha > 0.002 && C.head > 0.002;
      hg.visible = on;
      if (on) {
        const n = refs.head.length;
        const stagger = 0.12;
        refs.head.forEach((l, i) => {
          if (!l) return;
          const p = Math.min(1, Math.max(0, C.head * (1 + stagger * (n - 1)) - stagger * i));
          const g = l.geometry as THREE.InstancedBufferGeometry & { _maxInstances?: number };
          const total = (g.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute | undefined)?.count ?? 0;
          g.instanceCount = Math.round(total * p);
          const m = l.material as THREE.Material & { opacity: number };
          m.opacity = C.headAlpha * (i === 0 ? 0.62 : 0.42);
        });
      }
    }

    // Floor: shadow and warm pool.
    if (refs.floor && Math.abs(lastFloor.current - C.floor) > 1e-4) {
      lastFloor.current = C.floor;
      refs.floor.visible = C.floor > 0.002;
      refs.floor.traverse((o) => {
        const m = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; userData: { base?: number } }) | undefined;
        if (!m || o === refs.pool) return;
        if (m.userData.base === undefined) m.userData.base = m.opacity;
        m.opacity = m.userData.base * C.floor;
      });
      if (refs.pool) (refs.pool.material as THREE.ShaderMaterial).uniforms.uOpacity.value = C.floor;
    }

    project(model, refs, camera, size, tmp);
    director.emitFrame();
  });

  return null;
}

function applyRig(C: Pose, refs: StageRefs, rest: boolean) {
  const rig = refs.rig!;
  if (rest) {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
  } else {
    rig.position.set(0, C.lift, 0);
    rig.rotation.set(C.rx * DEG, C.ry * DEG, C.rz * DEG, 'YXZ');
  }
  rig.updateMatrixWorld(true);
}

function project(
  model: HarmoniqModel,
  refs: StageRefs,
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  v: THREE.Vector3,
) {
  const root = model.group;
  const out = director.screen;
  const set = (name: string, world: THREE.Vector3) => {
    v.copy(world).project(camera);
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    const p = out[name] ?? (out[name] = { x: 0, y: 0, visible: false });
    p.x = x;
    p.y = y;
    p.visible = v.z < 1 && x > -40 && x < size.width + 40 && y > -40 && y < size.height + 40;
  };
  for (const [name, anchor] of Object.entries(model.anchors)) {
    const part = model.parts[ANCHOR_PART[name] as keyof typeof model.parts];
    const w = new THREE.Vector3().copy(anchor);
    if (part) w.add(part.position);
    root.localToWorld(w);
    set(name, w);
  }
  set('deviceCentre', refs.rig!.getWorldPosition(new THREE.Vector3()));
}

function StageScene({ quality }: { quality: Quality }) {
  const model = useBakedHarmoniqModel(quality);
  const envLight = useMemo(() => new THREE.Scene(), []);
  const envDark = useMemo(() => new THREE.Scene(), []);
  const refs = useRef<StageRefs>({
    rig: null,
    key: null,
    fill: null,
    hemi: null,
    floor: null,
    pool: null,
    head: [],
    headGroup: null,
    restFrames: 0,
  }).current;

  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    (window as unknown as { __harmoniq?: HarmoniqModel | null }).__harmoniq = model;
    if (!model) return;
    director.degradeGlass = () => {
      downgradeGlass(model.materials);
      director.invalidate();
    };
    let live = true;
    // Compile every program off the critical path (KHR_parallel_shader_compile)
    // with the studio environment bound, so the first visible frame never hitches.
    if (envLight.environment) scene.environment = envLight.environment;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        if (!live) return;
        director.ready = true;
        director.invalidate();
      });
    return () => {
      live = false;
      director.ready = false;
      director.warm = false;
    };
  }, [model, gl, scene, camera, envLight]);

  return (
    <>
      <StudioEnvironment mood="light" target={envLight} resolution={256} />
      <StudioEnvironment mood="dark" target={envDark} resolution={256} />
      <directionalLight
        ref={(l) => {
          refs.key = l;
        }}
        position={[3.5, 6, 4.5]}
        intensity={LIGHTS.key.light}
        color="#fffcf7"
      />
      <directionalLight
        ref={(l) => {
          refs.fill = l;
        }}
        position={[-3, 3, -5]}
        intensity={LIGHTS.fill.light}
        color="#eef1f5"
      />
      <hemisphereLight
        ref={(l) => {
          refs.hemi = l;
        }}
        args={['#f4f1ec', '#8a847a', LIGHTS.hemi.light]}
      />
      <Driver model={model} refs={refs} envLight={envLight} envDark={envDark} />
      <group
        ref={(g) => {
          refs.rig = g;
        }}
      >
        {model && <primitive object={model.group} />}
        {model && <Head model={model} refs={refs} />}
      </group>
      {model && <Floor model={model} refs={refs} />}
      {model && (
        <RestoreRig
          apply={() => {
            if (refs.pool && !refs.pool.visible) refs.pool.visible = true;
            if (director.current && refs.rig) applyRig(director.current, refs, false);
          }}
        />
      )}
    </>
  );
}

export default function StageCanvas({ quality }: { quality: Quality }) {
  return (
    <Canvas
      frameloop="never"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 23, near: 0.05, far: 60, position: [3.4, 1.3, 1.5] }}
      onCreated={(state) => {
        // Transparent clears: the contact-shadow bake needs alpha (the canvas
        // itself stays opaque through scene.background).
        state.gl.setClearColor(0x000000, 0);
        state.gl.toneMapping = THREE.NeutralToneMapping;
        state.gl.toneMappingExposure = 1;
        director.render = (t: number) => state.advance(t, true);
        director.setDpr = (dpr: number) => state.setDpr(dpr);
        director.invalidate();
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <StageScene quality={quality} />
    </Canvas>
  );
}
