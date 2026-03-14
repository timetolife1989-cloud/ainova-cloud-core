import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'shift-management',
  name: 'Shift Management',
  description: 'Shift planning, rotation rules, conflict detection',
  icon: 'CalendarClock',
  href: '/dashboard/modules/shift-management',
  color: 'bg-sky-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['shift-management.view', 'shift-management.edit'],
  adminSettings: [
    { key: 'shift_types', label: 'Shift types (comma-separated)', type: 'string', default: 'Morning,Afternoon,Night' },
  ],
  migrations: ['001_shift_management.sql'],
  sector: ['manufacturing'],
};

registerModule(manifest);
