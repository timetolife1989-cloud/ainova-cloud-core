import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import { encryptValue } from '@/modules/e-commerce/adapters/types';

interface ConnectionRow {
  id: number;
  platform: string;
  store_name: string;
  store_url: string;
  is_active: boolean;
  last_sync: string | null;
  sync_interval: number;
  sync_stock: boolean;
  sync_price: boolean;
  sync_orders: boolean;
  created_at: string;
}

// GET /api/modules/e-commerce/connections — list connections
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'e-commerce.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const rows = await db.query<ConnectionRow>(
    `SELECT id, platform, store_name, store_url, is_active, last_sync,
            sync_interval, sync_stock, sync_price, sync_orders, created_at
     FROM ecommerce_connections ORDER BY created_at DESC`
  );

  return Response.json({ connections: rows });
}

const ConnectionSchema = z.object({
  platform: z.enum(['woocommerce', 'shopify']),
  storeName: z.string().min(1).max(200),
  storeUrl: z.string().url().max(500),
  apiKey: z.string().min(1).max(500),
  apiSecret: z.string().max(500).optional(),
  syncInterval: z.number().int().min(5).max(1440).optional(),
  syncStock: z.boolean().optional(),
  syncPrice: z.boolean().optional(),
  syncOrders: z.boolean().optional(),
});

// POST /api/modules/e-commerce/connections — create connection
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'e-commerce.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = ConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  // Encrypt credentials
  const encKey = await encryptValue(d.apiKey);
  const encSecret = d.apiSecret ? await encryptValue(d.apiSecret) : '';

  const result = await db.query<{ id: number }>(
    `INSERT INTO ecommerce_connections (platform, store_name, store_url, api_key_enc, api_secret_enc, sync_interval, sync_stock, sync_price, sync_orders)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.platform },
      { name: 'p1', type: 'nvarchar', value: d.storeName },
      { name: 'p2', type: 'nvarchar', value: d.storeUrl },
      { name: 'p3', type: 'nvarchar', value: encKey },
      { name: 'p4', type: 'nvarchar', value: encSecret },
      { name: 'p5', type: 'int', value: d.syncInterval ?? 15 },
      { name: 'p6', type: 'int', value: d.syncStock !== false ? 1 : 0 },
      { name: 'p7', type: 'int', value: d.syncPrice !== false ? 1 : 0 },
      { name: 'p8', type: 'int', value: d.syncOrders !== false ? 1 : 0 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// PUT /api/modules/e-commerce/connections — toggle connection active/inactive
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'e-commerce.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const updateSchema = z.object({
    id: z.number().int().positive(),
    isActive: z.boolean(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb();
  await db.query(
    'UPDATE ecommerce_connections SET is_active = @p0 WHERE id = @p1',
    [
      { name: 'p0', type: 'int', value: parsed.data.isActive ? 1 : 0 },
      { name: 'p1', type: 'int', value: parsed.data.id },
    ]
  );

  return Response.json({ ok: true });
}
