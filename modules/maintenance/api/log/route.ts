import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface LogRow {
  id: number;
  schedule_id: number | null;
  task_name: string | null;
  asset_name: string;
  done_date: Date;
  duration_min: number | null;
  cost: number | null;
  notes: string | null;
  performed_by: string | null;
}

/**
 * GET /api/modules/maintenance/log
 * Returns maintenance log entries with schedule/asset info.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'maintenance.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<LogRow>(
      `SELECT l.id, l.schedule_id, s.task_name, a.asset_name,
              l.done_date, l.duration_min, l.cost, l.notes, l.performed_by
       FROM maintenance_log l
       JOIN maintenance_assets a ON l.asset_id = a.id
       LEFT JOIN maintenance_schedules s ON l.schedule_id = s.id
       ORDER BY l.done_date DESC, l.id DESC
       LIMIT 200`
    );

    return Response.json({
      logs: rows.map(r => ({
        id: r.id,
        scheduleId: r.schedule_id,
        taskName: r.task_name,
        assetName: r.asset_name,
        doneDate: String(r.done_date).split('T')[0],
        durationMin: r.duration_min,
        cost: r.cost,
        notes: r.notes,
        performedBy: r.performed_by,
      })),
    });
  } catch (err) {
    console.error('[Maintenance] Log GET error:', err);
    return Response.json({ error: 'Failed to load logs' }, { status: 500 });
  }
}
