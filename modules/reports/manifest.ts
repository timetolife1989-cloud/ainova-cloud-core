import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'reports',
  name: 'Riportok',
  description: 'Alap riport generátor — diagramok, táblák, Excel export',
  icon: 'PieChart',
  href: '/dashboard/modules/reports',
  color: 'bg-violet-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: [],
  permissions: [
    'reports.view',
    'reports.edit',
    'reports.export',
  ],
  adminSettings: [
    {
      key: 'reports_default_period',
      label: 'Alapértelmezett időszak',
      type: 'select',
      default: '30',
      options: [
        { value: '7', label: 'Utolsó 7 nap' },
        { value: '30', label: 'Utolsó 30 nap' },
        { value: '90', label: 'Utolsó 90 nap' },
      ],
    },
  ],
  migrations: ['001_reports.sql'],
};

registerModule(manifest);
