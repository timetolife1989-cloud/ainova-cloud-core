import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface TrendRow {
  month_key: string;
  product_name: string | null;
  total_checked: number;
  total_rejected: number;
  reject_pct: number;
}

// GET /api/modules/quality/reject-trend?months=6&product=optional
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get('months') ?? '6', 10);
  const product = searchParams.get('product');

  try {
    const db = getDb();

    let sql = `SELECT 
      FORMAT(inspection_date, 'yyyy-MM') AS month_key,
      product_name,
      SUM(total_checked) AS total_checked,
      SUM(rejected_count) AS total_rejected,
      CASE WHEN SUM(total_checked) > 0 
        THEN ROUND(CAST(SUM(rejected_count) AS FLOAT) / SUM(total_checked) * 100, 2) 
        ELSE 0 END AS reject_pct
    FROM quality_inspections
    WHERE inspection_date >= DATEADD(MONTH, @p0, GETDATE())`;

    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [
      { name: 'p0', type: 'int', value: -months },
    ];

    if (product) {
      sql += ` AND product_name LIKE @p1`;
      params.push({ name: 'p1', type: 'nvarchar', value: `%${product}%` });
    }

    sql += ` GROUP BY FORMAT(inspection_date, 'yyyy-MM'), product_name
             ORDER BY month_key, product_name`;

    const rows = await db.query<TrendRow>(sql, params);

    // Aggregate by month (total)
    const monthlyTotal: Record<string, { checked: number; rejected: number }> = {};
    for (const r of rows) {
      if (!monthlyTotal[r.month_key]) monthlyTotal[r.month_key] = { checked: 0, rejected: 0 };
      monthlyTotal[r.month_key].checked += Number(r.total_checked);
      monthlyTotal[r.month_key].rejected += Number(r.total_rejected);
    }

    const trend = Object.entries(monthlyTotal).map(([month, data]) => ({
      month,
      totalChecked: data.checked,
      totalRejected: data.rejected,
      rejectPct: data.checked > 0 ? Math.round((data.rejected / data.checked) * 10000) / 100 : 0,
    }));

    // Pareto: top reject codes
    const pareto = await db.query<{ reject_code: string; count: number }>(
      `SELECT ISNULL(reject_code, 'N/A') AS reject_code, COUNT(*) AS count
       FROM quality_inspections
       WHERE inspection_date >= DATEADD(MONTH, @p0, GETDATE()) AND rejected_count > 0
       GROUP BY reject_code
       ORDER BY COUNT(*) DESC`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    return Response.json({
      trend,
      byProduct: rows.map(r => ({
        month: r.month_key,
        productName: r.product_name,
        totalChecked: Number(r.total_checked),
        totalRejected: Number(r.total_rejected),
        rejectPct: Number(r.reject_pct),
      })),
      pareto: pareto.map(p => ({
        rejectCode: p.reject_code,
        count: Number(p.count),
      })),
    });
  } catch (err) {
    console.error('[Quality RejectTrend] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
