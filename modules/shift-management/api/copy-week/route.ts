import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface AssignmentRow {
  worker_name: string;
  team_name: string | null;
  shift_id: number;
  assignment_date: string;
}

const CopyWeekSchema = z.object({
  sourceWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// POST /api/modules/shift-management/copy-week
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'shift-management.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CopyWeekSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { sourceWeekStart, targetWeekStart } = parsed.data;

  try {
    const db = getDb();

    // Get source week end (7 days)
    const srcStart = new Date(sourceWeekStart);
    const srcEnd = new Date(srcStart);
    srcEnd.setDate(srcEnd.getDate() + 6);

    const sourceAssignments = await db.query<AssignmentRow>(
      `SELECT worker_name, team_name, shift_id,
              CONVERT(VARCHAR(10), assignment_date, 120) AS assignment_date
       FROM shift_assignments
       WHERE assignment_date >= @p0 AND assignment_date <= @p1`,
      [
        { name: 'p0', type: 'nvarchar', value: sourceWeekStart },
        { name: 'p1', type: 'nvarchar', value: srcEnd.toISOString().split('T')[0] },
      ]
    );

    if (sourceAssignments.length === 0) {
      return Response.json({ error: 'shift.no_source_assignments' }, { status: 404 });
    }

    // Calculate day offset
    const tgtStart = new Date(targetWeekStart);
    const dayOffset = Math.round((tgtStart.getTime() - srcStart.getTime()) / (1000 * 60 * 60 * 24));

    let copiedCount = 0;
    for (const a of sourceAssignments) {
      const srcDate = new Date(a.assignment_date);
      const tgtDate = new Date(srcDate);
      tgtDate.setDate(tgtDate.getDate() + dayOffset);
      const tgtDateStr = tgtDate.toISOString().split('T')[0];

      // Skip if already exists
      const existing = await db.query<{ id: number }>(
        'SELECT id FROM shift_assignments WHERE worker_name = @p0 AND assignment_date = @p1',
        [
          { name: 'p0', type: 'nvarchar', value: a.worker_name },
          { name: 'p1', type: 'nvarchar', value: tgtDateStr },
        ]
      );
      if (existing.length > 0) continue;

      await db.execute(
        `INSERT INTO shift_assignments (worker_name, team_name, shift_id, assignment_date, created_by)
         VALUES (@p0, @p1, @p2, @p3, @p4)`,
        [
          { name: 'p0', type: 'nvarchar', value: a.worker_name },
          { name: 'p1', type: 'nvarchar', value: a.team_name },
          { name: 'p2', type: 'int', value: a.shift_id },
          { name: 'p3', type: 'nvarchar', value: tgtDateStr },
          { name: 'p4', type: 'nvarchar', value: auth.username },
        ]
      );
      copiedCount++;
    }

    return Response.json({ ok: true, copied: copiedCount }, { status: 201 });
  } catch (err) {
    console.error('[ShiftMgmt CopyWeek] error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
