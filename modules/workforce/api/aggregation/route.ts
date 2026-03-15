import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_planned: number;
  total_actual: number;
  total_absent: number;
  total_overtime_hours: number;
  attendance_pct: number;
  record_count: number;
}

interface MonthlySummary {
  month_key: string;
  total_planned: number;
  total_actual: number;
  total_absent: number;
  total_overtime_hours: number;
  attendance_pct: number;
  record_count: number;
}

// GET /api/modules/workforce/aggregation?period=weekly|monthly&months=3
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'workforce.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'weekly';
  const months = parseInt(searchParams.get('months') ?? '3', 10);

  const db = getDb();

  try {
    if (period === 'monthly') {
      const rows = await db.query<MonthlySummary>(
        `SELECT 
          FORMAT(record_date, 'yyyy-MM') AS month_key,
          SUM(planned_count) AS total_planned,
          SUM(actual_count) AS total_actual,
          SUM(absent_count) AS total_absent,
          SUM(overtime_hours) AS total_overtime_hours,
          CASE WHEN SUM(planned_count) > 0 
            THEN ROUND(CAST(SUM(actual_count) AS FLOAT) / SUM(planned_count) * 100, 1) 
            ELSE 0 END AS attendance_pct,
          COUNT(*) AS record_count
        FROM workforce_daily
        WHERE record_date >= DATEADD(MONTH, @p0, GETDATE())
        GROUP BY FORMAT(record_date, 'yyyy-MM')
        ORDER BY month_key DESC`,
        [{ name: 'p0', type: 'int', value: -months }]
      );

      return Response.json({ period: 'monthly', data: rows });
    }

    // Default: weekly
    const rows = await db.query<WeeklySummary>(
      `SELECT 
        MIN(record_date) AS week_start,
        MAX(record_date) AS week_end,
        SUM(planned_count) AS total_planned,
        SUM(actual_count) AS total_actual,
        SUM(absent_count) AS total_absent,
        SUM(overtime_hours) AS total_overtime_hours,
        CASE WHEN SUM(planned_count) > 0 
          THEN ROUND(CAST(SUM(actual_count) AS FLOAT) / SUM(planned_count) * 100, 1) 
          ELSE 0 END AS attendance_pct,
        COUNT(*) AS record_count
      FROM workforce_daily
      WHERE record_date >= DATEADD(MONTH, @p0, GETDATE())
      GROUP BY DATEPART(YEAR, record_date), DATEPART(ISO_WEEK, record_date)
      ORDER BY MIN(record_date) DESC`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    const formatted = rows.map(r => ({
      ...r,
      week_start: String(r.week_start).split('T')[0],
      week_end: String(r.week_end).split('T')[0],
    }));

    return Response.json({ period: 'weekly', data: formatted });
  } catch (err) {
    console.error('[Workforce Aggregation] Error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
