import * as THREE from 'three';

/**
 * Industrial-designer underlay: a head in fine construction lines, built in
 * the device's millimetre frame (y = 0 at the band's bottom edge, +Z forward,
 * +X wearer's left). Proportions follow typical adult anthropometry and are
 * fitted to the halo (forehead just inside the contacts, temples inside the
 * band ends, ear root under the arm, ear rest behind the auricle).
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function smooth(points: THREE.Vector3[], samples: number, closed = false): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return curve.getSpacedPoints(samples);
}

export interface HeadLines {
  /** Each entry is a polyline (mm). Order matters for draw-on animation. */
  profile: THREE.Vector3[];
  ring: THREE.Vector3[];
  arc: THREE.Vector3[];
  earL: THREE.Vector3[];
  earInnerL: THREE.Vector3[];
  earR: THREE.Vector3[];
  earInnerR: THREE.Vector3[];
  brow: THREE.Vector3[];
}

export function createHeadLines(): HeadLines {
  // Mid-sagittal profile (x = 0), from the base of the neck at the back,
  // over the vertex, down the forehead and face to the front of the neck.
  const profilePts: [number, number][] = [
    // [z, y]
    [-80, -138],
    [-84, -104],
    [-100, -76],
    [-114, -56],
    [-124, -30],
    [-127, -4],
    [-122, 22],
    [-106, 48],
    [-80, 68],
    [-46, 83],
    [-12, 88],
    [20, 82],
    [42, 66],
    [53, 46],
    [58.6, 26],
    [60.2, 10],
    [60.6, -2],
    [61.8, -10],
    [63, -15],
    [60.5, -21],
    [58.5, -25],
    [62, -33],
    [70, -46],
    [78.5, -59],
    [77, -64.5],
    [70, -67],
    [66, -69],
    [69.2, -75],
    [67.5, -80.5],
    [65.5, -82],
    [67.6, -86.5],
    [65.2, -91.5],
    [62.4, -95],
    [65.6, -103],
    [63, -111],
    [54, -117],
    [38, -118.5],
    [22, -116],
    [14, -128],
    [12, -140],
  ];
  // Lower face scaled to adult proportions about the nasion (y = -25).
  const profile = smooth(
    profilePts.map(([z, y]) => v(0, y < -25 && z > 0 ? -25 + (y + 25) * 1.2 : y, z)),
    260,
  );

  // Horizontal ring at band height (just inside the contacts and cushion).
  const ringY = 12;
  const ringHalf: [number, number][] = [
    // [x, z]
    [0, 60.2],
    [26, 55],
    [47, 43],
    [61, 25],
    [67.4, 6],
    [69.6, -12],
    [73, -34],
    [74.6, -56],
    [72, -80],
    [62, -102],
    [43, -118],
    [22, -125],
  ];
  const ringPts = [
    ...ringHalf.map(([x, z]) => v(x, ringY, z)),
    v(0, ringY, -127),
    ...ringHalf
      .slice(1)
      .reverse()
      .map(([x, z]) => v(-x, ringY, z)),
  ];
  // Drop the duplicated front point so the closed curve does not kink.
  const ring = smooth(ringPts.slice(0, -1), 220, true);

  // Coronal arc over the top of the head.
  const arcZ = -16;
  const arcHalf: [number, number][] = [
    // [x, y]
    [73.5, -40],
    [74.5, -10],
    [73, 18],
    [66, 46],
    [50, 70],
    [27, 84],
    [0, 88],
  ];
  const arc = smooth(
    [...arcHalf.map(([x, y]) => v(x, y, arcZ)), ...arcHalf.slice(0, -1).reverse().map(([x, y]) => v(-x, y, arcZ))],
    200,
  );

  // Ear (auricle) on the +X side: helix outline and antihelix.
  const earX = 74.5;
  const earOuter: [number, number][] = [
    // [z, y]
    [-22.5, -22],
    [-25, -13],
    [-31, -8],
    [-39, -7.5],
    [-46, -12],
    [-50.5, -21],
    [-52, -33],
    [-50.5, -45],
    [-46.5, -56],
    [-41.5, -65],
    [-36, -72.5],
    [-30.5, -74],
    [-26.5, -70],
    [-25.4, -62],
    [-24.2, -54],
    [-21.4, -47],
    [-21.8, -40.5],
    [-25, -37.5],
  ];
  const earInner: [number, number][] = [
    [-29, -19],
    [-36, -15.5],
    [-42.5, -20],
    [-45, -31],
    [-43, -43],
    [-38.5, -52.5],
    [-33.5, -58],
  ];
  // The auricle stands off the skull toward its back rim and sits a little
  // further back (tragus ≈ 29 mm behind the temple line).
  const earShift = -6;
  const earL = smooth(
    earOuter.map(([z, y]) => v(earX + Math.max(0, -(z + 22)) * 0.4, y, z + earShift)),
    120,
  );
  const earInnerL = smooth(
    earInner.map(([z, y]) => v(earX + 2 + Math.max(0, -(z + 22)) * 0.3, y, z + earShift)),
    60,
  );
  const mirror = (pts: THREE.Vector3[]) => pts.map((p) => v(-p.x, p.y, p.z));

  // Brow line hint (short arc across the brow ridge).
  const brow = smooth(
    [v(-46, -9, 44), v(-24, -13, 57), v(0, -15, 62.6), v(24, -13, 57), v(46, -9, 44)],
    80,
  );

  return {
    profile,
    ring,
    arc,
    earL,
    earInnerL,
    earR: mirror(earL),
    earInnerR: mirror(earInnerL),
    brow,
  };
}
