import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'shift-management.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  try {
    // Get shift definitions
    const shifts = await getDb().query<{ id: number; shift_name: string; start_time: string; end_time: string; color: string | null }>(
      'SELECT id, shift_name, start_time, end_time, color FROM shift_definitions WHERE is_active = 1 ORDER BY start_time'
    );

    // Get assignments
    let assignSql = `SELECT a.id, a.worker_name, a.team_name, a.shift_id, s.shift_name, a.assignment_date, a.status
                     FROM shift_assignments a JOIN shift_definitions s ON a.shift_id = s.id WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (dateFrom) { assignSql += ` AND a.assignment_date >= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateFrom }); idx++; }
    if (dateTo) { assignSql += ` AND a.assignment_date <= @p${idx}`; params.push({ name: `p${idx}`, type: 'nvarchar', value: dateTo }); idx++; }

    assignSql += ' ORDER BY a.assignment_date, a.worker_name';
    const assignments = await getDb().query<{ id: number; worker_name: string; team_name: string | null; shift_id: number; shift_name: string; assignment_date: Date; status: string }>(assignSql, params);

    return Response.json({
      shifts: shifts.map(s => ({ id: s.id, name: s.shift_name, startTime: s.start_time, endTime: s.end_time, color: s.color })),
      assignments: assignments.map(a => ({
        id: a.id, workerName: a.worker_name, teamName: a.team_name, shiftId: a.shift_id, shiftName: a.shift_name,
        assignmentDate: String(a.assignment_date).split('T')[0], status: a.status,
      })),
    });
  } catch (err) {
    console.error('[ShiftMgmt API] GET error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  workerName: z.string().min(1).max(100),
  teamName: z.string().max(100).optional(),
  shiftId: z.number(),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'shift-management.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { workerName, teamName, shiftId, assignmentDate } = parsed.data;

  try {
    const db = getDb();

    // Check for conflict
    const existing = await db.query<{ id: number }>(
      'SELECT id FROM shift_assignments WHERE worker_name = @p0 AND assignment_date = @p1',
      [{ name: 'p0', type: 'nvarchar', value: workerName }, { name: 'p1', type: 'nvarchar', value: assignmentDate }]
    );
    if (existing.length > 0) {
      return Response.json({ error: 'api.error.worker_already_assigned' }, { status: 409 });
    }

    // sm-07: Rest period validation (min 11 hours between shifts)
    const MIN_REST_HOURS = 11;
    const newShift = await db.query<{ start_time: string; end_time: string }>(
      'SELECT start_time, end_time FROM shift_definitions WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: shiftId }]
    );
    if (newShift[0]) {
      const prevDate = new Date(assignmentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const nextDate = new Date(assignmentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const adjacent = await db.query<{ assignment_date: string; start_time: string; end_time: string }>(
        `SELECT CONVERT(VARCHAR(10), a.assignment_date, 120) AS assignment_date, s.start_time, s.end_time
         FROM shift_assignments a JOIN shift_definitions s ON a.shift_id = s.id
         WHERE a.worker_name = @p0 AND a.assignment_date IN (@p1, @p2)`,
        [
          { name: 'p0', type: 'nvarchar', value: workerName },
          { name: 'p1', type: 'nvarchar', value: prevDate.toISOString().split('T')[0] },
          { name: 'p2', type: 'nvarchar', value: nextDate.toISOString().split('T')[0] },
        ]
      );

      const parseTime = (dateStr: string, timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(dateStr);
        d.setHours(h ?? 0, m ?? 0, 0, 0);
        return d.getTime();
      };

      for (const adj of adjacent) {
        const adjDate = adj.assignment_date;
        if (adjDate === prevDate.toISOString().split('T')[0]) {
          // Previous day shift end → new shift start
          const prevEnd = parseTime(adjDate, adj.end_time);
          const newStart = parseTime(assignmentDate, newShift[0].start_time);
          const restHours = (newStart - prevEnd) / (1000 * 60 * 60);
          if (restHours < MIN_REST_HOURS) {
            return Response.json({ error: 'shift.rest_violation' }, { status: 422 });
          }
        } else {
          // New shift end → next day shift start
          const newEnd = parseTime(assignmentDate, newShift[0].end_time);
          const nextStart = parseTime(adjDate, adj.start_time);
          const restHours = (nextStart - newEnd) / (1000 * 60 * 60);
          if (restHours < MIN_REST_HOURS) {
            return Response.json({ error: 'shift.rest_violation' }, { status: 422 });
          }
        }
      }
    }

    const result = await db.query<{ id: number }>(
      `INSERT INTO shift_assignments (worker_name, team_name, shift_id, assignment_date, created_by)
       OUTPUT INSERTED.id VALUES (@p0, @p1, @p2, @p3, @p4)`,
      [
        { name: 'p0', type: 'nvarchar', value: workerName },
        { name: 'p1', type: 'nvarchar', value: teamName ?? null },
        { name: 'p2', type: 'int', value: shiftId },
        { name: 'p3', type: 'nvarchar', value: assignmentDate },
        { name: 'p4', type: 'nvarchar', value: auth.username },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[ShiftMgmt API] POST error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
