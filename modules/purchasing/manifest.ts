import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'purchasing',
  name: 'Purchasing',
  description: 'Supplier management, purchase orders, receiving',
  icon: 'ShoppingBag',
  href: '/dashboard/modules/purchasing',
  color: 'bg-orange-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: ['inventory'],
  permissions: [
    'purchasing.view',
    'purchasing.edit',
    'purchasing.approve',
    'purchasing.export',
  ],
  adminSettings: [
    { key: 'purchasing_auto_suggest', label: 'Automatic purchase suggestions', type: 'boolean', default: 'true' },
    { key: 'purchasing_order_prefix', label: 'Order number prefix', type: 'string', default: 'PO' },
    { key: 'purchasing_default_vat', label: 'Default VAT rate (%)', type: 'number', default: '27' },
  ],
  migrations: ['001_purchasing.sql'],
};

registerModule(manifest);
