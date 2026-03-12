import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'sap-import',
  name: 'SAP Integráció',
  description: 'SAP ECC / S/4HANA adatcsere — RFC, OData és fájl alapú szinkronizálás előkészítve',
  version: '1.0.0',
  icon: '🔗',
  color: 'blue',
  tier: 'enterprise',
  href: '/dashboard/modules/sap-import',
  permissions: ['sap-import.view', 'sap-import.edit', 'sap-import.sync'],
  adminSettings: [
    {
      key: 'sap_default_language',
      label: 'SAP alapértelmezett nyelv',
      type: 'select',
      default: 'HU',
      options: [
        { value: 'HU', label: 'Magyar (HU)' },
        { value: 'DE', label: 'Német (DE)' },
        { value: 'EN', label: 'Angol (EN)' },
      ],
    },
    {
      key: 'sap_sync_interval_hours',
      label: 'Szinkronizálás gyakorisága (óra)',
      type: 'number',
      default: '24',
    },
    {
      key: 'sap_max_rows_per_sync',
      label: 'Max sorok szinkronizálásonként',
      type: 'number',
      default: '10000',
    },
    {
      key: 'sap_cache_enabled',
      label: 'SAP adat cache engedélyezve',
      type: 'boolean',
      default: 'true',
    },
  ],
  dependsOn: [],
  migrations: ['001_sap_connector.sql'],
});
