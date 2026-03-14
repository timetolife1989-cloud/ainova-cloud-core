import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'api-gateway',
  name: 'API Gateway',
  description: 'REST API key management for external system integrations',
  icon: 'KeyRound',
  href: '/dashboard/modules/api-gateway',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'professional',
  dependsOn: [],
  permissions: [
    'api-gateway.view',
    'api-gateway.manage',
  ],
  adminSettings: [
    { key: 'api_gateway_default_rate_limit', label: 'Default rate limit (req/hour)', type: 'number', default: '1000' },
    { key: 'api_gateway_enable_logging', label: 'Enable API request logging', type: 'boolean', default: 'true' },
  ],
  migrations: [],
  isAddon: true,
});
