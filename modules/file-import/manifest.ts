import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'file-import',
  name: 'File Import',
  description: 'Generic CSV and Excel file import with admin configuration',
  icon: 'FileUp',
  href: '/dashboard/modules/file-import',
  color: 'bg-cyan-600',
  version: '1.0.0',
  tier: 'basic' as const,
  dependsOn: [],
  permissions: [
    'file-import.view',
    'file-import.execute',
  ],
  adminSettings: [],
  migrations: [],
  sector: ['retail', 'gastronomy'],
};

registerModule(manifest);
