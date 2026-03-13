import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'plc-connector',
  name: 'PLC Connector',
  description: 'Automatic data collection from PLC controllers (Siemens S7, Logo, Modbus)',
  version: '1.0.0',
  icon: '🔌',
  color: 'green',
  tier: 'enterprise',
  href: '/dashboard/modules/plc-connector',
  permissions: ['plc-connector.view', 'plc-connector.edit'],
  adminSettings: [
    { key: 'plc_poll_interval', label: 'Poll interval (ms)', type: 'number', default: '5000' },
    { key: 'plc_protocol', label: 'Default protocol', type: 'select', default: 's7', options: [
      { value: 's7', label: 'Siemens S7 (snap7)' },
      { value: 'modbus_tcp', label: 'Modbus TCP' },
      { value: 'modbus_rtu', label: 'Modbus RTU (serial)' },
      { value: 'mqtt', label: 'MQTT' },
      { value: 'opcua', label: 'OPC-UA' },
    ]},
    { key: 'plc_alert_email', label: 'Alert email address', type: 'string', default: '' },
  ],
  dependsOn: [],
  migrations: ['001_plc_connector.sql', '002_plc_enhancements.sql'],
});
