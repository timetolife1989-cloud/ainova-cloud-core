import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

// GET — search products from inventory for POS
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return Response.json({ products: [] });
  }

  try {
    const rows = await getDb().query<{
      id: number; name: string; sku: string | null; barcode: string | null;
      category: string | null; unit_name: string; current_qty: number;
      unit_price: number | null;
    }>(
      `SELECT TOP 20 id, name, sku, barcode, category, unit_name, current_qty, unit_price
       FROM inventory_items
       WHERE is_active = 1
         AND (name LIKE @p0 OR sku LIKE @p0 OR barcode LIKE @p0)
       ORDER BY name`,
      [{ name: 'p0', type: 'nvarchar', value: `%${q}%` }]
    );

    return Response.json({
      products: rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        barcode: r.barcode,
        category: r.category,
        unit: r.unit_name,
        stock: r.current_qty,
        price: r.unit_price ?? 0,
      })),
    });
  } catch (err) {
    console.error('[POS API] product-search error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
