import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'scheduling',
  name: 'Capacity Planning',
  description: 'Weekly capacity planning, utilization rates, allocation',
  icon: 'Calendar',
  href: '/dashboard/modules/scheduling',
  color: 'bg-teal-600',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: [],
  permissions: [
    'scheduling.view',
    'scheduling.edit',
    'scheduling.export',
  ],
  adminSettings: [
    { key: 'scheduling_hours_per_day', label: 'Work hours per day', type: 'number', default: '8' },
    { key: 'scheduling_days_per_week', label: 'Work days per week', type: 'number', default: '5' },
    { key: 'scheduling_capacity_unit', label: 'Capacity unit', type: 'unit_select', default: 'hours' },
  ],
  migrations: ['001_scheduling.sql'],
};

registerModule(manifest);
