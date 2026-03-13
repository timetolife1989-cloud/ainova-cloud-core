import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'reports',
  name: 'Reports',
  description: 'Basic report generator — charts, tables, Excel export',
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
      label: 'Default period',
      type: 'select',
      default: '30',
      options: [
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
      ],
    },
  ],
  migrations: ['001_reports.sql'],
};

registerModule(manifest);
