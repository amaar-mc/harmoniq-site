'use client';

import { useEffect, useState } from 'react';
import { resolveInterFamily } from '@/components/three/useHarmoniqModel';
import { serializeModel } from '@/lib/harmoniq/bake';
import { HARMONIQ_CONFIG } from '@/lib/harmoniq/config';
import { createHarmoniqModel } from '@/lib/harmoniq/createHarmoniqModel';
import type { Quality } from '@/lib/harmoniq/materials';

declare global {
  interface Window {
    __bake?: Partial<Record<Quality, string>>;
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function BakeClient() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const family = resolveInterFamily();
    (async () => {
      await document.fonts.load(`300 220px ${family}`).catch(() => undefined);
      const out: Partial<Record<Quality, string>> = {};
      for (const quality of ['high', 'low'] as Quality[]) {
        const t0 = performance.now();
        const model = createHarmoniqModel(HARMONIQ_CONFIG, { quality, fontFamily: family });
        const buf = serializeModel(model, quality);
        out[quality] = toBase64(buf);
        const st = model.stats();
        setLog((l) => [
          ...l,
          `${quality}: ${Math.round(st.triangles).toLocaleString()} tris, ${st.meshes} meshes, ${(buf.byteLength / 1024).toFixed(0)} KB, ${Math.round(performance.now() - t0)} ms`,
        ]);
        model.dispose();
      }
      window.__bake = out;
    })();
  }, []);
  return (
    <main style={{ padding: 40, fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500 }}>Model bake</h1>
      <pre>{log.join('\n') || 'Baking…'}</pre>
    </main>
  );
}
