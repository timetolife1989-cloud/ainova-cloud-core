import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'workforce',
  name: 'Workforce & Attendance',
  description: 'Daily shift headcount recording, absences, certifications tracking',
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
    { key: 'workforce_shifts_per_day', label: 'Shifts per day', type: 'number', default: '3' },
    { key: 'workforce_unit', label: 'Headcount unit', type: 'unit_select', default: 'pieces' },
    { key: 'workforce_track_absences', label: 'Track absences', type: 'boolean', default: 'true' },
  ],
  migrations: ['001_workforce.sql', '002_workforce_overtime.sql'],
};

registerModule(manifest);
