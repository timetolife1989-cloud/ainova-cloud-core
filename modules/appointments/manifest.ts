import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'appointments',
  name: 'Időpontfoglalás',
  description: 'Appointment scheduling with slot management and booking tracking',
  icon: 'CalendarCheck',
  href: '/dashboard/modules/appointments',
  color: 'bg-purple-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: [
    'appointments.view',
    'appointments.edit',
    'appointments.manage',
  ],
  adminSettings: [
    { key: 'appointments_default_duration', label: 'Default slot duration (min)', type: 'number', default: '30' },
    { key: 'appointments_allow_overlap', label: 'Allow overlapping bookings', type: 'boolean', default: 'false' },
  ],
  migrations: ['modules/appointments/migrations/001_appointments.sql'],
  sector: ['services'],
  isAddon: true,
});
