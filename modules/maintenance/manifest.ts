import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'maintenance',
  name: 'Maintenance',
  description: 'Maintenance scheduling, MTBF/MTTR, due date alerts',
  icon: 'Wrench',
  href: '/dashboard/modules/maintenance',
  color: 'bg-stone-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['maintenance.view', 'maintenance.edit', 'maintenance.export'],
  adminSettings: [
    { key: 'maintenance_alert_days', label: 'Alert days in advance', type: 'number', default: '7' },
  ],
  migrations: ['001_maintenance.sql'],
  sector: ['manufacturing', 'logistics'],
};

registerModule(manifest);
