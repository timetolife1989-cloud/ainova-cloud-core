import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RefuelRow {
  id: number;
  vehicle_id: number;
  plate_number: string;
  refuel_date: string;
  amount: number | null;
  cost: number | null;
  km_at_refuel: number | null;
  fuel_type: string | null;
  created_by: string | null;
}

// GET /api/modules/fleet/refuels
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicleId');

  try {
    const db = getDb();
    let sql = `SELECT r.id, r.vehicle_id, v.plate_number, r.refuel_date, r.amount, r.cost,
                      r.km_at_refuel, r.fuel_type, r.created_by
               FROM fleet_refuels r JOIN fleet_vehicles v ON r.vehicle_id = v.id WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];

    if (vehicleId) {
      sql += ' AND r.vehicle_id = @p0';
      params.push({ name: 'p0', type: 'int', value: parseInt(vehicleId) });
    }

    sql += ' ORDER BY r.refuel_date DESC, r.id DESC';
    const rows = await db.query<RefuelRow>(sql, params);

    const refuels = rows.map(r => ({
      id: r.id,
      vehicleId: r.vehicle_id,
      plateNumber: r.plate_number,
      refuelDate: String(r.refuel_date).split('T')[0],
      amount: r.amount != null ? Number(r.amount) : null,
      cost: r.cost != null ? Number(r.cost) : null,
      kmAtRefuel: r.km_at_refuel != null ? Number(r.km_at_refuel) : null,
      fuelType: r.fuel_type,
    }));

    return Response.json({ refuels });
  } catch (err) {
    console.error('[Fleet Refuels] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateRefuelSchema = z.object({
  vehicleId: z.number(),
  refuelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  kmAtRefuel: z.number().min(0).optional(),
  fuelType: z.string().max(50).optional(),
});

// POST /api/modules/fleet/refuels
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'fleet.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateRefuelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { vehicleId, refuelDate, amount, cost, kmAtRefuel, fuelType } = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO fleet_refuels (vehicle_id, refuel_date, amount, cost, km_at_refuel, fuel_type, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)`,
      [
        { name: 'p0', type: 'int', value: vehicleId },
        { name: 'p1', type: 'nvarchar', value: refuelDate },
        { name: 'p2', type: 'nvarchar', value: amount ?? null },
        { name: 'p3', type: 'nvarchar', value: cost ?? null },
        { name: 'p4', type: 'nvarchar', value: kmAtRefuel ?? null },
        { name: 'p5', type: 'nvarchar', value: fuelType ?? null },
        { name: 'p6', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Fleet Refuels] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
