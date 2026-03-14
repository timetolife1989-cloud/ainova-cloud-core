import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'e-commerce',
  name: 'Webshop szinkron',
  description: 'E-commerce integration with WooCommerce and Shopify sync',
  icon: 'Globe',
  href: '/dashboard/modules/e-commerce',
  color: 'bg-pink-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: ['inventory'],
  permissions: [
    'e-commerce.view',
    'e-commerce.edit',
    'e-commerce.sync',
  ],
  adminSettings: [
    { key: 'ecommerce_sync_interval', label: 'Sync interval (minutes)', type: 'number', default: '15' },
    { key: 'ecommerce_auto_sync', label: 'Auto sync enabled', type: 'boolean', default: 'true' },
  ],
  migrations: ['modules/e-commerce/migrations/001_e-commerce.sql'],
  sector: ['retail'],
  isAddon: true,
});
