'use client';

import dynamic from 'next/dynamic';

const NeuronBackground = dynamic(
  () => import('./NeuronBackground').then(m => m.NeuronBackground),
  { ssr: false }
);

interface LazyNeuronBackgroundProps {
  nodeCount?: number;
  connectionDistance?: number;
  overlayOpacity?: number;
  className?: string;
}

export function LazyNeuronBackground(props: LazyNeuronBackgroundProps) {
  return <NeuronBackground {...props} />;
}
