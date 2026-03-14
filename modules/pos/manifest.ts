import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'pos',
  name: 'POS / Pénztár',
  description: 'Point of Sale — touchscreen-optimized sales terminal',
  icon: 'CreditCard',
  href: '/dashboard/modules/pos',
  color: 'bg-emerald-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: ['inventory', 'invoicing'],
  permissions: [
    'pos.view',
    'pos.sell',
    'pos.refund',
    'pos.close_day',
    'pos.export',
  ],
  adminSettings: [
    {
      key: 'pos_receipt_prefix',
      label: 'Receipt number prefix',
      type: 'string',
      default: 'REC',
    },
    {
      key: 'pos_default_vat',
      label: 'Default VAT rate (%)',
      type: 'number',
      default: '27',
    },
    {
      key: 'pos_allow_discount',
      label: 'Allow cashier discounts',
      type: 'boolean',
      default: 'true',
    },
  ],
  migrations: ['modules/pos/migrations/001_pos.sql'],
});
