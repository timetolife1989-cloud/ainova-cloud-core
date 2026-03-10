import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { createExcelResponse } from '@/lib/export/excel';
import { createPdfResponse } from '@/lib/export/pdf';

/**
 * Generic module data export endpoint.
 * GET /api/modules/[moduleId]/export?format=xlsx|pdf
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params;
  const auth = await checkAuth(request, `${moduleId}.view`);
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'xlsx';
  const table = searchParams.get('table') ?? `mod_${moduleId.replace(/-/g, '_')}`;

  try {
    const rows = await getDb().query<Record<string, unknown>>(
      `SELECT TOP 5000 * FROM ${table} ORDER BY 1 DESC`,
      []
    );

    if (rows.length === 0) {
      return Response.json({ error: 'No data to export' }, { status: 404 });
    }

    const columns = Object.keys(rows[0]).map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      width: 20,
    }));

    const title = `${moduleId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Export`;

    if (format === 'pdf') {
      return createPdfResponse({ title, columns, rows, generatedBy: auth.username });
    }

    return await createExcelResponse({ title, columns, rows });
  } catch (err) {
    console.error(`[Export] Error exporting ${moduleId}:`, err);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
