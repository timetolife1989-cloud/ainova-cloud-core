'use client';

import dynamic from 'next/dynamic';

const InactivityGuard = dynamic(
  () => import('./InactivityGuard').then(m => m.InactivityGuard),
  { ssr: false }
);

export function LazyInactivityGuard() {
  return <InactivityGuard />;
}
