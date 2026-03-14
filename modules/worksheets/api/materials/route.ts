import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const materialSchema = z.object({
  orderId: z.number().int(),
  productId: z.number().int().optional(),
  productName: z.string().min(1).max(300),
  quantity: z.number().min(0.001),
  unit: z.string().max(20).optional(),
  unitPrice: z.number().min(0),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = materialSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const db = await getDb();

  // Check order exists
  const orderRows = await db.query<{ id: number }>(
    `SELECT id FROM worksheets_orders WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: d.orderId }]
  );
  if (orderRows.length === 0) return Response.json({ error: 'Order not found' }, { status: 404 });

  // Insert material line
  await db.execute(
    `INSERT INTO worksheets_materials (order_id, product_id, product_name, quantity, unit, unit_price)
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: d.orderId },
      { name: 'p1', type: 'int', value: d.productId ?? null },
      { name: 'p2', type: 'nvarchar', value: d.productName },
      { name: 'p3', type: 'float', value: d.quantity },
      { name: 'p4', type: 'nvarchar', value: d.unit ?? 'db' },
      { name: 'p5', type: 'float', value: d.unitPrice },
    ]
  );

  // Deduct from inventory if product_id supplied and setting enabled
  if (d.productId) {
    try {
      const settingRows = await db.query<{ value: string }>(
        `SELECT value FROM core_settings WHERE [key] = 'worksheets_auto_deduct_inventory'`, []
      );
      const autoDeduct = settingRows.length === 0 || settingRows[0].value !== 'false';

      if (autoDeduct) {
        // Deduct stock
        await db.execute(
          `UPDATE inventory_items SET current_qty = current_qty - @p0, updated_at = GETUTCDATE() WHERE id = @p1`,
          [
            { name: 'p0', type: 'float', value: d.quantity },
            { name: 'p1', type: 'int', value: d.productId },
          ]
        );
        // Record inventory movement
        await db.execute(
          `INSERT INTO inventory_movements (item_id, type, quantity, reference, notes, created_by)
           VALUES (@p0, 'out', @p1, @p2, @p3, @p4)`,
          [
            { name: 'p0', type: 'int', value: d.productId },
            { name: 'p1', type: 'float', value: d.quantity },
            { name: 'p2', type: 'nvarchar', value: `WS-${d.orderId}` },
            { name: 'p3', type: 'nvarchar', value: `Worksheets anyagfelhasználás: ${d.productName}` },
            { name: 'p4', type: 'int', value: auth.userId },
          ]
        );
      }
    } catch { /* inventory tables may not exist */ }
  }

  // Recalculate totals
  await db.execute(
    `UPDATE worksheets_orders SET
       total_materials = ISNULL((SELECT SUM(quantity * unit_price) FROM worksheets_materials WHERE order_id = @p0), 0),
       total_cost = ISNULL((SELECT SUM(hours * rate) FROM worksheets_labor WHERE order_id = @p0), 0)
                   + ISNULL((SELECT SUM(quantity * unit_price) FROM worksheets_materials WHERE order_id = @p0), 0),
       updated_at = GETUTCDATE()
     WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: d.orderId }]
  );

  const lineTotal = d.quantity * d.unitPrice;
  return Response.json({ total: lineTotal }, { status: 201 });
}
