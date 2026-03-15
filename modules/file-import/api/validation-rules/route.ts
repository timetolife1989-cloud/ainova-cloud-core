import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RuleRow {
  id: number;
  config_id: number;
  column_name: string;
  column_type: string;
  is_required: boolean;
  regex_pattern: string | null;
  min_value: number | null;
  max_value: number | null;
  allowed_values: string | null;
  error_message: string | null;
  sort_order: number;
}

// GET /api/modules/file-import/validation-rules?configId=1
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const configId = searchParams.get('configId');

  if (!configId) {
    return Response.json({ error: 'configId required' }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db.query<RuleRow>(
      `SELECT id, config_id, column_name, column_type, is_required, regex_pattern,
              min_value, max_value, allowed_values, error_message, sort_order
       FROM mod_file_import_validation_rules
       WHERE config_id = @p0
       ORDER BY sort_order, column_name`,
      [{ name: 'p0', type: 'int', value: parseInt(configId) }]
    );

    const rules = rows.map(r => ({
      id: r.id,
      configId: r.config_id,
      columnName: r.column_name,
      columnType: r.column_type,
      isRequired: Boolean(r.is_required),
      regexPattern: r.regex_pattern,
      minValue: r.min_value != null ? Number(r.min_value) : null,
      maxValue: r.max_value != null ? Number(r.max_value) : null,
      allowedValues: r.allowed_values ? JSON.parse(r.allowed_values) : null,
      errorMessage: r.error_message,
      sortOrder: r.sort_order,
    }));

    return Response.json({ rules });
  } catch (err) {
    console.error('[FileImport ValidationRules] GET error:', err);
    return Response.json({ rules: [] });
  }
}

const CreateRuleSchema = z.object({
  configId: z.number(),
  columnName: z.string().min(1).max(100),
  columnType: z.enum(['string', 'number', 'date', 'boolean']).optional(),
  isRequired: z.boolean().optional(),
  regexPattern: z.string().max(500).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  allowedValues: z.array(z.string()).optional(),
  errorMessage: z.string().max(300).optional(),
  sortOrder: z.number().optional(),
});

// POST /api/modules/file-import/validation-rules
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO mod_file_import_validation_rules
       (config_id, column_name, column_type, is_required, regex_pattern, min_value, max_value, allowed_values, error_message, sort_order)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`,
      [
        { name: 'p0', type: 'int', value: d.configId },
        { name: 'p1', type: 'nvarchar', value: d.columnName },
        { name: 'p2', type: 'nvarchar', value: d.columnType ?? 'string' },
        { name: 'p3', type: 'bit', value: d.isRequired ?? false },
        { name: 'p4', type: 'nvarchar', value: d.regexPattern ?? null },
        { name: 'p5', type: 'nvarchar', value: d.minValue ?? null },
        { name: 'p6', type: 'nvarchar', value: d.maxValue ?? null },
        { name: 'p7', type: 'nvarchar', value: d.allowedValues ? JSON.stringify(d.allowedValues) : null },
        { name: 'p8', type: 'nvarchar', value: d.errorMessage ?? null },
        { name: 'p9', type: 'int', value: d.sortOrder ?? 0 },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[FileImport ValidationRules] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

// DELETE /api/modules/file-import/validation-rules
export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.execute(
      'DELETE FROM mod_file_import_validation_rules WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: parseInt(id) }]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[FileImport ValidationRules] DELETE error:', err);
    return Response.json({ error: 'api.error.data_delete' }, { status: 500 });
  }
}
