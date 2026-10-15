/**
 * Lab camera presets (world units: 1 = 100 mm, device centred at the origin).
 * The first four mirror the concept board's views.
 */
export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Device pitch in degrees (negative lifts the front of the band). */
  pitch?: number;
}

export const LAB_PRESETS: CameraPreset[] = [
  {
    id: 'hero',
    label: 'Hero ¾',
    position: [3.4, 1.32, 1.47],
    target: [0.1, -0.01, -0.14],
    fov: 23,
  },
  {
    id: 'front',
    label: 'Front (board)',
    position: [0, 1.5, -3.75],
    target: [0, -0.04, 0.12],
    fov: 26,
  },
  {
    id: 'side',
    label: 'Side profile',
    position: [3.54, 0.58, 1.39],
    target: [0.05, 0.05, -0.02],
    fov: 25,
  },
  {
    id: 'contacts',
    label: 'Contacts close-up',
    position: [-0.12, 0.46, -0.42],
    target: [0.02, 0.2, 0.6],
    fov: 30,
  },
  {
    id: 'trueFront',
    label: 'True front',
    position: [0, 0.45, 3.3],
    target: [0, -0.02, 0],
    fov: 30,
  },
  {
    id: 'top',
    label: 'Top',
    position: [0, 4.6, 0.25],
    target: [0, 0, 0],
    fov: 30,
  },
  {
    id: 'module',
    label: 'Module detail',
    position: [1.55, 0.62, 0.55],
    target: [0.8, 0.12, -0.1],
    fov: 30,
  },
  {
    id: 'arm',
    label: 'Arm detail',
    position: [1.95, 0.22, -0.18],
    target: [0.82, -0.02, -0.38],
    fov: 30,
  },
  {
    id: 'explode',
    label: 'Exploded',
    position: [2.9, 1.25, 2.3],
    target: [0.1, 0.0, -0.05],
    fov: 33,
    pitch: -6,
  },
  {
    id: 'underside',
    label: 'Underside',
    position: [1.2, -3.6, 1.4],
    target: [0, 0, 0],
    fov: 30,
  },
];
