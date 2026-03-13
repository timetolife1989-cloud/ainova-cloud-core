import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface ImportConfigRow {
  id: number;
  config_name: string;
  module_id: string | null;
  file_type: string;
  target_table: string;
  column_mapping: string | null;
  filters: string | null;
  unit_id: number | null;
  detect_rules: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
}

// GET /api/admin/import-configs
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<ImportConfigRow>(
      `SELECT id, config_name, module_id, file_type, target_table, 
              column_mapping, filters, unit_id, detect_rules, is_active, created_by, created_at
       FROM core_import_configs ORDER BY config_name`
    );

    const configs = rows.map(row => ({
      id: row.id,
      configName: row.config_name,
      moduleId: row.module_id,
      fileType: row.file_type,
      targetTable: row.target_table,
      columnMapping: row.column_mapping ? JSON.parse(row.column_mapping) : [],
      filters: row.filters ? JSON.parse(row.filters) : [],
      unitId: row.unit_id,
      detectRules: row.detect_rules ? JSON.parse(row.detect_rules) : null,
      isActive: Boolean(row.is_active),
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));

    return Response.json({ configs });
  } catch (err) {
    console.error('[ImportConfigs API] GET error:', err);
    return Response.json({ error: 'api.error.config_get' }, { status: 500 });
  }
}

const ColumnMappingSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(['string', 'number', 'date', 'boolean', 'float']),
  required: z.boolean().optional(),
  transform: z.string().optional(),
});

const FilterSchema = z.object({
  column: z.string().min(1),
  operator: z.enum(['=', '!=', 'contains', 'starts_with', 'in']),
  value: z.string(),
});

const CreateConfigSchema = z.object({
  configName: z.string().min(1).max(100),
  moduleId: z.string().max(50).optional().nullable(),
  fileType: z.enum(['excel', 'csv', 'json']),
  targetTable: z.string().min(1).max(100),
  columnMapping: z.array(ColumnMappingSchema),
  filters: z.array(FilterSchema).optional(),
  unitId: z.number().int().optional().nullable(),
  detectRules: z.record(z.string(), z.unknown()).optional().nullable(),
});

// POST /api/admin/import-configs
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { configName, moduleId, fileType, targetTable, columnMapping, filters, unitId, detectRules } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO core_import_configs 
       (config_name, module_id, file_type, target_table, column_mapping, filters, unit_id, detect_rules, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
      [
        { name: 'p0', type: 'nvarchar', value: configName },
        { name: 'p1', type: 'nvarchar', value: moduleId ?? null },
        { name: 'p2', type: 'nvarchar', value: fileType },
        { name: 'p3', type: 'nvarchar', value: targetTable },
        { name: 'p4', type: 'nvarchar', value: JSON.stringify(columnMapping) },
        { name: 'p5', type: 'nvarchar', value: JSON.stringify(filters ?? []) },
        { name: 'p6', type: 'int', value: unitId ?? null },
        { name: 'p7', type: 'nvarchar', value: detectRules ? JSON.stringify(detectRules) : null },
        { name: 'p8', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[ImportConfigs API] POST error:', err);
    return Response.json({ error: 'api.error.config_create' }, { status: 500 });
  }
}

const UpdateConfigSchema = z.object({
  id: z.number().int().positive(),
  configName: z.string().min(1).max(100).optional(),
  moduleId: z.string().max(50).optional().nullable(),
  fileType: z.enum(['excel', 'csv', 'json']).optional(),
  targetTable: z.string().min(1).max(100).optional(),
  columnMapping: z.array(ColumnMappingSchema).optional(),
  filters: z.array(FilterSchema).optional(),
  unitId: z.number().int().optional().nullable(),
  detectRules: z.record(z.string(), z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/import-configs
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, configName, moduleId, fileType, targetTable, columnMapping, filters, unitId, detectRules, isActive } = parsed.data;

  try {
    const updates: string[] = ['updated_at = SYSDATETIME()'];
    const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'bit'; value: unknown }> = [
      { name: 'id', type: 'int', value: id },
    ];
    let paramIdx = 0;

    if (configName !== undefined) {
      updates.push(`config_name = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: configName });
      paramIdx++;
    }
    if (moduleId !== undefined) {
      updates.push(`module_id = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: moduleId });
      paramIdx++;
    }
    if (fileType !== undefined) {
      updates.push(`file_type = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: fileType });
      paramIdx++;
    }
    if (targetTable !== undefined) {
      updates.push(`target_table = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: targetTable });
      paramIdx++;
    }
    if (columnMapping !== undefined) {
      updates.push(`column_mapping = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: JSON.stringify(columnMapping) });
      paramIdx++;
    }
    if (filters !== undefined) {
      updates.push(`filters = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: JSON.stringify(filters) });
      paramIdx++;
    }
    if (unitId !== undefined) {
      updates.push(`unit_id = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'int', value: unitId });
      paramIdx++;
    }
    if (detectRules !== undefined) {
      updates.push(`detect_rules = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: detectRules ? JSON.stringify(detectRules) : null });
      paramIdx++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'bit', value: isActive ? 1 : 0 });
      paramIdx++;
    }

    await getDb().query(
      `UPDATE core_import_configs SET ${updates.join(', ')} WHERE id = @id`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ImportConfigs API] PUT error:', err);
    return Response.json({ error: 'api.error.config_update' }, { status: 500 });
  }
}

const DeleteConfigSchema = z.object({
  id: z.number().int().positive(),
});

// DELETE /api/admin/import-configs
export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = DeleteConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'error.validation' }, { status: 400 });
  }

  const { id } = parsed.data;

  try {
    await getDb().query(
      'DELETE FROM core_import_configs WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ImportConfigs API] DELETE error:', err);
    return Response.json({ error: 'api.error.config_delete' }, { status: 500 });
  }
}
