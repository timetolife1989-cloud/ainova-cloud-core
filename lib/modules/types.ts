export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;                     // Lucide icon name (e.g. 'Users', 'BarChart2')
  href: string;                     // Dashboard route (e.g. '/dashboard/modules/workforce')
  color: string;                    // Tailwind bg color class (e.g. 'bg-indigo-600')
  version: string;
  tier: 'basic' | 'professional' | 'enterprise';
  dependsOn: string[];              // Dependencies (module IDs)
  permissions: string[];            // Module-specific permission codes
  adminSettings: AdminSettingDef[]; // Admin panel configurable settings
  migrations: string[];             // SQL file names from the module migrations/ folder
  adminOnly?: boolean;
  sector?: string[];                // Sector IDs where this module is relevant
  comingSoon?: boolean;             // Module announced but not yet implemented
  isAddon?: boolean;                // Available as add-on outside tier bundles
}

export interface AdminSettingDef {
  key: string;                      // e.g. 'workforce_default_shift_count'
  label: string;                    // e.g. 'Default shift count'
  type: 'string' | 'number' | 'boolean' | 'select' | 'unit_select' | 'color';
  default: string;
  options?: { value: string; label: string }[];  // for type='select'
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
