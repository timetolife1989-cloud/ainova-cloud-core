import { getSetting } from '@/lib/settings';

/**
 * Module definition — registered by each module in their manifest.ts
 * Phase 2 modules will call registerModule() to add themselves here.
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
}

/** All registered modules — Phase 2 modules push into this array */
const ALL_MODULES: ModuleDefinition[] = [];

/** Register a module (called from each module's manifest.ts) */
export function registerModule(mod: ModuleDefinition): void {
  const existing = ALL_MODULES.find(m => m.id === mod.id);
  if (!existing) {
    ALL_MODULES.push(mod);
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
  description: 'Felhasználók, modulok, beállítások',
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

  const active = ALL_MODULES.filter(m => activeIds.includes(m.id));

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
