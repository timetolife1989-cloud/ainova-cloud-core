import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/modules/workforce/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'workforce.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  try {
    const rows = await getDb().query<{ id: number; record_date: Date; shift_name: string | null; area_name: string | null; planned_count: number; actual_count: number; absent_count: number; notes: string | null; recorded_by: string | null; created_at: Date }>(
      'SELECT * FROM workforce_daily WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: itemId }]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Nem található' }, { status: 404 });
    }

    const r = rows[0];
    return Response.json({
      id: r.id,
      recordDate: String(r.record_date).split('T')[0],
      shiftName: r.shift_name,
      areaName: r.area_name,
      plannedCount: r.planned_count,
      actualCount: r.actual_count,
      absentCount: r.absent_count,
      notes: r.notes,
      recordedBy: r.recorded_by,
      createdAt: String(r.created_at),
    });
  } catch (err) {
    console.error('[Workforce API] GET by ID error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shiftName: z.string().max(50).nullable().optional(),
  areaName: z.string().max(100).nullable().optional(),
  plannedCount: z.number().min(0).optional(),
  actualCount: z.number().min(0).optional(),
  absentCount: z.number().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

// PUT /api/modules/workforce/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'workforce.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  const body = await request.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { recordDate, shiftName, areaName, plannedCount, actualCount, absentCount, notes } = parsed.data;

  try {
    const updates: string[] = ['updated_at = SYSDATETIME()'];
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [
      { name: 'id', type: 'int', value: itemId },
    ];
    let paramIdx = 0;

    if (recordDate !== undefined) {
      updates.push(`record_date = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: recordDate });
      paramIdx++;
    }
    if (shiftName !== undefined) {
      updates.push(`shift_name = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: shiftName });
      paramIdx++;
    }
    if (areaName !== undefined) {
      updates.push(`area_name = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: areaName });
      paramIdx++;
    }
    if (plannedCount !== undefined) {
      updates.push(`planned_count = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: String(plannedCount) });
      paramIdx++;
    }
    if (actualCount !== undefined) {
      updates.push(`actual_count = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: String(actualCount) });
      paramIdx++;
    }
    if (absentCount !== undefined) {
      updates.push(`absent_count = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: String(absentCount) });
      paramIdx++;
    }
    if (notes !== undefined) {
      updates.push(`notes = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: notes });
      paramIdx++;
    }

    await getDb().execute(
      `UPDATE workforce_daily SET ${updates.join(', ')} WHERE id = @id`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Workforce API] PUT error:', err);
    return Response.json({ error: 'Hiba a módosításkor' }, { status: 500 });
  }
}

// DELETE /api/modules/workforce/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'workforce.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  try {
    await getDb().execute(
      'DELETE FROM workforce_daily WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: itemId }]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Workforce API] DELETE error:', err);
    return Response.json({ error: 'Hiba a törléskor' }, { status: 500 });
  }
}
