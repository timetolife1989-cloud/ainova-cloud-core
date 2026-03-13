import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'delivery',
  name: 'Delivery',
  description: 'Delivery reports, customer breakdown, values and trends',
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
    { key: 'delivery_currency', label: 'Currency', type: 'unit_select', default: 'huf' },
    { key: 'delivery_weight_unit', label: 'Weight unit', type: 'unit_select', default: 'kg' },
  ],
  migrations: ['001_delivery.sql'],
};

registerModule(manifest);
