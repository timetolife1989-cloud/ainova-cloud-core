import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');

  try {
    let sql = `SELECT id, inspection_date, product_code, product_name, batch_number, inspector,
               total_checked, passed_count, rejected_count, reject_code, reject_reason, status, created_by, created_at
               FROM quality_inspections WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (dateFrom) { sql += ` AND inspection_date >= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateFrom }); idx++; }
    if (dateTo) { sql += ` AND inspection_date <= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateTo }); idx++; }
    if (status) { sql += ` AND status = @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: status }); idx++; }

    sql += ' ORDER BY inspection_date DESC';

    const rows = await getDb().query<{
      id: number; inspection_date: Date; product_code: string | null; product_name: string | null;
      batch_number: string | null; inspector: string | null; total_checked: number; passed_count: number;
      rejected_count: number; reject_code: string | null; reject_reason: string | null; status: string;
      created_by: string | null; created_at: Date;
    }>(sql, params);

    return Response.json({
      inspections: rows.map(r => ({
        id: r.id, inspectionDate: String(r.inspection_date).split('T')[0],
        productCode: r.product_code, productName: r.product_name, batchNumber: r.batch_number,
        inspector: r.inspector, totalChecked: r.total_checked, passedCount: r.passed_count,
        rejectedCount: r.rejected_count, rejectCode: r.reject_code, rejectReason: r.reject_reason,
        status: r.status, createdBy: r.created_by, createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[Quality API] GET error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  inspectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productCode: z.string().max(100).optional(),
  productName: z.string().max(200).optional(),
  batchNumber: z.string().max(100).optional(),
  inspector: z.string().max(100).optional(),
  totalChecked: z.number().min(0),
  passedCount: z.number().min(0),
  rejectedCount: z.number().min(0).optional(),
  rejectCode: z.string().max(50).optional(),
  rejectReason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const d = parsed.data;
  const rejectedCount = d.rejectedCount ?? (d.totalChecked - d.passedCount);

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO quality_inspections (inspection_date, product_code, product_name, batch_number, inspector, total_checked, passed_count, rejected_count, reject_code, reject_reason, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10)`,
      [
        { name: 'p0', type: 'nvarchar', value: d.inspectionDate },
        { name: 'p1', type: 'nvarchar', value: d.productCode ?? null },
        { name: 'p2', type: 'nvarchar', value: d.productName ?? null },
        { name: 'p3', type: 'nvarchar', value: d.batchNumber ?? null },
        { name: 'p4', type: 'nvarchar', value: d.inspector ?? null },
        { name: 'p5', type: 'int', value: d.totalChecked },
        { name: 'p6', type: 'int', value: d.passedCount },
        { name: 'p7', type: 'int', value: rejectedCount },
        { name: 'p8', type: 'nvarchar', value: d.rejectCode ?? null },
        { name: 'p9', type: 'nvarchar', value: d.rejectReason ?? null },
        { name: 'p10', type: 'nvarchar', value: auth.username },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Quality API] POST error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
