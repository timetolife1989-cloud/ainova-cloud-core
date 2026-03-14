import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface SlotRow {
  id: number;
  provider_id: number | null;
  provider_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

// GET /api/modules/appointments/slots — list slots
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'appointments.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const rows = await db.query<SlotRow>(
    'SELECT * FROM appointments_slots ORDER BY day_of_week, start_time'
  );

  return Response.json({ slots: rows });
}

const SlotSchema = z.object({
  providerName: z.string().min(1).max(200),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.number().int().min(5).max(480).optional(),
});

// POST /api/modules/appointments/slots — create slot
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'appointments.manage');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = SlotSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const result = await db.query<{ id: number }>(
    `INSERT INTO appointments_slots (provider_id, provider_name, day_of_week, start_time, end_time, slot_duration)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: auth.userId ?? 0 },
      { name: 'p1', type: 'nvarchar', value: d.providerName },
      { name: 'p2', type: 'int', value: d.dayOfWeek },
      { name: 'p3', type: 'nvarchar', value: d.startTime },
      { name: 'p4', type: 'nvarchar', value: d.endTime },
      { name: 'p5', type: 'int', value: d.slotDuration ?? 30 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// DELETE /api/modules/appointments/slots — delete slot by id
export async function DELETE(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'appointments.manage');
  if (!auth.valid) return auth.response;

  const slotId = request.nextUrl.searchParams.get('id');
  if (!slotId) return Response.json({ error: 'id required' }, { status: 400 });

  const db = getDb();
  await db.query('DELETE FROM appointments_slots WHERE id = @p0', [
    { name: 'p0', type: 'int', value: parseInt(slotId, 10) },
  ]);

  return Response.json({ ok: true });
}
