import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'lac-napi-perces',
  name: 'Napi Perces',
  description: 'LAC gyártási teljesítmény — napi/heti/havi kimutatás',
  icon: 'BarChart2',
  href: '/dashboard/napi-perces',
  color: 'bg-blue-500',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: [],
  permissions: [
    'lac-napi-perces.view',
    'lac-napi-perces.export',
    'lac-napi-perces.import',
  ],
  adminSettings: [],
  migrations: [
    '001_sap_visszajelentes.sql',
    '002_norma_friss.sql',
    '003_sap_munkaterv.sql',
    '004_targets_schedule.sql',
    '005_v_napi_perces.sql',
  ],
};

registerModule(manifest);
