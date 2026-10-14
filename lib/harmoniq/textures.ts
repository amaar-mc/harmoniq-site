import * as THREE from 'three';

/**
 * Procedural, tileable, deterministic textures. Generated once on the client;
 * total GPU footprint stays well under the 6 MB budget (~2.7 MB with mips).
 *
 * UV convention across the model: 1 UV unit = 10 mm.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise on a periodic integer lattice. */
function makeValueNoise(period: number, rand: () => number) {
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (x: number, y: number) => grid[((y % period) + period) % period * period + (((x % period) + period) % period)];
  return (u: number, v: number) => {
    const x = u * period;
    const y = v * period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function heightToNormal(h: Float32Array, w: number, hgt: number, strength: number): Uint8Array {
  const out = new Uint8Array(w * hgt * 4);
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w;
      const xr = (x + 1) % w;
      const yu = (y - 1 + hgt) % hgt;
      const yd = (y + 1) % hgt;
      const dx = (h[y * w + xr] - h[y * w + xl]) * strength;
      const dy = (h[yd * w + x] - h[yu * w + x]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

function dataTexture(data: Uint8Array, w: number, h: number, srgb = false): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Brushed titanium. Streaks run along U (the band direction). Returns a
 * roughness multiplier (G channel) and a faint tangent-space normal map.
 */
export function createBrushedTextures(seed = 7) {
  const W = 1024;
  const H = 512;
  const rand = mulberry32(seed);
  const low = makeValueNoise(8, rand);
  const h = new Float32Array(W * H);
  // Fine straight hairlines that start and stop: each row holds 2–3 segments
  // of random length with soft ends, over a very faint broad variation.
  for (let y = 0; y < H; y++) {
    const segs = 2 + Math.floor(rand() * 2);
    const segData: [number, number, number][] = [];
    for (let k = 0; k < segs; k++) segData.push([rand(), 0.1 + rand() * 0.5, rand() * 2 - 1]);
    const base = (rand() * 2 - 1) * 0.35;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let val = base;
      for (const [st, len, amp] of segData) {
        let d = u - st;
        if (d < 0) d += 1;
        if (d < len) {
          const e = Math.min(d / (len * 0.2), (len - d) / (len * 0.2), 1);
          val += amp * e * e * (3 - 2 * e);
        }
      }
      const broad = (low(u * 0.25, (y / H) * 24) - 0.5) * 0.06;
      h[y * W + x] = val * 0.5 + broad;
    }
  }
  const rough = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const r = 0.965 + 0.035 * Math.max(-1, Math.min(1, h[i]));
    const b = Math.round(r * 255);
    rough[i * 4] = b;
    rough[i * 4 + 1] = b;
    rough[i * 4 + 2] = b;
    rough[i * 4 + 3] = 255;
  }
  const normal = heightToNormal(h, W, H, 0.4);
  return {
    roughness: dataTexture(rough, W, H),
    normal: dataTexture(normal, W, H),
  };
}

/**
 * Heathered knit for the crown cushion. One tile ≈ 10 mm. Height field mixes a
 * jersey stitch lattice with fibre noise; colour map is a heather multiplier.
 */
export function createKnitTextures(seed = 11) {
  const W = 512;
  const H = 512;
  const rand = mulberry32(seed);
  const fibre = makeValueNoise(128, rand);
  const mid = makeValueNoise(24, rand);
  const blotch = makeValueNoise(6, rand);
  const cols = 16;
  const rows = 22;
  const h = new Float32Array(W * H);
  const col = new Uint8Array(W * H * 4);
  // Sparse heather fibres: short darker/lighter streaks.
  const speck = new Float32Array(W * H);
  const fibres = 2600;
  for (let k = 0; k < fibres; k++) {
    const x0 = rand() * W;
    const y0 = rand() * H;
    const ang = (rand() - 0.5) * 0.9 + (rand() < 0.5 ? 0 : Math.PI / 2);
    const len = 4 + rand() * 10;
    const val = rand() < 0.4 ? -1 : 1;
    for (let t = 0; t < len; t++) {
      const x = Math.round(x0 + Math.cos(ang) * t);
      const y = Math.round(y0 + Math.sin(ang) * t);
      speck[(((y % H) + H) % H) * W + (((x % W) + W) % W)] += val * (1 - t / len);
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const cx = u * cols;
      const cy = v * rows;
      const fx = cx - Math.floor(cx);
      const fy = cy - Math.floor(cy);
      // Two slanted legs per stitch → the jersey "V".
      const legL = Math.abs(fx - (0.27 + 0.18 * fy));
      const legR = Math.abs(fx - (0.73 - 0.18 * fy));
      const leg = Math.min(legL, legR);
      const loop = Math.exp(-(leg * leg) / 0.012) * (0.75 + 0.25 * Math.sin(Math.PI * fy));
      const f = fibre(u, v) - 0.5;
      const m = mid(u, v) - 0.5;
      const i = y * W + x;
      h[i] = loop * 0.9 + f * 0.55 + m * 0.35 + speck[i] * 0.08;
      const heather = 0.9 + speck[i] * 0.2 + (fibre(u * 0.5 + 0.3, v) - 0.5) * 0.1 + (blotch(u, v) - 0.5) * 0.02 - (1 - loop) * 0.05;
      const c = Math.round(Math.max(0, Math.min(1, heather)) * 255);
      col[i * 4] = c;
      col[i * 4 + 1] = c;
      col[i * 4 + 2] = Math.min(255, Math.round(c * 0.985));
      col[i * 4 + 3] = 255;
    }
  }
  const normal = heightToNormal(h, W, H, 2.2);
  return {
    normal: dataTexture(normal, W, H),
    color: dataTexture(col, W, H, true),
  };
}

/** Open-cell foam for the gaskets (cellular bumps). */
export function createFoamNormalTexture(seed = 23) {
  const W = 256;
  const H = 256;
  const rand = mulberry32(seed);
  const cells = 180;
  const pts: [number, number][] = [];
  for (let i = 0; i < cells; i++) pts.push([rand(), rand()]);
  const h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      let d1 = 9;
      let d2 = 9;
      for (const [px, py] of pts) {
        let dx = Math.abs(u - px);
        let dy = Math.abs(v - py);
        dx = Math.min(dx, 1 - dx);
        dy = Math.min(dy, 1 - dy);
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      h[y * W + x] = Math.sqrt(d2) - Math.sqrt(d1);
    }
  }
  return dataTexture(heightToNormal(h, W, H, 6), W, H);
}

/** Very fine grain for soft-touch graphite (liner, ear rests). */
export function createGrainNormalTexture(seed = 31) {
  const W = 256;
  const H = 256;
  const rand = mulberry32(seed);
  const n1 = makeValueNoise(96, rand);
  const n2 = makeValueNoise(32, rand);
  const h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      h[y * W + x] = n1(x / W, y / H) * 0.7 + n2(x / W, y / H) * 0.3;
    }
  }
  return dataTexture(heightToNormal(h, W, H, 1.6), W, H);
}

/**
 * Wordmark alpha (white on black). Returns the texture plus its aspect so the
 * decal can be sized to the requested cap height.
 */
export function createWordmarkTexture(text: string, fontFamily: string, weight = 400) {
  const fontPx = 220;
  const capRatio = 0.727; // Inter cap height / em
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${weight} ${fontPx}px ${fontFamily}`;
  ctx.font = font;
  const letterSpacing = 0.01 * fontPx;
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const textW = widths.reduce((a, b) => a + b, 0) + letterSpacing * (chars.length - 1);
  const padX = fontPx * 0.25;
  const padY = fontPx * 0.25;
  const asc = fontPx * 0.97;
  const desc = fontPx * 0.26;
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = Math.ceil(asc + desc + padY * 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  let x = padX;
  const baseline = padY + asc;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, baseline);
    x += widths[i] + letterSpacing;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  // mm per px for a given cap height: capHeight / (fontPx * capRatio)
  return {
    texture: tex,
    widthPx: canvas.width,
    heightPx: canvas.height,
    /** Baseline position from the top, as a fraction of canvas height. */
    baselineFrac: baseline / canvas.height,
    pxPerCap: fontPx * capRatio,
  };
}
