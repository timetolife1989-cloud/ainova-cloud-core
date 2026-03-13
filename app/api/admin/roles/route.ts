import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getAllRoles, getAllPermissions, clearPermissionCache } from '@/lib/rbac';
import { getDb, type QueryParam } from '@/lib/db';
import { z } from 'zod';

// GET /api/admin/roles — all roles + their permissions
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const [roles, allPermissions] = await Promise.all([
    getAllRoles(),
    getAllPermissions(),
  ]);

  return Response.json({ roles, allPermissions });
}

const CreateRoleSchema = z.object({
  roleCode: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/i),
  roleLabel: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  permissions: z.array(z.string()).optional(),
});

// POST /api/admin/roles — create new role
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = CreateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { roleCode, roleLabel, description, color, icon, priority, permissions } = parsed.data;

  try {
    // Insert role
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, 0)`,
      [
        { name: 'p0', type: 'nvarchar', value: roleCode },
        { name: 'p1', type: 'nvarchar', value: roleLabel },
        { name: 'p2', type: 'nvarchar', value: description ?? null },
        { name: 'p3', type: 'nvarchar', value: color ?? 'bg-gray-700 text-gray-300' },
        { name: 'p4', type: 'nvarchar', value: icon ?? 'User' },
        { name: 'p5', type: 'int', value: priority ?? 10 },
      ]
    );

    const roleId = result[0]?.id;
    if (!roleId) throw new Error('Failed to create role');

    // Insert permissions
    if (permissions && permissions.length > 0) {
      for (const permCode of permissions) {
        await getDb().query(
          `INSERT INTO core_role_permissions (role_id, permission_id)
           SELECT @p0, id FROM core_permissions WHERE permission_code = @p1`,
          [
            { name: 'p0', type: 'int', value: roleId },
            { name: 'p1', type: 'nvarchar', value: permCode },
          ]
        );
      }
    }

    clearPermissionCache();
    return Response.json({ ok: true, id: roleId }, { status: 201 });
  } catch (err) {
    console.error('[Roles API] Create error:', err);
    return Response.json({ error: 'api.error.role_create' }, { status: 500 });
  }
}

const UpdateRoleSchema = z.object({
  id: z.number().int().positive(),
  roleLabel: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  permissions: z.array(z.string()).optional(),
});

// PUT /api/admin/roles — update role
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, roleLabel, description, color, icon, priority, permissions } = parsed.data;

  try {
    // Update role fields
    const updates: string[] = [];
    const params: QueryParam[] = [
      { name: 'id', type: 'int', value: id },
    ];
    let paramIdx = 0;

    if (roleLabel !== undefined) {
      updates.push(`role_label = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: roleLabel });
      paramIdx++;
    }
    if (description !== undefined) {
      updates.push(`description = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: description });
      paramIdx++;
    }
    if (color !== undefined) {
      updates.push(`color = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: color });
      paramIdx++;
    }
    if (icon !== undefined) {
      updates.push(`icon = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: icon });
      paramIdx++;
    }
    if (priority !== undefined) {
      updates.push(`priority = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'int', value: priority });
      paramIdx++;
    }

    if (updates.length > 0) {
      await getDb().query(
        `UPDATE core_roles SET ${updates.join(', ')} WHERE id = @id`,
        params
      );
    }

    // Update permissions
    if (permissions !== undefined) {
      // Delete existing
      await getDb().query(
        'DELETE FROM core_role_permissions WHERE role_id = @p0',
        [{ name: 'p0', type: 'int', value: id }]
      );

      // Insert new
      for (const permCode of permissions) {
        await getDb().query(
          `INSERT INTO core_role_permissions (role_id, permission_id)
           SELECT @p0, id FROM core_permissions WHERE permission_code = @p1`,
          [
            { name: 'p0', type: 'int', value: id },
            { name: 'p1', type: 'nvarchar', value: permCode },
          ]
        );
      }
    }

    clearPermissionCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Roles API] Update error:', err);
    return Response.json({ error: 'api.error.role_update' }, { status: 500 });
  }
}

const DeleteRoleSchema = z.object({
  id: z.number().int().positive(),
});

// DELETE /api/admin/roles — delete role
export async function DELETE(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = DeleteRoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'error.validation' }, { status: 400 });
  }

  const { id } = parsed.data;

  try {
    // Check if builtin
    const roles = await getDb().query<{ is_builtin: boolean; role_code: string }>(
      'SELECT is_builtin, role_code FROM core_roles WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );

    if (roles.length === 0) {
      return Response.json({ error: 'api.error.role_not_found' }, { status: 404 });
    }

    if (roles[0].is_builtin) {
      return Response.json({ error: 'api.error.role_builtin' }, { status: 403 });
    }

    // Check if any users have this role
    const users = await getDb().query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM core_users WHERE role = @p0',
      [{ name: 'p0', type: 'nvarchar', value: roles[0].role_code }]
    );

    if ((users[0]?.cnt ?? 0) > 0) {
      return Response.json({ error: 'api.error.role_has_users' }, { status: 409 });
    }

    // Delete (CASCADE will handle role_permissions)
    await getDb().query(
      'DELETE FROM core_roles WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );

    clearPermissionCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Roles API] Delete error:', err);
    return Response.json({ error: 'api.error.role_delete' }, { status: 500 });
  }
}
