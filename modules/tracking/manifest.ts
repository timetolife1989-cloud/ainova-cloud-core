import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'tracking',
  name: 'Tracking',
  description: 'Task and order tracking — statuses, timeline, assignees',
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
    { key: 'tracking_statuses', label: 'Statuses (comma-separated)', type: 'string', default: 'Nyitott,Folyamatban,Kész,Lezárt' },
    { key: 'tracking_unit', label: 'Quantity unit', type: 'unit_select', default: 'pieces' },
  ],
  migrations: ['001_tracking.sql'],
};

registerModule(manifest);
