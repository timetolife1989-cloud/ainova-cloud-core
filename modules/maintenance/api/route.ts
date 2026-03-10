import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'maintenance.view');
  if (!auth.valid) return auth.response;

  try {
    // Assets
    const assets = await getDb().query<{ id: number; asset_code: string; asset_name: string; asset_type: string | null; location: string | null; is_active: boolean }>(
      'SELECT id, asset_code, asset_name, asset_type, location, is_active FROM maintenance_assets WHERE is_active = 1 ORDER BY asset_name'
    );

    // Schedules with due info
    const schedules = await getDb().query<{
      id: number; asset_id: number; asset_name: string; task_name: string; interval_days: number;
      last_done_date: Date | null; next_due_date: Date | null; priority: string; assigned_to: string | null;
    }>(
      `SELECT s.id, s.asset_id, a.asset_name, s.task_name, s.interval_days,
              s.last_done_date, s.next_due_date, s.priority, s.assigned_to
       FROM maintenance_schedules s JOIN maintenance_assets a ON s.asset_id = a.id
       ORDER BY s.next_due_date`
    );

    // Overdue count
    const overdue = schedules.filter(s => s.next_due_date && new Date(s.next_due_date) < new Date());

    return Response.json({
      assets: assets.map(a => ({ id: a.id, code: a.asset_code, name: a.asset_name, type: a.asset_type, location: a.location })),
      schedules: schedules.map(s => ({
        id: s.id, assetId: s.asset_id, assetName: s.asset_name, taskName: s.task_name,
        intervalDays: s.interval_days, lastDoneDate: s.last_done_date ? String(s.last_done_date).split('T')[0] : null,
        nextDueDate: s.next_due_date ? String(s.next_due_date).split('T')[0] : null,
        priority: s.priority, assignedTo: s.assigned_to,
        isOverdue: s.next_due_date ? new Date(s.next_due_date) < new Date() : false,
      })),
      overdueCount: overdue.length,
    });
  } catch (err) {
    console.error('[Maintenance API] GET error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}

const CreateScheduleSchema = z.object({
  assetId: z.number(),
  taskName: z.string().min(1).max(200),
  intervalDays: z.number().min(1),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  assignedTo: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'maintenance.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateScheduleSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { assetId, taskName, intervalDays, priority, assignedTo } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO maintenance_schedules (asset_id, task_name, interval_days, next_due_date, priority, assigned_to)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, DATEADD(day, @p2, CAST(SYSDATETIME() AS DATE)), @p3, @p4)`,
      [
        { name: 'p0', type: 'int', value: assetId },
        { name: 'p1', type: 'nvarchar', value: taskName },
        { name: 'p2', type: 'int', value: intervalDays },
        { name: 'p3', type: 'nvarchar', value: priority ?? 'normal' },
        { name: 'p4', type: 'nvarchar', value: assignedTo ?? null },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Maintenance API] POST error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}
