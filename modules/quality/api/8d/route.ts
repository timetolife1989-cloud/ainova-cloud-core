import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let sql = `SELECT id, inspection_id, report_number, d1_team, d2_problem, d3_containment,
               d4_root_cause, d5_corrective, d6_implemented, d7_preventive, d8_recognition,
               status, created_by, created_at
               FROM quality_8d_reports WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (status) {
      sql += ` AND status = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: status });
      idx++;
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await getDb().query<{
      id: number; inspection_id: number | null; report_number: string;
      d1_team: string | null; d2_problem: string | null; d3_containment: string | null;
      d4_root_cause: string | null; d5_corrective: string | null; d6_implemented: string | null;
      d7_preventive: string | null; d8_recognition: string | null;
      status: string; created_by: string | null; created_at: Date;
    }>(sql, params);

    return Response.json({
      reports: rows.map(r => ({
        id: r.id,
        inspectionId: r.inspection_id,
        reportNumber: r.report_number,
        d1Team: r.d1_team,
        d2Problem: r.d2_problem,
        d3Containment: r.d3_containment,
        d4RootCause: r.d4_root_cause,
        d5Corrective: r.d5_corrective,
        d6Implemented: r.d6_implemented,
        d7Preventive: r.d7_preventive,
        d8Recognition: r.d8_recognition,
        status: r.status,
        createdBy: r.created_by,
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[ACI][Quality 8D] GET error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

const Create8DSchema = z.object({
  inspectionId: z.number().optional(),
  reportNumber: z.string().min(1).max(50),
  d1Team: z.string().max(500).optional(),
  d2Problem: z.string().max(4000).optional(),
  d3Containment: z.string().max(4000).optional(),
  d4RootCause: z.string().max(4000).optional(),
  d5Corrective: z.string().max(4000).optional(),
  d6Implemented: z.string().max(4000).optional(),
  d7Preventive: z.string().max(4000).optional(),
  d8Recognition: z.string().max(4000).optional(),
  status: z.enum(['open', 'in_progress', 'implemented', 'closed']).default('open'),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = Create8DSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO quality_8d_reports (inspection_id, report_number, d1_team, d2_problem, d3_containment, d4_root_cause, d5_corrective, d6_implemented, d7_preventive, d8_recognition, status, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11)`,
      [
        { name: 'p0', type: 'int', value: d.inspectionId ?? null },
        { name: 'p1', type: 'nvarchar', value: d.reportNumber },
        { name: 'p2', type: 'nvarchar', value: d.d1Team ?? null },
        { name: 'p3', type: 'nvarchar', value: d.d2Problem ?? null },
        { name: 'p4', type: 'nvarchar', value: d.d3Containment ?? null },
        { name: 'p5', type: 'nvarchar', value: d.d4RootCause ?? null },
        { name: 'p6', type: 'nvarchar', value: d.d5Corrective ?? null },
        { name: 'p7', type: 'nvarchar', value: d.d6Implemented ?? null },
        { name: 'p8', type: 'nvarchar', value: d.d7Preventive ?? null },
        { name: 'p9', type: 'nvarchar', value: d.d8Recognition ?? null },
        { name: 'p10', type: 'nvarchar', value: d.status },
        { name: 'p11', type: 'nvarchar', value: auth.username },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[ACI][Quality 8D] POST error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
