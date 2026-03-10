import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'performance',
  name: 'Teljesítmény',
  description: 'Egyéni és csapat KPI dashboard, normaidő vs. valós idő összehasonlítás',
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
    { key: 'performance_unit', label: 'Teljesítmény mértékegysége', type: 'unit_select', default: 'pieces' },
    { key: 'performance_time_unit', label: 'Idő mértékegysége', type: 'unit_select', default: 'minutes' },
    { key: 'performance_target_percent', label: 'Cél teljesítmény %', type: 'number', default: '100' },
  ],
  migrations: ['001_performance.sql'],
};

registerModule(manifest);
