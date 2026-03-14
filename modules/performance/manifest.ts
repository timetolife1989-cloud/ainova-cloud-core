import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'performance',
  name: 'Performance',
  description: 'Individual and team KPI dashboard, standard time vs. actual time comparison',
  icon: 'TrendingUp',
  href: '/dashboard/modules/performance',
  color: 'bg-rose-600',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: [],
  permissions: [
    'performance.view',
    'performance.edit',
    'performance.export',
  ],
  adminSettings: [
    { key: 'performance_unit', label: 'Performance unit', type: 'unit_select', default: 'pieces' },
    { key: 'performance_time_unit', label: 'Time unit', type: 'unit_select', default: 'minutes' },
    { key: 'performance_target_percent', label: 'Target performance %', type: 'number', default: '100' },
  ],
  migrations: ['001_performance.sql'],
  sector: ['manufacturing'],
};

registerModule(manifest);
