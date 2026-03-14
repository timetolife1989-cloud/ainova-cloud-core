import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

// GET — low stock items that need reordering
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<{
      id: number; sku: string; item_name: string; current_qty: number;
      min_qty: number; unit_name: string | null; category: string | null;
    }>(
      `SELECT id, sku, item_name, current_qty, min_qty, unit_name, category
       FROM inventory_items
       WHERE is_active = 1 AND current_qty <= min_qty AND min_qty > 0
       ORDER BY (current_qty - min_qty) ASC`
    );

    return Response.json({
      suggestions: rows.map(r => ({
        productId: r.id,
        sku: r.sku,
        itemName: r.item_name,
        currentQty: r.current_qty,
        minQty: r.min_qty,
        unitName: r.unit_name,
        category: r.category,
        deficit: r.min_qty - r.current_qty,
      })),
    });
  } catch (err) {
    console.error('[Purchasing API] GET suggestions error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
