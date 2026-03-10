import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface DeviceRow {
  id: number;
  name: string;
  protocol: string;
  ip_address: string;
  port: number;
  rack: number | null;
  slot: number | null;
  is_active: number;
  last_seen_at: string | null;
  created_at: string;
}

const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(200),
  protocol: z.string().default('s7'),
  ipAddress: z.string().min(1),
  port: z.number().int().default(102),
  rack: z.number().int().nullable().default(0),
  slot: z.number().int().nullable().default(1),
});

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'plc-connector.view');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<DeviceRow>(
    'SELECT id, name, protocol, ip_address, port, rack, slot, is_active, last_seen_at, created_at FROM mod_plc_devices ORDER BY name',
    []
  );

  return Response.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      protocol: r.protocol,
      ipAddress: r.ip_address,
      port: r.port,
      rack: r.rack,
      slot: r.slot,
      isActive: !!r.is_active,
      lastSeenAt: r.last_seen_at,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'plc-connector.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = CreateDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, protocol, ipAddress, port, rack, slot } = parsed.data;

  const result = await getDb().query<{ id: number }>(
    `INSERT INTO mod_plc_devices (name, protocol, ip_address, port, rack, slot)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'nvarchar', value: name },
      { name: 'p1', type: 'nvarchar', value: protocol },
      { name: 'p2', type: 'nvarchar', value: ipAddress },
      { name: 'p3', type: 'int', value: port },
      { name: 'p4', type: 'int', value: rack ?? 0 },
      { name: 'p5', type: 'int', value: slot ?? 1 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
