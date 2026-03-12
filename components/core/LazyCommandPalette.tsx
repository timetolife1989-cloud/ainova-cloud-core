'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(
  () => import('@/components/core/CommandPalette').then(m => m.CommandPalette),
  { ssr: false }
);

export function LazyCommandPalette() {
  return <CommandPalette />;
}
