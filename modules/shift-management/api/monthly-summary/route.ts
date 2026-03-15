import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface MonthlySummaryRow {
  worker_name: string;
  shift_name: string;
  shift_count: number;
}

// GET /api/modules/shift-management/monthly-summary?month=2026-03
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'shift-management.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // yyyy-MM format

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: 'month param required (yyyy-MM)' }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db.query<MonthlySummaryRow>(
      `SELECT a.worker_name, s.shift_name, COUNT(*) AS shift_count
       FROM shift_assignments a
       JOIN shift_definitions s ON a.shift_id = s.id
       WHERE FORMAT(a.assignment_date, 'yyyy-MM') = @p0
       GROUP BY a.worker_name, s.shift_name
       ORDER BY a.worker_name, s.shift_name`,
      [{ name: 'p0', type: 'nvarchar', value: month }]
    );

    // Pivot: group by worker, each shift as key
    const workers: Record<string, Record<string, number>> = {};
    const shiftNames = new Set<string>();
    for (const r of rows) {
      if (!workers[r.worker_name]) workers[r.worker_name] = {};
      workers[r.worker_name][r.shift_name] = Number(r.shift_count);
      shiftNames.add(r.shift_name);
    }

    const summary = Object.entries(workers).map(([name, shifts]) => ({
      workerName: name,
      shifts,
      total: Object.values(shifts).reduce((s, v) => s + v, 0),
    }));

    return Response.json({
      month,
      shiftNames: Array.from(shiftNames).sort(),
      summary,
    });
  } catch (err) {
    console.error('[ShiftMgmt MonthlySummary] error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
