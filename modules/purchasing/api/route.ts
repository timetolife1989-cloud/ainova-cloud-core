import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface OrderRow {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier_name: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  total_net: number;
  total_gross: number;
  currency: string;
  notes: string | null;
  created_at: Date;
}

// GET — purchase orders list
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let sql = `SELECT o.id, o.order_number, o.supplier_id, s.name AS supplier_name,
                      o.status, o.order_date, o.expected_date,
                      o.total_net, o.total_gross, o.currency, o.notes, o.created_at
               FROM purchasing_orders o
               JOIN purchasing_suppliers s ON s.id = o.supplier_id
               WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (status) {
      sql += ` AND o.status = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: status });
      idx++;
    }

    sql += ' ORDER BY o.created_at DESC';

    const rows = await getDb().query<OrderRow>(sql, params);

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
