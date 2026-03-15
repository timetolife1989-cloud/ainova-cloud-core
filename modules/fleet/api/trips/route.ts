import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface TripRow {
  id: number;
  vehicle_id: number;
  plate_number: string;
  trip_date: string;
  driver_name: string | null;
  start_km: number | null;
  end_km: number | null;
  distance: number | null;
  purpose: string | null;
  created_by: string | null;
}

// GET /api/modules/fleet/trips
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicleId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  try {
    const db = getDb();
    let sql = `SELECT t.id, t.vehicle_id, v.plate_number, t.trip_date, t.driver_name,
                      t.start_km, t.end_km, t.distance, t.purpose, t.created_by
               FROM fleet_trips t JOIN fleet_vehicles v ON t.vehicle_id = v.id WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
    let idx = 0;

    if (vehicleId) {
      sql += ` AND t.vehicle_id = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'int', value: parseInt(vehicleId) });
      idx++;
    }
    if (dateFrom) {
      sql += ` AND t.trip_date >= @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: dateFrom });
      idx++;
    }
    if (dateTo) {
      sql += ` AND t.trip_date <= @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: dateTo });
      idx++;
    }

    sql += ' ORDER BY t.trip_date DESC, t.id DESC';
    const rows = await db.query<TripRow>(sql, params);

    const trips = rows.map(r => ({
      id: r.id,
      vehicleId: r.vehicle_id,
      plateNumber: r.plate_number,
      tripDate: String(r.trip_date).split('T')[0],
      driverName: r.driver_name,
      startKm: r.start_km != null ? Number(r.start_km) : null,
      endKm: r.end_km != null ? Number(r.end_km) : null,
      distance: r.distance != null ? Number(r.distance) : null,
      purpose: r.purpose,
    }));

    return Response.json({ trips });
  } catch (err) {
    console.error('[Fleet Trips] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateTripSchema = z.object({
  vehicleId: z.number(),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driverName: z.string().max(100).optional(),
  startKm: z.number().min(0).optional(),
  endKm: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  purpose: z.string().max(500).optional(),
});

// POST /api/modules/fleet/trips
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateTripSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { vehicleId, tripDate, driverName, startKm, endKm, purpose } = parsed.data;
  const distance = parsed.data.distance ?? (startKm != null && endKm != null ? endKm - startKm : null);

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO fleet_trips (vehicle_id, trip_date, driver_name, start_km, end_km, distance, purpose, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
      [
        { name: 'p0', type: 'int', value: vehicleId },
        { name: 'p1', type: 'nvarchar', value: tripDate },
        { name: 'p2', type: 'nvarchar', value: driverName ?? null },
        { name: 'p3', type: 'nvarchar', value: startKm ?? null },
        { name: 'p4', type: 'nvarchar', value: endKm ?? null },
        { name: 'p5', type: 'nvarchar', value: distance ?? null },
        { name: 'p6', type: 'nvarchar', value: purpose ?? null },
        { name: 'p7', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Fleet Trips] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
