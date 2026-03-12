import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'workforce',
  name: 'Létszám & Jelenlét',
  description: 'Napi műszaki létszám rögzítés, hiányzások, jogosítványok nyomon követése',
  icon: 'Users',
  href: '/dashboard/modules/workforce',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: [],
  permissions: [
    'workforce.view',
    'workforce.edit',
    'workforce.export',
  ],
  adminSettings: [
    { key: 'workforce_shifts_per_day', label: 'Műszakok száma naponta', type: 'number', default: '3' },
    { key: 'workforce_unit', label: 'Létszám mértékegysége', type: 'unit_select', default: 'pieces' },
    { key: 'workforce_track_absences', label: 'Hiányzások nyomon követése', type: 'boolean', default: 'true' },
  ],
  migrations: ['001_workforce.sql', '002_workforce_overtime.sql'],
};

registerModule(manifest);
