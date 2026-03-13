import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface PerformanceRow {
  id: number;
  entry_date: Date;
  worker_name: string;
  team_name: string | null;
  task_code: string | null;
  task_name: string | null;
  quantity: number;
  norm_time: number | null;
  actual_time: number | null;
  efficiency: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'performance.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const workerName = searchParams.get('workerName');
  const teamName = searchParams.get('teamName');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 50;

  try {
    let sql = `SELECT id, entry_date, worker_name, team_name, task_code, task_name, quantity, norm_time, actual_time, efficiency, notes, created_by, created_at
               FROM performance_entries WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (dateFrom) {
      sql += ` AND entry_date >= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateFrom });
      paramIdx++;
    }
    if (dateTo) {
      sql += ` AND entry_date <= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateTo });
      paramIdx++;
    }
    if (workerName) {
      sql += ` AND worker_name = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: workerName });
      paramIdx++;
    }
    if (teamName) {
      sql += ` AND team_name = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: teamName });
      paramIdx++;
    }

    sql += ` ORDER BY entry_date DESC, worker_name OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

    const rows = await getDb().query<PerformanceRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      entryDate: String(r.entry_date).split('T')[0],
      workerName: r.worker_name,
      teamName: r.team_name,
      taskCode: r.task_code,
      taskName: r.task_name,
      quantity: r.quantity,
      normTime: r.norm_time,
      actualTime: r.actual_time,
      efficiency: r.efficiency,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: String(r.created_at),
    }));

    return Response.json({ items, page, pageSize });
  } catch (err) {
    console.error('[Performance API] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workerName: z.string().min(1).max(100),
  teamName: z.string().max(100).optional(),
  taskCode: z.string().max(50).optional(),
  taskName: z.string().max(200).optional(),
  quantity: z.number().min(0),
  normTime: z.number().min(0).optional(),
  actualTime: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'performance.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { entryDate, workerName, teamName, taskCode, taskName, quantity, normTime, actualTime, notes } = parsed.data;
  
  // Calculate efficiency
  let efficiency: number | null = null;
  if (normTime && actualTime && actualTime > 0) {
    efficiency = Math.round((normTime / actualTime) * 100 * 100) / 100;
  }

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO performance_entries (entry_date, worker_name, team_name, task_code, task_name, quantity, norm_time, actual_time, efficiency, notes, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10)`,
      [
        { name: 'p0', type: 'nvarchar', value: entryDate },
        { name: 'p1', type: 'nvarchar', value: workerName },
        { name: 'p2', type: 'nvarchar', value: teamName ?? null },
        { name: 'p3', type: 'nvarchar', value: taskCode ?? null },
        { name: 'p4', type: 'nvarchar', value: taskName ?? null },
        { name: 'p5', type: 'nvarchar', value: String(quantity) },
        { name: 'p6', type: 'nvarchar', value: normTime !== undefined ? String(normTime) : null },
        { name: 'p7', type: 'nvarchar', value: actualTime !== undefined ? String(actualTime) : null },
        { name: 'p8', type: 'nvarchar', value: efficiency !== null ? String(efficiency) : null },
        { name: 'p9', type: 'nvarchar', value: notes ?? null },
        { name: 'p10', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Performance API] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
