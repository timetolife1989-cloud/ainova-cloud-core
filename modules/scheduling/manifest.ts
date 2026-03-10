import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'scheduling',
  name: 'Kapacitás tervezés',
  description: 'Heti kapacitás tervezés, feltöltési arányok, allokáció',
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
    { key: 'scheduling_hours_per_day', label: 'Munkaórák naponta', type: 'number', default: '8' },
    { key: 'scheduling_days_per_week', label: 'Munkanapok hetente', type: 'number', default: '5' },
    { key: 'scheduling_capacity_unit', label: 'Kapacitás mértékegysége', type: 'unit_select', default: 'hours' },
  ],
  migrations: ['001_scheduling.sql'],
};

registerModule(manifest);
