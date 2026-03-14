import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface MapRow {
  id: number;
  connection_id: number;
  local_product_id: number;
  remote_product_id: string;
  remote_sku: string | null;
  sync_stock: boolean;
  sync_price: boolean;
  last_synced: string | null;
}

// GET /api/modules/e-commerce/products?connectionId=X — list product mappings
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'e-commerce.view');
  if (!auth.valid) return auth.response;

  const connectionId = request.nextUrl.searchParams.get('connectionId');
  const db = getDb();

  let sql = `SELECT pm.*, ii.name AS local_name, ii.current_stock AS local_stock
             FROM ecommerce_product_map pm
             LEFT JOIN inventory_items ii ON ii.id = pm.local_product_id`;
  const params: Array<{ name: string; type: 'int'; value: number }> = [];

  if (connectionId) {
    sql += ' WHERE pm.connection_id = @p0';
    params.push({ name: 'p0', type: 'int', value: parseInt(connectionId, 10) });
  }

  sql += ' ORDER BY pm.id';
  const rows = await db.query<MapRow & { local_name: string | null; local_stock: number | null }>(sql, params);

  return Response.json({ products: rows });
}

const MapSchema = z.object({
  connectionId: z.number().int().positive(),
  localProductId: z.number().int().positive(),
  remoteProductId: z.string().min(1).max(100),
  remoteSku: z.string().max(100).optional(),
  syncStock: z.boolean().optional(),
  syncPrice: z.boolean().optional(),
});

// POST /api/modules/e-commerce/products — map local product to remote
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'e-commerce.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = MapSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const result = await db.query<{ id: number }>(
    `INSERT INTO ecommerce_product_map (connection_id, local_product_id, remote_product_id, remote_sku, sync_stock, sync_price)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: d.connectionId },
      { name: 'p1', type: 'int', value: d.localProductId },
      { name: 'p2', type: 'nvarchar', value: d.remoteProductId },
      { name: 'p3', type: 'nvarchar', value: d.remoteSku ?? '' },
      { name: 'p4', type: 'int', value: d.syncStock !== false ? 1 : 0 },
      { name: 'p5', type: 'int', value: d.syncPrice !== false ? 1 : 0 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// DELETE /api/modules/e-commerce/products — remove mapping
export async function DELETE(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'e-commerce.edit');
  if (!auth.valid) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const db = getDb();
  await db.query('DELETE FROM ecommerce_product_map WHERE id = @p0', [
    { name: 'p0', type: 'int', value: parseInt(id, 10) },
  ]);

  return Response.json({ ok: true });
}
