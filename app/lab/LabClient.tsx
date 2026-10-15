'use client';

import dynamic from 'next/dynamic';

const LabScene = dynamic(() => import('./LabScene'), { ssr: false });

export default function LabClient() {
  return <LabScene />;
}
