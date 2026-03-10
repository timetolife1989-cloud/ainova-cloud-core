import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'inventory',
  name: 'Készletnyilvántartás',
  description: 'Készletkezelés, minimum szintek, mozgás napló',
  icon: 'Package',
  href: '/dashboard/modules/inventory',
  color: 'bg-lime-600',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: [],
  permissions: [
    'inventory.view',
    'inventory.edit',
    'inventory.export',
  ],
  adminSettings: [
    { key: 'inventory_quantity_unit', label: 'Mennyiség mértékegysége', type: 'unit_select', default: 'pieces' },
    { key: 'inventory_low_stock_alert', label: 'Alacsony készlet figyelmeztetés', type: 'boolean', default: 'true' },
  ],
  migrations: ['001_inventory.sql'],
};

registerModule(manifest);
