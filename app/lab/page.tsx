import type { Metadata } from 'next';
import LabClient from './LabClient';

export const metadata: Metadata = {
  title: 'Harmoniq — Model lab',
  description: 'Internal viewer for the procedural Harmoniq headband model.',
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <LabClient />;
}
