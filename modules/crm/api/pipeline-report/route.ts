import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface StageRow {
  stage: string;
  opp_count: number;
  total_value: number;
  avg_value: number;
  won_count: number;
  lost_count: number;
}

interface ConversionRow {
  month_key: string;
  total_opps: number;
  won_opps: number;
  lost_opps: number;
  conversion_pct: number;
  avg_deal_size: number;
}

// GET /api/modules/crm/pipeline-report?months=6
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get('months') ?? '6', 10);

  try {
    const db = getDb();

    // Stage breakdown
    const stages = await db.query<StageRow>(
      `SELECT 
        stage,
        COUNT(*) AS opp_count,
        SUM(ISNULL(value, 0)) AS total_value,
        AVG(ISNULL(value, 0)) AS avg_value,
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) AS won_count,
        SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) AS lost_count
      FROM crm_opportunities
      WHERE created_at >= DATEADD(MONTH, @p0, GETDATE())
      GROUP BY stage
      ORDER BY opp_count DESC`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    // Monthly conversion trend
    const trend = await db.query<ConversionRow>(
      `SELECT 
        FORMAT(created_at, 'yyyy-MM') AS month_key,
        COUNT(*) AS total_opps,
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) AS won_opps,
        SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) AS lost_opps,
        CASE WHEN COUNT(*) > 0 
          THEN ROUND(CAST(SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1)
          ELSE 0 END AS conversion_pct,
        AVG(CASE WHEN stage = 'won' THEN ISNULL(value, 0) END) AS avg_deal_size
      FROM crm_opportunities
      WHERE created_at >= DATEADD(MONTH, @p0, GETDATE())
      GROUP BY FORMAT(created_at, 'yyyy-MM')
      ORDER BY month_key`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    // Overall summary
    const totalOpps = stages.reduce((s, r) => s + Number(r.opp_count), 0);
    const totalValue = stages.reduce((s, r) => s + Number(r.total_value), 0);
    const wonCount = stages.reduce((s, r) => s + Number(r.won_count), 0);
    const lostCount = stages.reduce((s, r) => s + Number(r.lost_count), 0);

    return Response.json({
      summary: {
        totalOpportunities: totalOpps,
        totalValue,
        wonCount,
        lostCount,
        conversionRate: totalOpps > 0 ? Math.round((wonCount / totalOpps) * 1000) / 10 : 0,
        avgDealSize: wonCount > 0 ? Math.round(totalValue / wonCount) : 0,
      },
      stages: stages.map(s => ({
        stage: s.stage,
        count: Number(s.opp_count),
        totalValue: Number(s.total_value),
        avgValue: Math.round(Number(s.avg_value)),
      })),
      trend: trend.map(t => ({
        month: t.month_key,
        totalOpps: Number(t.total_opps),
        wonOpps: Number(t.won_opps),
        lostOpps: Number(t.lost_opps),
        conversionPct: Number(t.conversion_pct),
        avgDealSize: Math.round(Number(t.avg_deal_size) || 0),
      })),
    });
  } catch (err) {
    console.error('[CRM PipelineReport] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
