import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface TemplateRow {
  id: number;
  template_name: string;
  category: string | null;
  subject: string | null;
  fault_desc: string | null;
  diagnosis: string | null;
  estimated_hours: number | null;
  labor_items: string | null;
  material_items: string | null;
  is_active: boolean;
}

// GET /api/modules/worksheets/templates
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.view');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();
    const rows = await db.query<TemplateRow>(
      `SELECT id, template_name, category, subject, fault_desc, diagnosis,
              estimated_hours, labor_items, material_items, is_active
       FROM worksheets_templates WHERE is_active = 1
       ORDER BY category, template_name`,
      []
    );

    const templates = rows.map(r => ({
      id: r.id,
      templateName: r.template_name,
      category: r.category,
      subject: r.subject,
      faultDesc: r.fault_desc,
      diagnosis: r.diagnosis,
      estimatedHours: r.estimated_hours != null ? Number(r.estimated_hours) : null,
      laborItems: r.labor_items ? JSON.parse(r.labor_items) : [],
      materialItems: r.material_items ? JSON.parse(r.material_items) : [],
    }));

    return Response.json({ templates });
  } catch (err) {
    console.error('[Worksheets Templates] GET error:', err);
    return Response.json({ templates: [] });
  }
}

const CreateSchema = z.object({
  templateName: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  subject: z.string().max(300).optional(),
  faultDesc: z.string().optional(),
  diagnosis: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  laborItems: z.array(z.object({
    description: z.string(),
    hours: z.number(),
    rate: z.number(),
  })).optional(),
  materialItems: z.array(z.object({
    productName: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
  })).optional(),
});

// POST /api/modules/worksheets/templates
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO worksheets_templates (template_name, category, subject, fault_desc, diagnosis, estimated_hours, labor_items, material_items, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
      [
        { name: 'p0', type: 'nvarchar', value: d.templateName },
        { name: 'p1', type: 'nvarchar', value: d.category ?? null },
        { name: 'p2', type: 'nvarchar', value: d.subject ?? null },
        { name: 'p3', type: 'nvarchar', value: d.faultDesc ?? null },
        { name: 'p4', type: 'nvarchar', value: d.diagnosis ?? null },
        { name: 'p5', type: 'nvarchar', value: d.estimatedHours ?? null },
        { name: 'p6', type: 'nvarchar', value: d.laborItems ? JSON.stringify(d.laborItems) : null },
        { name: 'p7', type: 'nvarchar', value: d.materialItems ? JSON.stringify(d.materialItems) : null },
        { name: 'p8', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Worksheets Templates] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

// PUT /api/modules/worksheets/templates — update or deactivate
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as Record<string, unknown>;
  const id = body.id;
  if (!id || typeof id !== 'number') {
    return Response.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const db = getDb();
    const setClauses: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'bit'; value: unknown }> = [];
    let idx = 0;

    if (body.templateName !== undefined) { setClauses.push(`template_name = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: body.templateName }); idx++; }
    if (body.category !== undefined) { setClauses.push(`category = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: body.category }); idx++; }
    if (body.subject !== undefined) { setClauses.push(`subject = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: body.subject }); idx++; }
    if (body.faultDesc !== undefined) { setClauses.push(`fault_desc = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: body.faultDesc }); idx++; }
    if (body.isActive !== undefined) { setClauses.push(`is_active = @p${idx}`); params.push({ name: `p${idx}`, type: 'bit', value: body.isActive }); idx++; }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push({ name: 'pid', type: 'nvarchar', value: id });
    await db.execute(
      `UPDATE worksheets_templates SET ${setClauses.join(', ')} WHERE id = @pid`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Worksheets Templates] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
