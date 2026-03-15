import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface MaintenanceRow {
  machine_id: number;
  machine_name: string;
  task_id: number;
  task_title: string;
  due_date: string;
  status: string;
  priority: string | null;
  is_overdue: boolean;
}

// GET /api/modules/digital-twin/maintenance?layoutId=1
// Returns upcoming/overdue maintenance tasks linked to digital twin machines
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'digital-twin.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const layoutId = searchParams.get('layoutId');

  try {
    const db = getDb();

    // Check if maintenance module tables exist
    const tableCheck = await db.query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'maintenance_tasks'`,
      []
    );

    if (Number(tableCheck[0]?.cnt) === 0) {
      return Response.json({ tasks: [], source: 'unavailable' });
    }

    let sql = `SELECT 
        m.id AS machine_id, m.name AS machine_name,
        mt.id AS task_id, mt.title AS task_title,
        CONVERT(VARCHAR(10), mt.due_date, 120) AS due_date,
        mt.status, mt.priority,
        CASE WHEN mt.due_date < CAST(GETDATE() AS DATE) AND mt.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END AS is_overdue
      FROM mod_dt_machines m
      INNER JOIN maintenance_tasks mt ON mt.machine_id = m.id
      WHERE mt.status NOT IN ('completed', 'cancelled')`;

    const params: Array<{ name: string; type: 'int'; value: unknown }> = [];

    if (layoutId) {
      sql += ' AND m.layout_id = @p0';
      params.push({ name: 'p0', type: 'int', value: parseInt(layoutId) });
    }

    sql += ' ORDER BY mt.due_date ASC';
    const rows = await db.query<MaintenanceRow>(sql, params);

    return Response.json({
      tasks: rows.map(r => ({
        machineId: r.machine_id,
        machineName: r.machine_name,
        taskId: r.task_id,
        taskTitle: r.task_title,
        dueDate: r.due_date,
        status: r.status,
        priority: r.priority,
        isOverdue: Boolean(r.is_overdue),
      })),
      source: 'maintenance_tasks',
    });
  } catch (err) {
    console.error('[DigitalTwin Maintenance] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
