import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'digital-twin',
  name: 'Digital Twin',
  description: '2D gyártósor vizualizáció valós idejű gép állapotokkal',
  version: '1.0.0',
  icon: '🏗️',
  color: 'cyan',
  tier: 'enterprise',
  href: '/dashboard/modules/digital-twin',
  permissions: ['digital-twin.view', 'digital-twin.edit'],
  adminSettings: [],
  dependsOn: [],
  migrations: ['001_digital_twin.sql'],
});
