import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const laborSchema = z.object({
  orderId: z.number().int(),
  workerId: z.number().int().optional(),
  description: z.string().max(300).optional(),
  hours: z.number().min(0.1).max(24),
  rate: z.number().min(0).optional(),
  workDate: z.string().optional(),
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

  const parsed = laborSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const db = await getDb();

  // Get labor rate from order if not provided
  let rate = d.rate;
  if (rate === undefined) {
    const rows = await db.query<{ labor_rate: number }>(
      `SELECT labor_rate FROM worksheets_orders WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: d.orderId }]
    );
    if (rows.length === 0) return Response.json({ error: 'Order not found' }, { status: 404 });
    rate = rows[0].labor_rate;
  }

  const lineTotal = d.hours * rate;

  await db.execute(
    `INSERT INTO worksheets_labor (order_id, worker_id, description, hours, rate, work_date)
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: d.orderId },
      { name: 'p1', type: 'int', value: d.workerId ?? auth.userId },
      { name: 'p2', type: 'nvarchar', value: d.description ?? null },
      { name: 'p3', type: 'float', value: d.hours },
      { name: 'p4', type: 'float', value: rate },
      { name: 'p5', type: 'nvarchar', value: d.workDate ?? new Date().toISOString().slice(0, 10) },
    ]
  );

  // Recalculate totals
  await db.execute(
    `UPDATE worksheets_orders SET
       actual_hours = ISNULL((SELECT SUM(hours) FROM worksheets_labor WHERE order_id = @p0), 0),
       total_labor = ISNULL((SELECT SUM(hours * rate) FROM worksheets_labor WHERE order_id = @p0), 0),
       total_cost = ISNULL((SELECT SUM(hours * rate) FROM worksheets_labor WHERE order_id = @p0), 0)
                   + ISNULL((SELECT SUM(quantity * unit_price) FROM worksheets_materials WHERE order_id = @p0), 0),
       updated_at = GETUTCDATE()
     WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: d.orderId }]
  );

  return Response.json({ total: lineTotal }, { status: 201 });
}
