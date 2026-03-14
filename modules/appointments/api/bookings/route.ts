import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface BookingRow {
  id: number;
  provider_id: number | null;
  provider_name: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_type: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

// GET /api/modules/appointments/bookings — list bookings, optional date filter
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'appointments.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const date = request.nextUrl.searchParams.get('date');
  const status = request.nextUrl.searchParams.get('status');

  let sql = 'SELECT * FROM appointments_bookings WHERE 1=1';
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: string | number }> = [];
  let idx = 0;

  if (date) {
    sql += ` AND booking_date = @p${idx}`;
    params.push({ name: `p${idx}`, type: 'nvarchar', value: date });
    idx++;
  }

  if (status) {
    sql += ` AND status = @p${idx}`;
    params.push({ name: `p${idx}`, type: 'nvarchar', value: status });
    idx++;
  }

  sql += ' ORDER BY booking_date, start_time';
  const rows = await db.query<BookingRow>(sql, params);

  return Response.json({ bookings: rows });
}

const BookingSchema = z.object({
  providerName: z.string().min(1).max(200),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(50).optional(),
  customerEmail: z.string().email().max(200).optional(),
  serviceType: z.string().max(100).optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).optional(),
});

// POST /api/modules/appointments/bookings — create booking
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'appointments.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const result = await db.query<{ id: number }>(
    `INSERT INTO appointments_bookings (provider_name, customer_name, customer_phone, customer_email, service_type, booking_date, start_time, end_time, notes)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.providerName },
      { name: 'p1', type: 'nvarchar', value: d.customerName },
      { name: 'p2', type: 'nvarchar', value: d.customerPhone ?? '' },
      { name: 'p3', type: 'nvarchar', value: d.customerEmail ?? '' },
      { name: 'p4', type: 'nvarchar', value: d.serviceType ?? '' },
      { name: 'p5', type: 'nvarchar', value: d.bookingDate },
      { name: 'p6', type: 'nvarchar', value: d.startTime },
      { name: 'p7', type: 'nvarchar', value: d.endTime },
      { name: 'p8', type: 'nvarchar', value: d.notes ?? '' },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// PUT /api/modules/appointments/bookings — update booking status
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'appointments.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const updateSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb();
  await db.query(
    'UPDATE appointments_bookings SET status = @p0, updated_at = GETUTCDATE() WHERE id = @p1',
    [
      { name: 'p0', type: 'nvarchar', value: parsed.data.status },
      { name: 'p1', type: 'int', value: parsed.data.id },
    ]
  );

  return Response.json({ ok: true });
}
