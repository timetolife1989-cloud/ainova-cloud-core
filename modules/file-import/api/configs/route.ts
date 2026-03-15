import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface ConfigRow {
  id: number;
  config_name: string;
  target_table: string;
  file_type: string | null;
  column_mapping: string | null;
  is_active: boolean;
  created_at: string;
}

// GET /api/modules/file-import/configs
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.view');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();
    const rows = await db.query<ConfigRow>(
      `SELECT id, config_name, target_table, file_type, column_mapping, is_active, created_at
       FROM import_configs
       ORDER BY config_name`,
      []
    );

    const configs = rows.map(r => ({
      id: r.id,
      configName: r.config_name,
      targetTable: r.target_table,
      fileType: r.file_type,
      columnMapping: r.column_mapping ? JSON.parse(r.column_mapping) : null,
      isActive: Boolean(r.is_active),
    }));

    return Response.json({ configs });
  } catch (err) {
    console.error('[FileImport Configs] GET error:', err);
    return Response.json({ configs: [] });
  }
}

const CreateConfigSchema = z.object({
  configName: z.string().min(1).max(200),
  targetTable: z.string().min(1).max(100),
  fileType: z.enum(['csv', 'xlsx', 'json']).optional(),
  columnMapping: z.record(z.string(), z.string()).optional(),
});

const UpdateConfigSchema = CreateConfigSchema.partial().extend({
  id: z.number(),
  isActive: z.boolean().optional(),
});

// POST /api/modules/file-import/configs
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { configName, targetTable, fileType, columnMapping } = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO import_configs (config_name, target_table, file_type, column_mapping)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3)`,
      [
        { name: 'p0', type: 'nvarchar', value: configName },
        { name: 'p1', type: 'nvarchar', value: targetTable },
        { name: 'p2', type: 'nvarchar', value: fileType ?? null },
        { name: 'p3', type: 'nvarchar', value: columnMapping ? JSON.stringify(columnMapping) : null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[FileImport Configs] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

// PUT /api/modules/file-import/configs
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, configName, targetTable, fileType, columnMapping, isActive } = parsed.data;

  try {
    const db = getDb();
    const setClauses: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'bit'; value: unknown }> = [];
    let idx = 0;

    if (configName !== undefined) { setClauses.push(`config_name = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: configName }); idx++; }
    if (targetTable !== undefined) { setClauses.push(`target_table = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: targetTable }); idx++; }
    if (fileType !== undefined) { setClauses.push(`file_type = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: fileType }); idx++; }
    if (columnMapping !== undefined) { setClauses.push(`column_mapping = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: JSON.stringify(columnMapping) }); idx++; }
    if (isActive !== undefined) { setClauses.push(`is_active = @p${idx}`); params.push({ name: `p${idx}`, type: 'bit', value: isActive }); idx++; }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push({ name: 'pid', type: 'nvarchar', value: id });
    await db.execute(
      `UPDATE import_configs SET ${setClauses.join(', ')} WHERE id = @pid`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[FileImport Configs] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
