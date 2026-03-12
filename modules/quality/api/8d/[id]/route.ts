import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(request, 'quality.view');
  if (!auth.valid) return auth.response;

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const rows = await getDb().query<{
      id: number; inspection_id: number | null; report_number: string;
      d1_team: string | null; d2_problem: string | null; d3_containment: string | null;
      d4_root_cause: string | null; d5_corrective: string | null; d6_implemented: string | null;
      d7_preventive: string | null; d8_recognition: string | null;
      status: string; created_by: string | null; created_at: Date;
    }>(
      `SELECT id, inspection_id, report_number, d1_team, d2_problem, d3_containment,
              d4_root_cause, d5_corrective, d6_implemented, d7_preventive, d8_recognition,
              status, created_by, created_at
       FROM quality_8d_reports WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: reportId }]
    );

    if (!rows.length) return Response.json({ error: 'Not found' }, { status: 404 });

    const r = rows[0];
    return Response.json({
      id: r.id, inspectionId: r.inspection_id, reportNumber: r.report_number,
      d1Team: r.d1_team, d2Problem: r.d2_problem, d3Containment: r.d3_containment,
      d4RootCause: r.d4_root_cause, d5Corrective: r.d5_corrective,
      d6Implemented: r.d6_implemented, d7Preventive: r.d7_preventive,
      d8Recognition: r.d8_recognition, status: r.status,
      createdBy: r.created_by, createdAt: String(r.created_at),
    });
  } catch (err) {
    console.error('[ACI][Quality 8D] GET single error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

const Update8DSchema = z.object({
  d1Team: z.string().max(500).optional(),
  d2Problem: z.string().max(4000).optional(),
  d3Containment: z.string().max(4000).optional(),
  d4RootCause: z.string().max(4000).optional(),
  d5Corrective: z.string().max(4000).optional(),
  d6Implemented: z.string().max(4000).optional(),
  d7Preventive: z.string().max(4000).optional(),
  d8Recognition: z.string().max(4000).optional(),
  status: z.enum(['open', 'in_progress', 'implemented', 'closed']).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = Update8DSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const d = parsed.data;
  const setClauses: string[] = [];
  const queryParams: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
  let idx = 0;

  const fieldMap: Record<string, string> = {
    d1Team: 'd1_team', d2Problem: 'd2_problem', d3Containment: 'd3_containment',
    d4RootCause: 'd4_root_cause', d5Corrective: 'd5_corrective', d6Implemented: 'd6_implemented',
    d7Preventive: 'd7_preventive', d8Recognition: 'd8_recognition', status: 'status',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = d[key as keyof typeof d];
    if (val !== undefined) {
      setClauses.push(`${col} = @p${idx}`);
      queryParams.push({ name: `p${idx}`, type: 'nvarchar', value: val });
      idx++;
    }
  }

  if (!setClauses.length) return Response.json({ error: 'No fields to update' }, { status: 400 });

  queryParams.push({ name: `p${idx}`, type: 'int', value: reportId });

  try {
    await getDb().execute(
      `UPDATE quality_8d_reports SET ${setClauses.join(', ')} WHERE id = @p${idx}`,
      queryParams
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ACI][Quality 8D] PUT error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(request, 'quality.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    await getDb().execute(
      'DELETE FROM quality_8d_reports WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: reportId }]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ACI][Quality 8D] DELETE error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
