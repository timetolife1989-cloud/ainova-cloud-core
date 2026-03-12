import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const CompleteSchema = z.object({
  scheduleId: z.number(),
  durationMin: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/modules/maintenance/complete
 * Marks a maintenance schedule as done: logs the entry, updates schedule dates.
 */
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'maintenance.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CompleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { scheduleId, durationMin, cost, notes } = parsed.data;

  try {
    // Get the schedule to find asset_id and interval
    const schedules = await getDb().query<{ asset_id: number; interval_days: number }>(
      `SELECT asset_id, interval_days FROM maintenance_schedules WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: scheduleId }]
    );

    if (!schedules[0]) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const { asset_id, interval_days } = schedules[0];

    await getDb().transaction(async (tx) => {
      // Insert log entry
      await tx.execute(
        `INSERT INTO maintenance_log (schedule_id, asset_id, done_date, duration_min, cost, notes, performed_by)
         VALUES (@p0, @p1, CAST(SYSDATETIME() AS DATE), @p2, @p3, @p4, @p5)`,
        [
          { name: 'p0', type: 'int', value: scheduleId },
          { name: 'p1', type: 'int', value: asset_id },
          { name: 'p2', type: 'int', value: durationMin ?? null },
          { name: 'p3', type: 'float', value: cost ?? null },
          { name: 'p4', type: 'nvarchar', value: notes ?? null },
          { name: 'p5', type: 'nvarchar', value: auth.username },
        ]
      );

      // Update schedule: set last_done_date = today, next_due_date = today + interval
      await tx.execute(
        `UPDATE maintenance_schedules
         SET last_done_date = CAST(SYSDATETIME() AS DATE),
             next_due_date = DATEADD(day, @p1, CAST(SYSDATETIME() AS DATE))
         WHERE id = @p0`,
        [
          { name: 'p0', type: 'int', value: scheduleId },
          { name: 'p1', type: 'int', value: interval_days },
        ]
      );
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Maintenance] Complete error:', err);
    return Response.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}
