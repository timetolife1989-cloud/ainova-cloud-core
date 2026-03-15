import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface CapacityRow {
  id: number;
  week_start: Date;
  resource_type: string;
  resource_name: string;
  planned_hours: number;
  allocated_hours: number;
  actual_hours: number;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'scheduling.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  const resourceType = searchParams.get('resourceType');

  try {
    let sql = `SELECT id, week_start, resource_type, resource_name, planned_hours, allocated_hours, actual_hours, notes, created_by, created_at
               FROM scheduling_capacity WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (weekStart) {
      sql += ` AND week_start = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: weekStart });
      paramIdx++;
    }
    if (resourceType) {
      sql += ` AND resource_type = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: resourceType });
      paramIdx++;
    }

    sql += ' ORDER BY resource_type, resource_name';

    const rows = await getDb().query<CapacityRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      weekStart: String(r.week_start).split('T')[0],
      resourceType: r.resource_type,
      resourceName: r.resource_name,
      plannedHours: Number(r.planned_hours) || 0,
      allocatedHours: Number(r.allocated_hours) || 0,
      actualHours: Number(r.actual_hours) || 0,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: String(r.created_at),
    }));

    return Response.json({ items });
  } catch (err) {
    console.error('[Scheduling API] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resourceType: z.enum(['worker', 'machine', 'area']),
  resourceName: z.string().min(1).max(100),
  plannedHours: z.number().min(0),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'scheduling.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { weekStart, resourceType, resourceName, plannedHours, notes } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO scheduling_capacity (week_start, resource_type, resource_name, planned_hours, notes, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
      [
        { name: 'p0', type: 'nvarchar', value: weekStart },
        { name: 'p1', type: 'nvarchar', value: resourceType },
        { name: 'p2', type: 'nvarchar', value: resourceName },
        { name: 'p3', type: 'nvarchar', value: String(plannedHours) },
        { name: 'p4', type: 'nvarchar', value: notes ?? null },
        { name: 'p5', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Scheduling API] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
