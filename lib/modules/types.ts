export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;                     // Lucide ikon neve (pl. 'Users', 'BarChart2')
  href: string;                     // Dashboard route (pl. '/dashboard/modules/workforce')
  color: string;                    // Tailwind bg color class (pl. 'bg-indigo-600')
  version: string;
  tier: 'basic' | 'professional' | 'enterprise';
  dependsOn: string[];              // Függőségek (modul ID-k)
  permissions: string[];            // Modul-specifikus permission kódok
  adminSettings: AdminSettingDef[]; // Admin panelből konfigurálható beállítások
  migrations: string[];             // SQL fájl nevek a modul migrations/ mappájából
  adminOnly?: boolean;
}

export interface AdminSettingDef {
  key: string;                      // pl. 'workforce_default_shift_count'
  label: string;                    // pl. 'Alapértelmezett műszakszám'
  type: 'string' | 'number' | 'boolean' | 'select' | 'unit_select' | 'color';
  default: string;
  options?: { value: string; label: string }[];  // type='select' esetén
  description?: string;
}

export interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  order: number;
}

// Backward compatibility: ModuleDefinition alias
export type ModuleDefinition = ModuleManifest;
