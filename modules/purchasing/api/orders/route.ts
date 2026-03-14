import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — orders list (aliased from parent route for sub-path routing)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const supplierId = searchParams.get('supplierId');

  try {
    let sql = `SELECT o.id, o.order_number, o.supplier_id, s.name AS supplier_name,
                      o.status, o.order_date, o.expected_date,
                      o.total_net, o.total_gross, o.currency, o.notes, o.created_at
               FROM purchasing_orders o
               JOIN purchasing_suppliers s ON s.id = o.supplier_id
               WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
    let idx = 0;

    if (status) {
      sql += ` AND o.status = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: status });
      idx++;
    }
    if (supplierId) {
      sql += ` AND o.supplier_id = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'int', value: parseInt(supplierId, 10) });
      idx++;
    }

    sql += ' ORDER BY o.created_at DESC';

    const rows = await getDb().query<{
      id: number; order_number: string; supplier_id: number; supplier_name: string;
      status: string; order_date: string; expected_date: string | null;
      total_net: number; total_gross: number; currency: string; notes: string | null; created_at: Date;
    }>(sql, params);

    return Response.json({
      orders: rows.map(r => ({
        id: r.id,
        orderNumber: r.order_number,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        status: r.status,
        orderDate: r.order_date,
        expectedDate: r.expected_date,
        totalNet: r.total_net,
        totalGross: r.total_gross,
        currency: r.currency,
        notes: r.notes,
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[Purchasing API] GET orders error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const OrderItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  description: z.string().max(300).optional(),
  quantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100).optional(),
});

const CreateOrderSchema = z.object({
  supplierId: z.number().int().positive(),
  expectedDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(OrderItemSchema).min(1),
});

// POST — create purchase order with items
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  try {
    // Generate order number
    const countRows = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM purchasing_orders WHERE order_number LIKE @p0",
      [{ name: 'p0', type: 'nvarchar', value: `PO-${new Date().getFullYear()}-%` }]
    );
    const nextNum = (countRows[0]?.cnt ?? 0) + 1;
    const orderNumber = `PO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

    // Calculate totals
    let totalNet = 0;
    let totalGross = 0;
    for (const item of d.items) {
      const lineNet = item.quantity * item.unitPrice;
      const lineGross = lineNet * (1 + (item.vatRate ?? 27) / 100);
      totalNet += lineNet;
      totalGross += lineGross;
    }

    // Insert order
    const orderResult = await db.query<{ id: number }>(
      `INSERT INTO purchasing_orders (order_number, supplier_id, status, expected_date, total_net, total_gross, currency, notes, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, 'draft', @p2, @p3, @p4, @p5, @p6, @p7)`,
      [
        { name: 'p0', type: 'nvarchar', value: orderNumber },
        { name: 'p1', type: 'int', value: d.supplierId },
        { name: 'p2', type: 'nvarchar', value: d.expectedDate ?? null },
        { name: 'p3', type: 'nvarchar', value: String(Math.round(totalNet * 100) / 100) },
        { name: 'p4', type: 'nvarchar', value: String(Math.round(totalGross * 100) / 100) },
        { name: 'p5', type: 'nvarchar', value: d.currency ?? 'HUF' },
        { name: 'p6', type: 'nvarchar', value: d.notes ?? null },
        { name: 'p7', type: 'int', value: auth.userId },
      ]
    );

    const orderId = orderResult[0]?.id;

    // Insert items
    for (const item of d.items) {
      const lineNet = Math.round(item.quantity * item.unitPrice * 100) / 100;
      await db.execute(
        `INSERT INTO purchasing_order_items (order_id, product_id, description, quantity, unit, unit_price, vat_rate, line_total_net)
         VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
        [
          { name: 'p0', type: 'int', value: orderId },
          { name: 'p1', type: 'int', value: item.productId ?? null },
          { name: 'p2', type: 'nvarchar', value: item.description ?? null },
          { name: 'p3', type: 'nvarchar', value: String(item.quantity) },
          { name: 'p4', type: 'nvarchar', value: item.unit ?? 'db' },
          { name: 'p5', type: 'nvarchar', value: String(item.unitPrice) },
          { name: 'p6', type: 'nvarchar', value: String(item.vatRate ?? 27) },
          { name: 'p7', type: 'nvarchar', value: String(lineNet) },
        ]
      );
    }

    return Response.json({ ok: true, id: orderId, orderNumber }, { status: 201 });
  } catch (err) {
    console.error('[Purchasing API] POST order error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
