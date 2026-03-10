import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

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

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'reports.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<ReportRow>(
      `SELECT id, report_name, description, source_module, source_table, chart_type, config, created_by, is_public, created_at
       FROM reports_saved
       WHERE is_public = 1 OR created_by = @p0
       ORDER BY created_at DESC`,
      [{ name: 'p0', type: 'nvarchar', value: auth.username }]
    );

    const reports = rows.map(r => ({
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
    }));

    return Response.json({ reports });
  } catch (err) {
    console.error('[Reports API] GET error:', err);
    return Response.json({ error: 'Hiba az adatok lekérésekor' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  reportName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  sourceModule: z.string().max(50).optional(),
  sourceTable: z.string().max(100).optional(),
  chartType: z.enum(['bar', 'line', 'pie', 'table']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'reports.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });

  const { reportName, description, sourceModule, sourceTable, chartType, config, isPublic } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO reports_saved (report_name, description, source_module, source_table, chart_type, config, created_by, is_public)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
      [
        { name: 'p0', type: 'nvarchar', value: reportName },
        { name: 'p1', type: 'nvarchar', value: description ?? null },
        { name: 'p2', type: 'nvarchar', value: sourceModule ?? null },
        { name: 'p3', type: 'nvarchar', value: sourceTable ?? null },
        { name: 'p4', type: 'nvarchar', value: chartType ?? null },
        { name: 'p5', type: 'nvarchar', value: config ? JSON.stringify(config) : null },
        { name: 'p6', type: 'nvarchar', value: auth.username },
        { name: 'p7', type: 'nvarchar', value: isPublic !== false ? '1' : '0' },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Reports API] POST error:', err);
    return Response.json({ error: 'Hiba a létrehozáskor' }, { status: 500 });
  }
}
