import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface TrackingRow {
  id: number;
  reference_code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  quantity: number | null;
  due_date: Date | null;
  completed_at: Date | null;
  created_by: string | null;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'tracking.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assignedTo = searchParams.get('assignedTo');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 50;

  try {
    let sql = `SELECT id, reference_code, title, description, status, priority, assigned_to, quantity, due_date, completed_at, created_by, created_at
               FROM tracking_items WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (status) {
      sql += ` AND status = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: status });
      paramIdx++;
    }
    if (priority) {
      sql += ` AND priority = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: priority });
      paramIdx++;
    }
    if (assignedTo) {
      sql += ` AND assigned_to = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: assignedTo });
      paramIdx++;
    }

    sql += ` ORDER BY CASE WHEN status = 'Nyitott' THEN 0 WHEN status = 'Folyamatban' THEN 1 ELSE 2 END, due_date ASC
             OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

    const rows = await getDb().query<TrackingRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      referenceCode: r.reference_code,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      assignedTo: r.assigned_to,
      quantity: r.quantity,
      dueDate: r.due_date ? String(r.due_date).split('T')[0] : null,
      completedAt: r.completed_at ? String(r.completed_at) : null,
      createdBy: r.created_by,
      createdAt: String(r.created_at),
    }));

    return Response.json({ items, page, pageSize });
  } catch (err) {
    console.error('[Tracking API] GET error:', err);
    return Response.json({ error: 'Hiba az adatok lekérésekor' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  referenceCode: z.string().max(100).optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().max(100).optional(),
  quantity: z.number().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'tracking.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { referenceCode, title, description, status, priority, assignedTo, quantity, dueDate } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO tracking_items (reference_code, title, description, status, priority, assigned_to, quantity, due_date, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
      [
        { name: 'p0', type: 'nvarchar', value: referenceCode ?? null },
        { name: 'p1', type: 'nvarchar', value: title },
        { name: 'p2', type: 'nvarchar', value: description ?? null },
        { name: 'p3', type: 'nvarchar', value: status ?? 'Nyitott' },
        { name: 'p4', type: 'nvarchar', value: priority ?? 'normal' },
        { name: 'p5', type: 'nvarchar', value: assignedTo ?? null },
        { name: 'p6', type: 'nvarchar', value: quantity !== undefined ? String(quantity) : null },
        { name: 'p7', type: 'nvarchar', value: dueDate ?? null },
        { name: 'p8', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Tracking API] POST error:', err);
    return Response.json({ error: 'Hiba a létrehozáskor' }, { status: 500 });
  }
}
