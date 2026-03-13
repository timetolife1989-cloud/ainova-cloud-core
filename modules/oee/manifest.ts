import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'oee',
  name: 'OEE Dashboard',
  description: 'Overall Equipment Effectiveness — Availability × Performance × Quality',
  icon: 'Gauge',
  href: '/dashboard/modules/oee',
  color: 'bg-red-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['oee.view', 'oee.edit', 'oee.export'],
  adminSettings: [
    { key: 'oee_target_percent', label: 'OEE target %', type: 'number', default: '85' },
    { key: 'oee_shift_hours', label: 'Shift length (hours)', type: 'number', default: '8' },
  ],
  migrations: ['001_oee.sql'],
};

registerModule(manifest);
