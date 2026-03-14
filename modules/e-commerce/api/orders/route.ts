import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface OrderRow {
  id: number;
  connection_id: number;
  remote_order_id: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  status: string;
  processed_at: string | null;
  created_at: string;
}

// GET /api/modules/e-commerce/orders — list synced orders
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'e-commerce.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  const status = request.nextUrl.searchParams.get('status');

  let sql = `SELECT id, connection_id, remote_order_id, customer_name, total_amount,
                    currency, status, processed_at, created_at
             FROM ecommerce_orders WHERE 1=1`;
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: string | number }> = [];
  let idx = 0;

  if (connectionId) {
    sql += ` AND connection_id = @p${idx}`;
    params.push({ name: `p${idx}`, type: 'int', value: parseInt(connectionId, 10) });
    idx++;
  }

  if (status) {
    sql += ` AND status = @p${idx}`;
    params.push({ name: `p${idx}`, type: 'nvarchar', value: status });
    idx++;
  }

  sql += ' ORDER BY created_at DESC';
  const rows = await db.query<OrderRow>(sql, params);

  return Response.json({ orders: rows });
}
