import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'worksheets',
  name: 'Munkalapok',
  description: 'Munkalapok, munkafázisok és anyagfelhasználás',
  icon: 'ClipboardList',
  href: '/dashboard/modules/worksheets',
  color: 'bg-teal-600',
  version: '1.0.0',
  tier: 'professional',
  dependsOn: ['inventory'],
  permissions: [
    'worksheets.view',
    'worksheets.edit',
    'worksheets.sign',
    'worksheets.export',
  ],
  adminSettings: [
    { key: 'worksheets_default_labor_rate', label: 'Default labor rate (Ft/h)', type: 'number', default: '5000' },
    { key: 'worksheets_auto_deduct_inventory', label: 'Auto deduct inventory', type: 'boolean', default: 'true' },
  ],
  migrations: ['modules/worksheets/migrations/001_worksheets.sql'],
});
