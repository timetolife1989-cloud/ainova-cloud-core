import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RegisterRow {
  id: number;
  device_id: number;
  device_name: string;
  name: string;
  address: string;
  data_type: string;
  unit: string | null;
  scale_factor: number;
  poll_interval: number;
  is_active: boolean;
}

// GET /api/modules/plc-connector/registers?deviceId=1
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'plc-connector.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  try {
    const db = getDb();
    let sql = `SELECT r.id, r.device_id, d.name AS device_name, r.name, r.address,
                      r.data_type, r.unit, r.scale_factor, r.poll_interval, r.is_active
               FROM mod_plc_registers r
               JOIN mod_plc_devices d ON r.device_id = d.id
               WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];

    if (deviceId) {
      sql += ' AND r.device_id = @p0';
      params.push({ name: 'p0', type: 'int', value: parseInt(deviceId) });
    }

    sql += ' ORDER BY d.name, r.name';
    const rows = await db.query<RegisterRow>(sql, params);

    const registers = rows.map(r => ({
      id: r.id,
      deviceId: r.device_id,
      deviceName: r.device_name,
      name: r.name,
      address: r.address,
      dataType: r.data_type,
      unit: r.unit,
      scaleFactor: Number(r.scale_factor),
      pollInterval: Number(r.poll_interval),
      isActive: Boolean(r.is_active),
    }));

    return Response.json({ registers });
  } catch (err) {
    console.error('[PLC Registers] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateRegisterSchema = z.object({
  deviceId: z.number(),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(50),
  dataType: z.enum(['BOOL', 'INT', 'DINT', 'REAL', 'STRING']).optional(),
  unit: z.string().max(20).optional(),
  scaleFactor: z.number().optional(),
  pollInterval: z.number().min(100).optional(),
});

const UpdateRegisterSchema = CreateRegisterSchema.partial().extend({
  id: z.number(),
  isActive: z.boolean().optional(),
});

// POST /api/modules/plc-connector/registers
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'plc-connector.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { deviceId, name, address, dataType, unit, scaleFactor, pollInterval } = parsed.data;

  try {
    const db = getDb();
    const result = await db.query<{ id: number }>(
      `INSERT INTO mod_plc_registers (device_id, name, address, data_type, unit, scale_factor, poll_interval)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)`,
      [
        { name: 'p0', type: 'int', value: deviceId },
        { name: 'p1', type: 'nvarchar', value: name },
        { name: 'p2', type: 'nvarchar', value: address },
        { name: 'p3', type: 'nvarchar', value: dataType ?? 'INT' },
        { name: 'p4', type: 'nvarchar', value: unit ?? null },
        { name: 'p5', type: 'nvarchar', value: scaleFactor ?? 1.0 },
        { name: 'p6', type: 'int', value: pollInterval ?? 5000 },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[PLC Registers] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}

// PUT /api/modules/plc-connector/registers
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'plc-connector.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, deviceId, name, address, dataType, unit, scaleFactor, pollInterval, isActive } = parsed.data;

  try {
    const db = getDb();
    const setClauses: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'bit'; value: unknown }> = [];
    let idx = 0;

    if (deviceId !== undefined) { setClauses.push(`device_id = @p${idx}`); params.push({ name: `p${idx}`, type: 'int', value: deviceId }); idx++; }
    if (name !== undefined) { setClauses.push(`name = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: name }); idx++; }
    if (address !== undefined) { setClauses.push(`address = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: address }); idx++; }
    if (dataType !== undefined) { setClauses.push(`data_type = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: dataType }); idx++; }
    if (unit !== undefined) { setClauses.push(`unit = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: unit }); idx++; }
    if (scaleFactor !== undefined) { setClauses.push(`scale_factor = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: scaleFactor }); idx++; }
    if (pollInterval !== undefined) { setClauses.push(`poll_interval = @p${idx}`); params.push({ name: `p${idx}`, type: 'int', value: pollInterval }); idx++; }
    if (isActive !== undefined) { setClauses.push(`is_active = @p${idx}`); params.push({ name: `p${idx}`, type: 'bit', value: isActive }); idx++; }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push({ name: 'pid', type: 'int', value: id });
    await db.execute(
      `UPDATE mod_plc_registers SET ${setClauses.join(', ')} WHERE id = @pid`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[PLC Registers] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
