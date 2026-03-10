import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'shift-management',
  name: 'Műszakbeosztás',
  description: 'Műszak tervezés, rotáció szabályok, ütközés detektálás',
  icon: 'CalendarClock',
  href: '/dashboard/modules/shift-management',
  color: 'bg-sky-600',
  version: '1.0.0',
  tier: 'enterprise' as const,
  dependsOn: [],
  permissions: ['shift-management.view', 'shift-management.edit'],
  adminSettings: [
    { key: 'shift_types', label: 'Műszak típusok (vesszővel)', type: 'string', default: 'Reggeli,Délutáni,Éjszakai' },
  ],
  migrations: ['001_shift_management.sql'],
};

registerModule(manifest);
