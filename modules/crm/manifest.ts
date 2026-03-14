import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'crm',
  name: 'CRM Ügyfélkezelés',
  description: 'Customer Relationship Management',
  icon: 'Users',
  href: '/dashboard/modules/crm',
  color: 'bg-blue-600',
  version: '1.0.0',
  tier: 'professional',
  dependsOn: [],
  permissions: [
    'crm.view',
    'crm.edit',
    'crm.delete',
    'crm.export',
  ],
  adminSettings: [
    { key: 'crm_default_source', label: 'Default customer source', type: 'string', default: 'website' },
    { key: 'crm_pipeline_stages', label: 'Pipeline stages (comma-separated)', type: 'string', default: 'lead,proposal,negotiation,won,lost' },
  ],
  migrations: ['modules/crm/migrations/001_crm.sql'],
});
