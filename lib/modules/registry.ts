import { getSetting } from '@/lib/settings';
import { isModuleAllowed } from '@/lib/license';
import { getDb } from '@/lib/db';
import type { ModuleManifest, AdminSettingDef } from './types';

// Re-export types
export type { ModuleManifest, AdminSettingDef };

/**
 * Module definition — registered by each module in their manifest.ts
 * Extended with optional manifest fields for full module support.
 */
export interface ModuleDefinition {
  /** Unique module ID (e.g. 'workforce', 'performance') */
  id: string;

  /** Display name in the dashboard and admin panel */
  name: string;

  /** Short description for the admin panel */
  description: string;

  /** Lucide React icon name (e.g. 'Users', 'BarChart2') */
  icon: string;

  /** Dashboard route (e.g. '/dashboard/workforce') */
  href: string;

  /** Tailwind background color class (e.g. 'bg-indigo-600') */
  color: string;

  /**
   * IDs of modules that MUST be active before this module can be enabled.
   * The admin panel enforces these dependencies — you cannot enable a module
   * if its dependencies are not active. You cannot disable a dependency
   * while a dependent module is active.
   *
   * Example: performance module requires workforce to be active first.
   *   dependsOn: ['workforce']
   */
  dependsOn?: string[];

  /** If true, only shown to admin role users */
  adminOnly?: boolean;

  /** Module version for display */
  version?: string;

  /** License tier required for this module */
  tier?: 'basic' | 'professional' | 'enterprise';

  /** Module-specific permissions */
  permissions?: string[];

  /** Admin panel settings definitions */
  adminSettings?: AdminSettingDef[];

  /** Migration file names */
  migrations?: string[];
}

/** All registered modules — Phase 2 modules push into this array */
const ALL_MODULES: ModuleDefinition[] = [];

/** Register a module (called from each module's manifest.ts) */
export function registerModule(mod: ModuleDefinition): void {
  const existing = ALL_MODULES.find(m => m.id === mod.id);
  if (!existing) {
    ALL_MODULES.push(mod);
  }

  // Auto-regisztráció: modul permission-ök (best-effort, non-blocking)
  if (mod.permissions && mod.permissions.length > 0) {
    ensurePermissionsExist(mod.id, mod.permissions).catch(() => {});
  }
}

/**
 * Ensure module permissions exist in the database.
 * Non-blocking, best-effort — won't fail if DB is unavailable.
 */
async function ensurePermissionsExist(moduleId: string, permissions: string[]): Promise<void> {
  try {
    const db = getDb();
    for (const perm of permissions) {
      await db.query(
        `IF NOT EXISTS (SELECT 1 FROM core_permissions WHERE permission_code = @p0)
         INSERT INTO core_permissions (permission_code, description, module_id, is_builtin)
         VALUES (@p0, @p1, @p2, 0)`,
        [
          { name: 'p0', type: 'nvarchar', value: perm },
          { name: 'p1', type: 'nvarchar', value: `${moduleId} module permission` },
          { name: 'p2', type: 'nvarchar', value: moduleId },
        ]
      );
    }
  } catch {
    // Ignore — DB might not be ready yet
  }
}

/** Get all registered modules (read-only copy) */
export function getAllModules(): ModuleDefinition[] {
  return [...ALL_MODULES];
}

/** The built-in Admin module — always visible to admin role, never in the registry */
export const ADMIN_MODULE: ModuleDefinition = {
  id: 'admin',
  name: 'Admin Panel',
  description: 'admin.registry.admin_desc',
  icon: 'Settings',
  href: '/dashboard/admin',
  color: 'bg-slate-700',
  adminOnly: true,
  version: '1.0.0',
};

/**
 * Validate that enabling/disabling a module won't create dependency violations.
 * Returns null if OK, or an error message if not.
 */
export function validateModuleToggle(
  moduleId: string,
  enabling: boolean,
  currentlyActive: string[]
): string | null {
  const mod = ALL_MODULES.find(m => m.id === moduleId);
  if (!mod) return `Ismeretlen modul: ${moduleId}`;

  if (enabling) {
    // Check all dependencies are active
    const missingDeps = (mod.dependsOn ?? []).filter(
      dep => !currentlyActive.includes(dep)
    );
    if (missingDeps.length > 0) {
      const depNames = missingDeps
        .map(id => ALL_MODULES.find(m => m.id === id)?.name ?? id)
        .join(', ');
      return `Ez a modul a következőket igényli: ${depNames}`;
    }
  } else {
    // Check no active module depends on this one
    const dependents = ALL_MODULES.filter(
      m => currentlyActive.includes(m.id) && m.dependsOn?.includes(moduleId)
    );
    if (dependents.length > 0) {
      const depNames = dependents.map(m => m.name).join(', ');
      return `A következő aktív modulok függenek ettől: ${depNames}`;
    }
  }

  return null; // OK
}

/**
 * Get the ordered list of active modules for the current user.
 * Always appends the Admin module for admin users.
 * Falls back gracefully if settings DB is unreachable.
 */
export async function getActiveModules(role: string): Promise<ModuleDefinition[]> {
  let activeIds: string[] = [];
  try {
    const raw = await getSetting('active_modules');
    activeIds = JSON.parse(raw ?? '[]');
  } catch {
    activeIds = [];
  }

  // Szűrés: csak licencben engedélyezett ÉS admin által aktivált modulok
  const licenseChecks = await Promise.all(
    ALL_MODULES
      .filter(m => activeIds.includes(m.id))
      .map(async m => ({ mod: m, allowed: await isModuleAllowed(m.id) }))
  );
  const active = licenseChecks.filter(c => c.allowed).map(c => c.mod);

  if (role === 'admin') {
    active.push(ADMIN_MODULE);
  }

  return active;
}

/**
 * Get active module IDs from settings.
 */
export async function getActiveModuleIds(): Promise<string[]> {
  try {
    const raw = await getSetting('active_modules');
    return JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
}
