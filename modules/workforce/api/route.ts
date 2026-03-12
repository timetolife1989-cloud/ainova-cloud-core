import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface WorkforceRow {
  id: number;
  record_date: Date;
  shift_name: string | null;
  area_name: string | null;
  planned_count: number;
  actual_count: number;
  absent_count: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: Date;
}

// GET /api/modules/workforce/[...path] → route.ts
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'workforce.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const shiftName = searchParams.get('shiftName');
  const areaName = searchParams.get('areaName');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 50;

  try {
    let sql = `SELECT id, record_date, shift_name, area_name, planned_count, actual_count, absent_count, notes, recorded_by, created_at
               FROM workforce_daily WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (dateFrom) {
      sql += ` AND record_date >= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateFrom });
      paramIdx++;
    }
    if (dateTo) {
      sql += ` AND record_date <= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateTo });
      paramIdx++;
    }
    if (shiftName) {
      sql += ` AND shift_name = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: shiftName });
      paramIdx++;
    }
    if (areaName) {
      sql += ` AND area_name = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: areaName });
      paramIdx++;
    }

    sql += ` ORDER BY record_date DESC, shift_name OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

    const rows = await getDb().query<WorkforceRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      recordDate: String(r.record_date).split('T')[0],
      shiftName: r.shift_name,
      areaName: r.area_name,
      plannedCount: Number(r.planned_count) || 0,
      actualCount: Number(r.actual_count) || 0,
      absentCount: Number(r.absent_count) || 0,
      notes: r.notes,
      recordedBy: r.recorded_by,
      createdAt: String(r.created_at),
    }));

    return Response.json({ items, page, pageSize });
  } catch (err) {
    console.error('[Workforce API] GET error:', err);
    return Response.json({ error: 'Hiba az adatok lekérésekor' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftName: z.string().max(50).optional(),
  areaName: z.string().max(100).optional(),
  plannedCount: z.number().min(0),
  actualCount: z.number().min(0),
  absentCount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

// POST /api/modules/workforce/[...path] → route.ts
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'workforce.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { recordDate, shiftName, areaName, plannedCount, actualCount, absentCount, notes } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO workforce_daily (record_date, shift_name, area_name, planned_count, actual_count, absent_count, notes, recorded_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
      [
        { name: 'p0', type: 'nvarchar', value: recordDate },
        { name: 'p1', type: 'nvarchar', value: shiftName ?? null },
        { name: 'p2', type: 'nvarchar', value: areaName ?? null },
        { name: 'p3', type: 'nvarchar', value: plannedCount },
        { name: 'p4', type: 'nvarchar', value: actualCount },
        { name: 'p5', type: 'nvarchar', value: absentCount ?? 0 },
        { name: 'p6', type: 'nvarchar', value: notes ?? null },
        { name: 'p7', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Workforce API] POST error:', err);
    return Response.json({ error: 'Hiba a létrehozáskor' }, { status: 500 });
  }
}
