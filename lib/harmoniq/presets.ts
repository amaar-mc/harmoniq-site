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
    position: [2.75, 0.78, 0.38],
    target: [-0.12, -0.02, -0.04],
    fov: 27,
    pitch: -9,
  },
  {
    id: 'front',
    label: 'Front (board)',
    position: [0, 0.42, -2.55],
    target: [0, 0.0, 0.34],
    fov: 30,
  },
  {
    id: 'side',
    label: 'Side profile',
    position: [3.15, 0.5, 0.35],
    target: [0, -0.1, -0.08],
    fov: 30,
  },
  {
    id: 'contacts',
    label: 'Contacts close-up',
    position: [-0.24, 0.1, -0.02],
    target: [0.14, 0.19, 0.56],
    fov: 32,
  },
  {
    id: 'trueFront',
    label: 'True front',
    position: [0, 0.55, 4.3],
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
    id: 'arm',
    label: 'Arm detail',
    position: [1.95, 0.22, -0.18],
    target: [0.82, -0.02, -0.38],
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
    id: 'underside',
    label: 'Underside',
    position: [1.2, -3.6, 1.4],
    target: [0, 0, 0],
    fov: 30,
  },
];
