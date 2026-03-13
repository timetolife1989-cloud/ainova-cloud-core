import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TripRow {
  id: number;
  vehicle_id: number;
  trip_date: Date;
  driver_name: string | null;
  start_km: number | null;
  end_km: number | null;
  distance: number | null;
  purpose: string | null;
  created_by: string | null;
  created_at: Date;
}

// GET /api/modules/fleet/data/[id] — vehicle details + trips
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'fleet.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  try {
    // Get vehicle
    const vehicles = await getDb().query<{ id: number; plate_number: string; vehicle_name: string | null; vehicle_type: string | null; is_active: boolean; notes: string | null }>(
      'SELECT id, plate_number, vehicle_name, vehicle_type, is_active, notes FROM fleet_vehicles WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: vehicleId }]
    );

    if (vehicles.length === 0) {
      return Response.json({ error: 'error.not_found' }, { status: 404 });
    }

    const v = vehicles[0];

    // Get recent trips
    const trips = await getDb().query<TripRow>(
      'SELECT TOP 20 * FROM fleet_trips WHERE vehicle_id = @p0 ORDER BY trip_date DESC',
      [{ name: 'p0', type: 'int', value: vehicleId }]
    );

    return Response.json({
      vehicle: {
        id: v.id,
        plateNumber: v.plate_number,
        vehicleName: v.vehicle_name,
        vehicleType: v.vehicle_type,
        isActive: Boolean(v.is_active),
        notes: v.notes,
      },
      trips: trips.map(t => ({
        id: t.id,
        tripDate: String(t.trip_date).split('T')[0],
        driverName: t.driver_name,
        startKm: t.start_km,
        endKm: t.end_km,
        distance: t.distance,
        purpose: t.purpose,
      })),
    });
  } catch (err) {
    console.error('[Fleet API] GET by ID error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const AddTripSchema = z.object({
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driverName: z.string().max(100).optional(),
  startKm: z.number().min(0).optional(),
  endKm: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  purpose: z.string().max(500).optional(),
});

// POST /api/modules/fleet/data/[id] — add trip to vehicle
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'fleet.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  const body = await request.json() as unknown;
  const parsed = AddTripSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { tripDate, driverName, startKm, endKm, distance, purpose } = parsed.data;
  const calculatedDistance = distance ?? (startKm !== undefined && endKm !== undefined ? endKm - startKm : null);

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO fleet_trips (vehicle_id, trip_date, driver_name, start_km, end_km, distance, purpose, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
      [
        { name: 'p0', type: 'int', value: vehicleId },
        { name: 'p1', type: 'nvarchar', value: tripDate },
        { name: 'p2', type: 'nvarchar', value: driverName ?? null },
        { name: 'p3', type: 'nvarchar', value: startKm !== undefined ? String(startKm) : null },
        { name: 'p4', type: 'nvarchar', value: endKm !== undefined ? String(endKm) : null },
        { name: 'p5', type: 'nvarchar', value: calculatedDistance !== null ? String(calculatedDistance) : null },
        { name: 'p6', type: 'nvarchar', value: purpose ?? null },
        { name: 'p7', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Fleet API] POST trip error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

const UpdateVehicleSchema = z.object({
  vehicleName: z.string().max(100).optional(),
  vehicleType: z.enum(['car', 'van', 'truck', 'forklift', 'other']).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

// PUT /api/modules/fleet/data/[id] — update vehicle
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'fleet.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  const body = await request.json() as unknown;
  const parsed = UpdateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { vehicleName, vehicleType, isActive, notes } = parsed.data;

  try {
    const updates: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'bit'; value: unknown }> = [
      { name: 'id', type: 'int', value: vehicleId },
    ];
    let paramIdx = 0;

    if (vehicleName !== undefined) {
      updates.push(`vehicle_name = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: vehicleName });
      paramIdx++;
    }
    if (vehicleType !== undefined) {
      updates.push(`vehicle_type = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: vehicleType });
      paramIdx++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'bit', value: isActive ? 1 : 0 });
      paramIdx++;
    }
    if (notes !== undefined) {
      updates.push(`notes = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: notes });
      paramIdx++;
    }

    if (updates.length > 0) {
      await getDb().query(
        `UPDATE fleet_vehicles SET ${updates.join(', ')} WHERE id = @id`,
        params
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Fleet API] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
