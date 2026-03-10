import { getDb } from '@/lib/db';

export interface RoleInfo {
  id: number;
  roleCode: string;
  roleLabel: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  isBuiltin: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface PermissionInfo {
  id: number;
  permissionCode: string;
  description: string | null;
  moduleId: string | null;
  isBuiltin: boolean;
}

interface RoleRow {
  id: number;
  role_code: string;
  role_label: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  is_builtin: boolean;
  is_active: boolean;
}

interface PermissionRow {
  id: number;
  permission_code: string;
  description: string | null;
  module_id: string | null;
  is_builtin: boolean;
}

interface RolePermRow {
  permission_code: string;
}

// Cache: role_code → permission_code[]
const _permCache = new Map<string, { perms: string[]; at: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 perc

/**
 * Visszaadja egy adott role jogosultságait.
 * 5 percig cache-eli.
 */
export async function getPermissionsForRole(roleCode: string): Promise<string[]> {
  const now = Date.now();
  const cached = _permCache.get(roleCode);
  if (cached && (now - cached.at) < CACHE_TTL) return cached.perms;

  try {
    const rows = await getDb().query<RolePermRow>(
      `SELECT p.permission_code
       FROM core_role_permissions rp
       JOIN core_roles r ON rp.role_id = r.id
       JOIN core_permissions p ON rp.permission_id = p.id
       WHERE r.role_code = @p0 AND r.is_active = 1`,
      [{ name: 'p0', type: 'nvarchar', value: roleCode }]
    );
    const perms = rows.map(r => r.permission_code);
    _permCache.set(roleCode, { perms, at: now });
    return perms;
  } catch (err) {
    console.error('[RBAC] Failed to load permissions for role:', roleCode, err);
    // Fallback: admin gets everything, others get nothing
    if (roleCode === 'admin') return ['*'];
    return [];
  }
}

/**
 * Ellenőrzi, hogy egy role rendelkezik-e egy adott jogosultsággal.
 */
export async function hasPermission(roleCode: string, permissionCode: string): Promise<boolean> {
  // Admin role always has all permissions as fallback
  if (roleCode === 'admin') return true;

  const perms = await getPermissionsForRole(roleCode);
  if (perms.includes('*')) return true;
  return perms.includes(permissionCode);
}

/**
 * Összes role lekérése (admin UI-hoz).
 */
export async function getAllRoles(): Promise<RoleInfo[]> {
  try {
    const roles = await getDb().query<RoleRow>(
      `SELECT id, role_code, role_label, description, color, icon, priority, is_builtin, is_active
       FROM core_roles ORDER BY priority DESC`
    );

    const roleInfos: RoleInfo[] = [];
    for (const r of roles) {
      const perms = await getPermissionsForRole(r.role_code);
      roleInfos.push({
        id: r.id,
        roleCode: r.role_code,
        roleLabel: r.role_label,
        description: r.description,
        color: r.color,
        icon: r.icon,
        priority: r.priority,
        isBuiltin: Boolean(r.is_builtin),
        isActive: Boolean(r.is_active),
        permissions: perms,
      });
    }
    return roleInfos;
  } catch (err) {
    console.error('[RBAC] Failed to load roles:', err);
    return [];
  }
}

/**
 * Összes permission lekérése (admin UI-hoz).
 */
export async function getAllPermissions(): Promise<PermissionInfo[]> {
  try {
    const rows = await getDb().query<PermissionRow>(
      `SELECT id, permission_code, description, module_id, is_builtin
       FROM core_permissions ORDER BY module_id, permission_code`
    );
    return rows.map(r => ({
      id: r.id,
      permissionCode: r.permission_code,
      description: r.description,
      moduleId: r.module_id,
      isBuiltin: Boolean(r.is_builtin),
    }));
  } catch (err) {
    console.error('[RBAC] Failed to load permissions:', err);
    return [];
  }
}

/**
 * Cache ürítés (role/permission módosítás után hívandó).
 */
export function clearPermissionCache(): void {
  _permCache.clear();
}
