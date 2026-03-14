import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'worksheets.sign');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  let body: { signature: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.signature || typeof body.signature !== 'string' || !body.signature.startsWith('data:image/')) {
    return Response.json({ error: 'Invalid signature format' }, { status: 400 });
  }

  // Limit signature size (max ~500KB base64)
  if (body.signature.length > 700000) {
    return Response.json({ error: 'Signature too large' }, { status: 400 });
  }

  const db = await getDb();

  const result = await db.execute(
    `UPDATE worksheets_orders SET customer_signature = @p0, updated_at = GETUTCDATE() WHERE id = @p1`,
    [
      { name: 'p0', type: 'nvarchar', value: body.signature },
      { name: 'p1', type: 'int', value: orderId },
    ]
  );

  if (result.rowsAffected === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ success: true });
}
