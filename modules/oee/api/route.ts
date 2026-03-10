import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface OeeRow {
  id: number;
  machine_id: number;
  machine_code: string;
  machine_name: string;
  record_date: Date;
  shift: string | null;
  planned_time_min: number;
  run_time_min: number;
  total_count: number;
  good_count: number;
  reject_count: number;
  availability_pct: number | null;
  performance_pct: number | null;
  quality_pct: number | null;
  oee_pct: number | null;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'oee.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get('machineId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  try {
    let sql = `SELECT r.id, r.machine_id, m.machine_code, m.machine_name, r.record_date, r.shift,
               r.planned_time_min, r.run_time_min, r.total_count, r.good_count, r.reject_count,
               r.availability_pct, r.performance_pct, r.quality_pct, r.oee_pct
               FROM oee_records r JOIN oee_machines m ON r.machine_id = m.id WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
    let idx = 0;

    if (machineId) { sql += ` AND r.machine_id = @p${idx}`; params.push({ name: `p${idx}`, type: 'int', value: parseInt(machineId) }); idx++; }
    if (dateFrom) { sql += ` AND r.record_date >= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateFrom }); idx++; }
    if (dateTo) { sql += ` AND r.record_date <= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateTo }); idx++; }

    sql += ' ORDER BY r.record_date DESC, m.machine_code';
    const rows = await getDb().query<OeeRow>(sql, params);

    // Also get machines list
    const machines = await getDb().query<{ id: number; machine_code: string; machine_name: string }>(
      'SELECT id, machine_code, machine_name FROM oee_machines WHERE is_active = 1 ORDER BY machine_code'
    );

    return Response.json({
      records: rows.map(r => ({
        id: r.id, machineId: r.machine_id, machineCode: r.machine_code, machineName: r.machine_name,
        recordDate: String(r.record_date).split('T')[0], shift: r.shift,
        plannedTimeMin: r.planned_time_min, runTimeMin: r.run_time_min,
        totalCount: r.total_count, goodCount: r.good_count, rejectCount: r.reject_count,
        availabilityPct: r.availability_pct, performancePct: r.performance_pct,
        qualityPct: r.quality_pct, oeePct: r.oee_pct,
      })),
      machines: machines.map(m => ({ id: m.id, code: m.machine_code, name: m.machine_name })),
    });
  } catch (err) {
    console.error('[OEE API] GET error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  machineId: z.number(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.string().max(20).optional(),
  plannedTimeMin: z.number().min(0),
  runTimeMin: z.number().min(0),
  idealCycleSec: z.number().min(0).optional(),
  totalCount: z.number().min(0),
  goodCount: z.number().min(0),
  rejectCount: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'oee.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const d = parsed.data;
  const rejectCount = d.rejectCount ?? (d.totalCount - d.goodCount);
  const availability = d.plannedTimeMin > 0 ? Math.round((d.runTimeMin / d.plannedTimeMin) * 100 * 100) / 100 : 0;
  const performance = (d.runTimeMin > 0 && d.idealCycleSec) ? Math.round(((d.idealCycleSec * d.totalCount / 60) / d.runTimeMin) * 100 * 100) / 100 : null;
  const quality = d.totalCount > 0 ? Math.round((d.goodCount / d.totalCount) * 100 * 100) / 100 : 0;
  const oee = (availability && performance && quality) ? Math.round((availability * performance * quality) / 10000 * 100) / 100 : null;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO oee_records (machine_id, record_date, shift, planned_time_min, run_time_min, ideal_cycle_sec, total_count, good_count, reject_count, availability_pct, performance_pct, quality_pct, oee_pct, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13)`,
      [
        { name: 'p0', type: 'int', value: d.machineId },
        { name: 'p1', type: 'nvarchar', value: d.recordDate },
        { name: 'p2', type: 'nvarchar', value: d.shift ?? null },
        { name: 'p3', type: 'nvarchar', value: String(d.plannedTimeMin) },
        { name: 'p4', type: 'nvarchar', value: String(d.runTimeMin) },
        { name: 'p5', type: 'nvarchar', value: d.idealCycleSec ? String(d.idealCycleSec) : null },
        { name: 'p6', type: 'int', value: d.totalCount },
        { name: 'p7', type: 'int', value: d.goodCount },
        { name: 'p8', type: 'int', value: rejectCount },
        { name: 'p9', type: 'nvarchar', value: String(availability) },
        { name: 'p10', type: 'nvarchar', value: performance !== null ? String(performance) : null },
        { name: 'p11', type: 'nvarchar', value: String(quality) },
        { name: 'p12', type: 'nvarchar', value: oee !== null ? String(oee) : null },
        { name: 'p13', type: 'nvarchar', value: auth.username },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[OEE API] POST error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}
