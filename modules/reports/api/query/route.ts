import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

/**
 * Allowed source tables with their date and numeric columns.
 * This acts as a whitelist to prevent SQL injection via table names.
 */
const ALLOWED_TABLES: Record<string, { dateCol: string; numericCols: string[]; groupCols: string[] }> = {
  oee_records:          { dateCol: 'record_date',     numericCols: ['availability_pct', 'performance_pct', 'quality_pct', 'oee_pct', 'total_count', 'good_count', 'reject_count'], groupCols: ['shift'] },
  workforce_daily:      { dateCol: 'record_date',     numericCols: ['planned_count', 'actual_count', 'absent_count'], groupCols: ['shift_name', 'area_name'] },
  maintenance_log:      { dateCol: 'done_date',        numericCols: ['duration_min', 'cost'], groupCols: ['performed_by'] },
  quality_inspections:  { dateCol: 'inspection_date',  numericCols: ['total_checked', 'passed_count', 'rejected_count'], groupCols: ['product_name', 'inspector', 'status'] },
  delivery_shipments:   { dateCol: 'shipment_date',    numericCols: ['quantity', 'weight', 'value'], groupCols: ['customer_name', 'status'] },
  inventory_movements:  { dateCol: 'created_at',       numericCols: ['quantity'], groupCols: ['movement_type'] },
  fleet_trips:          { dateCol: 'trip_date',         numericCols: ['distance'], groupCols: ['driver_name'] },
  performance_entries:  { dateCol: 'entry_date',        numericCols: ['quantity', 'norm_time', 'actual_time', 'efficiency'], groupCols: ['worker_name', 'team_name', 'task_name'] },
};

interface ReportRow {
  id: number;
  source_table: string | null;
  chart_type: string | null;
  config: string | null;
}

/**
 * GET /api/modules/reports/query?id=N&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Fetches actual data from the source table of a saved report.
 * Returns rows + column metadata for client-side chart rendering.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'reports.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('id');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  if (!reportId || !/^\d+$/.test(reportId)) {
    return Response.json({ error: 'Missing or invalid report id' }, { status: 400 });
  }

  // Fetch report definition
  const reports = await getDb().query<ReportRow>(
    `SELECT id, source_table, chart_type, config FROM reports_saved WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: parseInt(reportId) }]
  );

  if (!reports[0]) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  const report = reports[0];
  const sourceTable = report.source_table;

  if (!sourceTable || !ALLOWED_TABLES[sourceTable]) {
    return Response.json({ error: 'Invalid or unsupported source table' }, { status: 400 });
  }

  const tableMeta = ALLOWED_TABLES[sourceTable];
  const config = report.config ? JSON.parse(report.config) as Record<string, unknown> : {};

  // Determine date range
  let dateFrom = fromDate;
  let dateTo = toDate;

  if (!dateFrom) {
    const rangeMap: Record<string, number> = {
      last_7_days: 7,
      last_30_days: 30,
      last_90_days: 90,
      last_365_days: 365,
    };
    const days = rangeMap[String(config.dateRange)] ?? 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    dateFrom = d.toISOString().split('T')[0];
  }

  if (!dateTo) {
    dateTo = new Date().toISOString().split('T')[0];
  }

  try {
    // Query source table with date filtering — table name is whitelist-validated above
    const rows = await getDb().query<Record<string, unknown>>(
      `SELECT * FROM ${sourceTable} WHERE ${tableMeta.dateCol} >= @p0 AND ${tableMeta.dateCol} <= @p1 ORDER BY ${tableMeta.dateCol} DESC LIMIT 2000`,
      [
        { name: 'p0', type: 'nvarchar', value: dateFrom },
        { name: 'p1', type: 'nvarchar', value: dateTo },
      ]
    );

    return Response.json({
      rows,
      meta: {
        total: rows.length,
        table: sourceTable,
        dateColumn: tableMeta.dateCol,
        numericColumns: tableMeta.numericCols,
        groupColumns: tableMeta.groupCols,
        chartType: report.chart_type,
        dateRange: { from: dateFrom, to: dateTo },
      },
    });
  } catch (err) {
    console.error('[Reports Query] Error:', err);
    return Response.json({ error: 'Failed to query report data' }, { status: 500 });
  }
}

/**
 * Returns available table metadata for the report editor.
 * GET /api/modules/reports/query?meta=1
 */
export { ALLOWED_TABLES };
