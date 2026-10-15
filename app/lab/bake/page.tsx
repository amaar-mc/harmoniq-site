import type { Metadata } from 'next';
import BakeClient from './BakeClient';

export const metadata: Metadata = { title: 'Harmoniq — model bake', robots: { index: false } };

/** Runs the procedural generator and serialises the result (see scripts/bake-model.mjs). */
export default function BakePage() {
  return <BakeClient />;
}
