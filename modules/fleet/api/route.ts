import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface VehicleRow {
  id: number;
  plate_number: string;
  vehicle_name: string | null;
  vehicle_type: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
}

// GET /api/modules/fleet/data — vehicles list
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  try {
    let sql = 'SELECT id, plate_number, vehicle_name, vehicle_type, is_active, notes, created_at FROM fleet_vehicles';
    if (activeOnly) sql += ' WHERE is_active = 1';
    sql += ' ORDER BY plate_number';

    const rows = await getDb().query<VehicleRow>(sql);

    const vehicles = rows.map(r => ({
      id: r.id,
      plateNumber: r.plate_number,
      vehicleName: r.vehicle_name,
      vehicleType: r.vehicle_type,
      isActive: Boolean(r.is_active),
      notes: r.notes,
      createdAt: String(r.created_at),
    }));

    return Response.json({ vehicles });
  } catch (err) {
    console.error('[Fleet API] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateVehicleSchema = z.object({
  plateNumber: z.string().min(1).max(20),
  vehicleName: z.string().max(100).optional(),
  vehicleType: z.enum(['car', 'van', 'truck', 'forklift', 'other']).optional(),
  notes: z.string().max(500).optional(),
});

// POST /api/modules/fleet/data — create vehicle
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { plateNumber, vehicleName, vehicleType, notes } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO fleet_vehicles (plate_number, vehicle_name, vehicle_type, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3)`,
      [
        { name: 'p0', type: 'nvarchar', value: plateNumber },
        { name: 'p1', type: 'nvarchar', value: vehicleName ?? null },
        { name: 'p2', type: 'nvarchar', value: vehicleType ?? null },
        { name: 'p3', type: 'nvarchar', value: notes ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Fleet API] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
