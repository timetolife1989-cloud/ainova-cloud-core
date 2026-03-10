import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'quality',
  name: 'Minőségellenőrzés',
  description: 'Mérések, selejtezés, 8D riport, hibakód katalógus',
  icon: 'ShieldCheck',
  href: '/dashboard/modules/quality',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['quality.view', 'quality.edit', 'quality.export'],
  adminSettings: [
    { key: 'quality_reject_codes', label: 'Hibakódok (vesszővel)', type: 'string', default: 'DIM,VIS,FUN,MAT,OTH' },
  ],
  migrations: ['001_quality.sql'],
};

registerModule(manifest);
