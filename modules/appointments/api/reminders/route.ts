import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface BookingRow {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_type: string | null;
  booking_date: string;
  start_time: string;
  provider_name: string;
}

// GET /api/modules/appointments/reminders — list bookings due for reminder (next 24h, not yet sent)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'appointments.view');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();
    const rows = await db.query<BookingRow>(
      `SELECT id, customer_name, customer_email, customer_phone, service_type,
              booking_date, start_time, provider_name
       FROM appointments_bookings
       WHERE reminder_sent = 0
         AND status IN ('confirmed', 'pending')
         AND CAST(booking_date + ' ' + start_time AS DATETIME2) BETWEEN GETDATE() AND DATEADD(HOUR, 24, GETDATE())
       ORDER BY booking_date, start_time`,
      []
    );

    return Response.json({
      pending: rows.map(r => ({
        id: r.id,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        serviceType: r.service_type,
        bookingDate: r.booking_date,
        startTime: r.start_time,
        providerName: r.provider_name,
      })),
      count: rows.length,
    });
  } catch (err) {
    console.error('[Appointments Reminders] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

// POST /api/modules/appointments/reminders — send reminders and mark as sent
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'appointments.edit');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();

    // Get pending reminders
    const pending = await db.query<BookingRow>(
      `SELECT id, customer_name, customer_email, customer_phone, service_type,
              booking_date, start_time, provider_name
       FROM appointments_bookings
       WHERE reminder_sent = 0
         AND status IN ('confirmed', 'pending')
         AND CAST(booking_date + ' ' + start_time AS DATETIME2) BETWEEN GETDATE() AND DATEADD(HOUR, 24, GETDATE())`,
      []
    );

    let sentCount = 0;
    const errors: string[] = [];

    for (const booking of pending) {
      try {
        // Email reminder
        if (booking.customer_email) {
          // TODO: Integrate with email service (nodemailer / SendGrid / etc.)
          // For now, log the reminder
          console.log(
            `[Reminder] Email → ${booking.customer_email}: ` +
            `${booking.customer_name}, ${booking.booking_date} ${booking.start_time}, ` +
            `${booking.service_type ?? 'appointment'} @ ${booking.provider_name}`
          );
        }

        // SMS reminder
        if (booking.customer_phone) {
          // TODO: Integrate with SMS service (Twilio / etc.)
          console.log(
            `[Reminder] SMS → ${booking.customer_phone}: ` +
            `${booking.customer_name}, ${booking.booking_date} ${booking.start_time}`
          );
        }

        // Mark as sent
        await db.execute(
          'UPDATE appointments_bookings SET reminder_sent = 1 WHERE id = @p0',
          [{ name: 'p0', type: 'int', value: booking.id }]
        );
        sentCount++;
      } catch (err) {
        errors.push(`Failed for booking ${booking.id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    return Response.json({
      ok: true,
      sent: sentCount,
      total: pending.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Appointments Reminders] POST error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
