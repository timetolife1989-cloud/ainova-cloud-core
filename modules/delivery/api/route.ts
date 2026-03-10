import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface ShipmentRow {
  id: number;
  shipment_date: Date;
  customer_name: string;
  customer_code: string | null;
  order_number: string | null;
  quantity: number;
  weight: number | null;
  value: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'delivery.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const customerName = searchParams.get('customerName');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 50;

  try {
    let sql = `SELECT id, shipment_date, customer_name, customer_code, order_number, quantity, weight, value, status, notes, created_by, created_at
               FROM delivery_shipments WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (status) {
      sql += ` AND status = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: status });
      paramIdx++;
    }
    if (customerName) {
      sql += ` AND customer_name LIKE @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: `%${customerName}%` });
      paramIdx++;
    }
    if (dateFrom) {
      sql += ` AND shipment_date >= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateFrom });
      paramIdx++;
    }
    if (dateTo) {
      sql += ` AND shipment_date <= @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: dateTo });
      paramIdx++;
    }

    sql += ` ORDER BY shipment_date DESC OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

    const rows = await getDb().query<ShipmentRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      shipmentDate: String(r.shipment_date).split('T')[0],
      customerName: r.customer_name,
      customerCode: r.customer_code,
      orderNumber: r.order_number,
      quantity: r.quantity,
      weight: r.weight,
      value: r.value,
      status: r.status,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: String(r.created_at),
    }));

    return Response.json({ items, page, pageSize });
  } catch (err) {
    console.error('[Delivery API] GET error:', err);
    return Response.json({ error: 'Hiba az adatok lekérésekor' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  shipmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerName: z.string().min(1).max(200),
  customerCode: z.string().max(50).optional(),
  orderNumber: z.string().max(100).optional(),
  quantity: z.number().min(0),
  weight: z.number().min(0).optional(),
  value: z.number().min(0).optional(),
  status: z.enum(['pending', 'shipped', 'delivered', 'returned']).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'delivery.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { shipmentDate, customerName, customerCode, orderNumber, quantity, weight, value, status, notes } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO delivery_shipments (shipment_date, customer_name, customer_code, order_number, quantity, weight, value, status, notes, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`,
      [
        { name: 'p0', type: 'nvarchar', value: shipmentDate },
        { name: 'p1', type: 'nvarchar', value: customerName },
        { name: 'p2', type: 'nvarchar', value: customerCode ?? null },
        { name: 'p3', type: 'nvarchar', value: orderNumber ?? null },
        { name: 'p4', type: 'nvarchar', value: String(quantity) },
        { name: 'p5', type: 'nvarchar', value: weight !== undefined ? String(weight) : null },
        { name: 'p6', type: 'nvarchar', value: value !== undefined ? String(value) : null },
        { name: 'p7', type: 'nvarchar', value: status ?? 'pending' },
        { name: 'p8', type: 'nvarchar', value: notes ?? null },
        { name: 'p9', type: 'nvarchar', value: auth.username },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Delivery API] POST error:', err);
    return Response.json({ error: 'Hiba a létrehozáskor' }, { status: 500 });
  }
}
