import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'plc-connector',
  name: 'PLC Connector',
  description: 'Automatikus adatgyűjtés PLC vezérlőkből (Siemens S7, Logo, Modbus)',
  version: '1.0.0',
  icon: '🔌',
  color: 'green',
  tier: 'enterprise',
  href: '/dashboard/modules/plc-connector',
  permissions: ['plc-connector.view', 'plc-connector.edit'],
  adminSettings: [
    { key: 'plc_poll_interval', label: 'Lekérdezési intervallum (ms)', type: 'number', default: '5000' },
    { key: 'plc_protocol', label: 'Protokoll', type: 'select', default: 's7', options: [{ value: 's7', label: 'Siemens S7' }, { value: 'modbus', label: 'Modbus TCP' }, { value: 'mqtt', label: 'MQTT' }] },
  ],
  dependsOn: [],
  migrations: ['001_plc_connector.sql'],
});
