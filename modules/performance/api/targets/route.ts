import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'performance.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<{
      id: number; target_type: string; target_name: string | null;
      period_type: string; target_value: number; target_unit: string | null;
      valid_from: Date; valid_to: Date | null; created_at: Date;
    }>(
      `SELECT id, target_type, target_name, period_type, target_value, target_unit, valid_from, valid_to, created_at
       FROM performance_targets ORDER BY valid_from DESC`,
      []
    );

    return Response.json({
      targets: rows.map(r => ({
        id: r.id,
        targetType: r.target_type,
        targetName: r.target_name,
        periodType: r.period_type,
        targetValue: r.target_value,
        targetUnit: r.target_unit,
        validFrom: String(r.valid_from).split('T')[0],
        validTo: r.valid_to ? String(r.valid_to).split('T')[0] : null,
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[ACI][Performance Targets] GET error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

const CreateTargetSchema = z.object({
  targetType: z.enum(['worker', 'team', 'global']),
  targetName: z.string().max(100).optional(),
  periodType: z.enum(['daily', 'weekly', 'monthly']),
  targetValue: z.number().min(0),
  targetUnit: z.string().max(50).optional(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'performance.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateTargetSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO performance_targets (target_type, target_name, period_type, target_value, target_unit, valid_from, valid_to)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)`,
      [
        { name: 'p0', type: 'nvarchar', value: d.targetType },
        { name: 'p1', type: 'nvarchar', value: d.targetName ?? null },
        { name: 'p2', type: 'nvarchar', value: d.periodType },
        { name: 'p3', type: 'nvarchar', value: String(d.targetValue) },
        { name: 'p4', type: 'nvarchar', value: d.targetUnit ?? null },
        { name: 'p5', type: 'nvarchar', value: d.validFrom },
        { name: 'p6', type: 'nvarchar', value: d.validTo ?? null },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[ACI][Performance Targets] POST error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'performance.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') ?? '', 10);
  if (isNaN(id)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    await getDb().execute(
      'DELETE FROM performance_targets WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ACI][Performance Targets] DELETE error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
