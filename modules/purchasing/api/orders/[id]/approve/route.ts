import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST — approve a draft order → status becomes 'ordered'
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.approve');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const db = getDb();

  try {
    const orders = await db.query<{ id: number; status: string }>(
      'SELECT id, status FROM purchasing_orders WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    if (orders.length === 0) return Response.json({ error: 'error.not_found' }, { status: 404 });

    if (orders[0].status !== 'draft') {
      return Response.json({ error: 'purchasing.error.only_draft_approvable' }, { status: 400 });
    }

    await db.execute(
      "UPDATE purchasing_orders SET status = 'ordered', approved_by = @p0, order_date = GETDATE(), updated_at = GETDATE() WHERE id = @p1",
      [
        { name: 'p0', type: 'int', value: auth.userId },
        { name: 'p1', type: 'int', value: orderId },
      ]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Purchasing API] POST approve error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
