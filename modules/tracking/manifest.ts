import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'tracking',
  name: 'Felkövetés',
  description: 'Feladat és rendelés felkövetés — státuszok, timeline, felelősök',
  icon: 'ClipboardCheck',
  href: '/dashboard/modules/tracking',
  color: 'bg-emerald-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: [],
  permissions: [
    'tracking.view',
    'tracking.edit',
    'tracking.export',
  ],
  adminSettings: [
    { key: 'tracking_statuses', label: 'Státuszok (vesszővel elválasztva)', type: 'string', default: 'Nyitott,Folyamatban,Kész,Lezárt' },
    { key: 'tracking_unit', label: 'Mennyiségi egység', type: 'unit_select', default: 'pieces' },
  ],
  migrations: ['001_tracking.sql'],
};

registerModule(manifest);
