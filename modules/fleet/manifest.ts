import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'fleet',
  name: 'Fleet Management',
  description: 'Vehicle tracking, mileage, refueling',
  icon: 'Car',
  href: '/dashboard/modules/fleet',
  color: 'bg-amber-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: [],
  permissions: [
    'fleet.view',
    'fleet.edit',
    'fleet.export',
  ],
  adminSettings: [
    { key: 'fleet_distance_unit', label: 'Distance unit', type: 'unit_select', default: 'km' },
    { key: 'fleet_fuel_unit', label: 'Fuel unit', type: 'unit_select', default: 'liters' },
    { key: 'fleet_currency', label: 'Currency', type: 'unit_select', default: 'huf' },
  ],
  migrations: ['001_fleet.sql'],
};

registerModule(manifest);
