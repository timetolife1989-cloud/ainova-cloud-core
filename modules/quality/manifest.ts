import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'quality',
  name: 'Quality Control',
  description: 'Measurements, scrap tracking, 8D reports, defect code catalog',
  icon: 'ShieldCheck',
  href: '/dashboard/modules/quality',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['quality.view', 'quality.edit', 'quality.export'],
  adminSettings: [
    { key: 'quality_reject_codes', label: 'Reject codes (comma-separated)', type: 'string', default: 'DIM,VIS,FUN,MAT,OTH' },
  ],
  migrations: ['001_quality.sql'],
  sector: ['manufacturing', 'gastronomy'],
};

registerModule(manifest);
