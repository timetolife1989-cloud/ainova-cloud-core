import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'maintenance',
  name: 'Karbantartás',
  description: 'Karbantartás ütemezés, MTBF/MTTR, esedékesség alertek',
  icon: 'Wrench',
  href: '/dashboard/modules/maintenance',
  color: 'bg-stone-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['maintenance.view', 'maintenance.edit', 'maintenance.export'],
  adminSettings: [
    { key: 'maintenance_alert_days', label: 'Figyelmeztetés nappal előtte', type: 'number', default: '7' },
  ],
  migrations: ['001_maintenance.sql'],
};

registerModule(manifest);
