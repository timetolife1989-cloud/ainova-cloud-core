import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface DefectCodeRow {
  id: number;
  code: string;
  name_hu: string;
  name_en: string | null;
  name_de: string | null;
  category: string | null;
  severity: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CreateSchema = z.object({
  code: z.string().min(1).max(50),
  nameHu: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  nameDe: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.number(),
  isActive: z.boolean().optional(),
});

// GET /api/modules/quality/defect-codes
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.view');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();
    const rows = await db.query<DefectCodeRow>(
      `SELECT id, code, name_hu, name_en, name_de, category, severity, is_active, created_at, updated_at
       FROM quality_defect_codes
       ORDER BY category, code`
    );

    const items = rows.map(r => ({
      id: r.id,
      code: r.code,
      nameHu: r.name_hu,
      nameEn: r.name_en,
      nameDe: r.name_de,
      category: r.category,
      severity: r.severity,
      isActive: r.is_active,
    }));

    return Response.json({ items });
  } catch (err) {
    console.error('[Quality DefectCodes] GET error:', err);
    return Response.json({ items: [] });
  }
}

// POST /api/modules/quality/defect-codes — create new defect code
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { code, nameHu, nameEn, nameDe, category, severity } = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO quality_defect_codes (code, name_hu, name_en, name_de, category, severity)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
      [
        { name: 'p0', type: 'nvarchar', value: code },
        { name: 'p1', type: 'nvarchar', value: nameHu },
        { name: 'p2', type: 'nvarchar', value: nameEn ?? null },
        { name: 'p3', type: 'nvarchar', value: nameDe ?? null },
        { name: 'p4', type: 'nvarchar', value: category ?? null },
        { name: 'p5', type: 'nvarchar', value: severity ?? 'minor' },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Quality DefectCodes] POST error:', err);
    const msg = String(err);
    if (msg.includes('UNIQUE') || msg.includes('duplicate')) {
      return Response.json({ error: 'quality.code_duplicate' }, { status: 409 });
    }
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

// PUT /api/modules/quality/defect-codes — update existing defect code
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, code, nameHu, nameEn, nameDe, category, severity, isActive } = parsed.data;

  try {
    const db = getDb();
    const setClauses: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'bit'; value: unknown }> = [];
    let idx = 0;

    if (code !== undefined) { setClauses.push(`code = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: code }); idx++; }
    if (nameHu !== undefined) { setClauses.push(`name_hu = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: nameHu }); idx++; }
    if (nameEn !== undefined) { setClauses.push(`name_en = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: nameEn }); idx++; }
    if (nameDe !== undefined) { setClauses.push(`name_de = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: nameDe }); idx++; }
    if (category !== undefined) { setClauses.push(`category = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: category }); idx++; }
    if (severity !== undefined) { setClauses.push(`severity = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: severity }); idx++; }
    if (isActive !== undefined) { setClauses.push(`is_active = @p${idx}`); params.push({ name: `p${idx}`, type: 'bit', value: isActive }); idx++; }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    setClauses.push('updated_at = SYSDATETIME()');
    params.push({ name: `pid`, type: 'nvarchar', value: id });

    await db.execute(
      `UPDATE quality_defect_codes SET ${setClauses.join(', ')} WHERE id = @pid`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Quality DefectCodes] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
