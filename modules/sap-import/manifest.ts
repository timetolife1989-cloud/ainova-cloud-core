import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'sap-import',
  name: 'SAP Integration',
  description: 'SAP ECC / S/4HANA data exchange — RFC, OData and file-based synchronization (prepared)',
  version: '1.0.0',
  icon: '🔗',
  color: 'blue',
  tier: 'professional',
  href: '/dashboard/modules/sap-import',
  permissions: ['sap-import.view', 'sap-import.edit', 'sap-import.sync'],
  adminSettings: [
    {
      key: 'sap_default_language',
      label: 'SAP default language',
      type: 'select',
      default: 'HU',
      options: [
        { value: 'HU', label: 'Hungarian (HU)' },
        { value: 'DE', label: 'German (DE)' },
        { value: 'EN', label: 'English (EN)' },
      ],
    },
    {
      key: 'sap_sync_interval_hours',
      label: 'Sync interval (hours)',
      type: 'number',
      default: '24',
    },
    {
      key: 'sap_max_rows_per_sync',
      label: 'Max rows per sync',
      type: 'number',
      default: '10000',
    },
    {
      key: 'sap_cache_enabled',
      label: 'SAP data cache enabled',
      type: 'boolean',
      default: 'true',
    },
  ],
  dependsOn: [],
  migrations: ['001_sap_connector.sql'],
});
