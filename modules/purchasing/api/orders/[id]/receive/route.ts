import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ReceiveSchema = z.object({
  items: z.array(z.object({
    itemId: z.number().int().positive(),
    receivedQty: z.number().positive(),
  })).min(1),
});

// POST — receive order items → update stock
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = ReceiveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const db = getDb();

  try {
    // Verify order exists and is in receivable state
    const orders = await db.query<{ id: number; status: string; order_number: string }>(
      'SELECT id, status, order_number FROM purchasing_orders WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    if (orders.length === 0) return Response.json({ error: 'error.not_found' }, { status: 404 });
    const order = orders[0];

    if (!['ordered', 'shipped'].includes(order.status)) {
      return Response.json({ error: 'purchasing.error.cannot_receive' }, { status: 400 });
    }

    // Process each received item
    for (const received of parsed.data.items) {
      // Update received_qty on order item
      await db.execute(
        `UPDATE purchasing_order_items
         SET received_qty = received_qty + @p0
         WHERE id = @p1 AND order_id = @p2`,
        [
          { name: 'p0', type: 'nvarchar', value: String(received.receivedQty) },
          { name: 'p1', type: 'int', value: received.itemId },
          { name: 'p2', type: 'int', value: orderId },
        ]
      );

      // Get the product_id for this order item
      const oiRows = await db.query<{ product_id: number | null }>(
        'SELECT product_id FROM purchasing_order_items WHERE id = @p0',
        [{ name: 'p0', type: 'int', value: received.itemId }]
      );

      const productId = oiRows[0]?.product_id;
      if (productId) {
        // Create inventory movement (in)
        await db.execute(
          `INSERT INTO inventory_movements (item_id, movement_type, quantity, reference, notes, created_by)
           VALUES (@p0, 'in', @p1, @p2, @p3, @p4)`,
          [
            { name: 'p0', type: 'int', value: productId },
            { name: 'p1', type: 'nvarchar', value: String(received.receivedQty) },
            { name: 'p2', type: 'nvarchar', value: order.order_number },
            { name: 'p3', type: 'nvarchar', value: 'Purchase order receiving' },
            { name: 'p4', type: 'int', value: auth.userId },
          ]
        );

        // Update inventory stock
        await db.execute(
          'UPDATE inventory_items SET current_qty = current_qty + @p0 WHERE id = @p1',
          [
            { name: 'p0', type: 'nvarchar', value: String(received.receivedQty) },
            { name: 'p1', type: 'int', value: productId },
          ]
        );
      }
    }

    // Update order status to received
    await db.execute(
      "UPDATE purchasing_orders SET status = 'received', received_date = GETDATE(), updated_at = GETDATE() WHERE id = @p0",
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Purchasing API] POST receive error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
