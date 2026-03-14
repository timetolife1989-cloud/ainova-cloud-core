import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — single order + items
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  try {
    const db = getDb();

    const orders = await db.query<{
      id: number; order_number: string; supplier_id: number; supplier_name: string;
      status: string; order_date: string; expected_date: string | null; received_date: string | null;
      total_net: number; total_gross: number; currency: string; notes: string | null;
      created_by: number | null; approved_by: number | null; created_at: Date;
    }>(
      `SELECT o.*, s.name AS supplier_name
       FROM purchasing_orders o
       JOIN purchasing_suppliers s ON s.id = o.supplier_id
       WHERE o.id = @p0`,
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    if (orders.length === 0) return Response.json({ error: 'error.not_found' }, { status: 404 });

    const items = await db.query<{
      id: number; product_id: number | null; description: string | null;
      quantity: number; unit: string; unit_price: number; vat_rate: number;
      line_total_net: number; received_qty: number; item_name: string | null;
    }>(
      `SELECT i.*, inv.item_name
       FROM purchasing_order_items i
       LEFT JOIN inventory_items inv ON inv.id = i.product_id
       WHERE i.order_id = @p0
       ORDER BY i.id`,
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    const o = orders[0];
    return Response.json({
      order: {
        id: o.id, orderNumber: o.order_number, supplierId: o.supplier_id,
        supplierName: o.supplier_name, status: o.status, orderDate: o.order_date,
        expectedDate: o.expected_date, receivedDate: o.received_date,
        totalNet: o.total_net, totalGross: o.total_gross, currency: o.currency,
        notes: o.notes, createdAt: String(o.created_at),
      },
      items: items.map(i => ({
        id: i.id, productId: i.product_id, productName: i.item_name,
        description: i.description, quantity: i.quantity, unit: i.unit,
        unitPrice: i.unit_price, vatRate: i.vat_rate, lineTotalNet: i.line_total_net,
        receivedQty: i.received_qty,
      })),
    });
  } catch (err) {
    console.error('[Purchasing API] GET order error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const UpdateOrderSchema = z.object({
  expectedDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['draft', 'ordered', 'shipped', 'cancelled']).optional(),
});

// PUT — update order (only draft or basic fields)
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = UpdateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const setClauses: string[] = [];
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
  let idx = 0;

  if (d.expectedDate !== undefined) { setClauses.push(`expected_date = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.expectedDate }); idx++; }
  if (d.notes !== undefined) { setClauses.push(`notes = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.notes }); idx++; }
  if (d.status !== undefined) { setClauses.push(`status = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.status }); idx++; }

  if (setClauses.length === 0) return Response.json({ error: 'error.validation' }, { status: 400 });

  setClauses.push('updated_at = GETDATE()');

  try {
    params.push({ name: `p${idx}`, type: 'int', value: orderId });
    await getDb().execute(
      `UPDATE purchasing_orders SET ${setClauses.join(', ')} WHERE id = @p${idx}`,
      params
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Purchasing API] PUT order error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
