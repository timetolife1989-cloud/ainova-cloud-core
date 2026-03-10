import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'file-import',
  name: 'Fájl Import',
  description: 'Generikus CSV és Excel fájlok importálása admin konfigurációval',
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
};

registerModule(manifest);
