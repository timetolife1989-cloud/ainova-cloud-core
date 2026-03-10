import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'delivery',
  name: 'Kiszállítás',
  description: 'Kiszállítási riport, vevő-bontás, értékek és trendek',
  icon: 'Truck',
  href: '/dashboard/modules/delivery',
  color: 'bg-orange-600',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: [],
  permissions: [
    'delivery.view',
    'delivery.edit',
    'delivery.export',
  ],
  adminSettings: [
    { key: 'delivery_currency', label: 'Pénznem', type: 'unit_select', default: 'huf' },
    { key: 'delivery_weight_unit', label: 'Súly mértékegysége', type: 'unit_select', default: 'kg' },
  ],
  migrations: ['001_delivery.sql'],
};

registerModule(manifest);
