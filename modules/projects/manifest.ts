import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'projects',
  name: 'Projektkezelés',
  description: 'Project management with Kanban tasks and budget tracking',
  icon: 'FolderKanban',
  href: '/dashboard/modules/projects',
  color: 'bg-cyan-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: [
    'projects.view',
    'projects.edit',
    'projects.manage',
    'projects.export',
  ],
  adminSettings: [
    { key: 'projects_default_currency', label: 'Default currency', type: 'string', default: 'HUF' },
  ],
  migrations: ['modules/projects/migrations/001_projects.sql'],
  sector: ['construction', 'logistics'],
  isAddon: true,
});
