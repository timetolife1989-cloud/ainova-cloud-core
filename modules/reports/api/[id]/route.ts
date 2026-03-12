import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface ReportRow {
  id: number;
  report_name: string;
  description: string | null;
  source_module: string | null;
  source_table: string | null;
  chart_type: string | null;
  config: string | null;
  created_by: string | null;
  is_public: boolean;
  created_at: Date;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'reports.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  const rows = await getDb().query<ReportRow>(
    `SELECT id, report_name, description, source_module, source_table, chart_type, config, created_by, is_public, created_at
     FROM reports_saved WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: parseInt(id) }]
  );

  if (!rows[0]) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  const r = rows[0];
  return Response.json({
    report: {
      id: r.id,
      reportName: r.report_name,
      description: r.description,
      sourceModule: r.source_module,
      sourceTable: r.source_table,
      chartType: r.chart_type,
      config: r.config ? JSON.parse(r.config) : null,
      createdBy: r.created_by,
      isPublic: Boolean(r.is_public),
      createdAt: String(r.created_at),
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'reports.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Only allow deletion of own reports (unless admin)
  const rows = await getDb().query<{ created_by: string | null }>(
    `SELECT created_by FROM reports_saved WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: parseInt(id) }]
  );

  if (!rows[0]) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  if (rows[0].created_by !== auth.username && auth.role !== 'admin') {
    return Response.json({ error: 'Not authorized to delete this report' }, { status: 403 });
  }

  await getDb().execute(
    `DELETE FROM reports_saved WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: parseInt(id) }]
  );

  return Response.json({ ok: true });
}
