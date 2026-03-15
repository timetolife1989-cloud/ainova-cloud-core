import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { decryptValue } from '@/modules/e-commerce/adapters/types';
import { WooCommerceAdapter } from '@/modules/e-commerce/adapters/woocommerce';
import { ShopifyAdapter } from '@/modules/e-commerce/adapters/shopify';
import type { PlatformAdapter } from '@/modules/e-commerce/adapters/types';
import { z } from 'zod';

interface ConnectionRow {
  id: number;
  platform: string;
  store_url: string;
  api_key_enc: string;
  api_secret_enc: string | null;
}

const UpdateStatusSchema = z.object({
  orderId: z.number(),
  status: z.enum(['processing', 'shipped', 'completed', 'cancelled', 'refunded']),
  trackingNumber: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
});

// PUT /api/modules/e-commerce/order-status — push status update to webshop
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'e-commerce.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { orderId, status, trackingNumber, note } = parsed.data;

  try {
    const db = getDb();

    // Get local order and its connection
    const orders = await db.query<{ id: number; connection_id: number; remote_order_id: string; status: string }>(
      'SELECT id, connection_id, remote_order_id, status FROM ecommerce_orders WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: orderId }]
    );

    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Get connection for adapter
    const conns = await db.query<ConnectionRow>(
      'SELECT id, platform, store_url, api_key_enc, api_secret_enc FROM ecommerce_connections WHERE id = @p0 AND is_active = 1',
      [{ name: 'p0', type: 'int', value: order.connection_id }]
    );

    if (conns.length === 0) {
      return Response.json({ error: 'Connection not found or inactive' }, { status: 404 });
    }

    const conn = conns[0];
    const apiKey = await decryptValue(conn.api_key_enc);

    let adapter: PlatformAdapter;
    if (conn.platform === 'shopify') {
      adapter = new ShopifyAdapter(conn.store_url, apiKey);
    } else {
      const apiSecret = conn.api_secret_enc ? await decryptValue(conn.api_secret_enc) : '';
      adapter = new WooCommerceAdapter(conn.store_url, apiKey, apiSecret);
    }

    // Push status to remote platform
    let remoteUpdated = false;
    try {
      if ('updateOrderStatus' in adapter && typeof (adapter as Record<string, unknown>).updateOrderStatus === 'function') {
        remoteUpdated = await (adapter as { updateOrderStatus: (id: string, status: string, tracking?: string) => Promise<boolean> })
          .updateOrderStatus(order.remote_order_id, status, trackingNumber);
      }
    } catch (err) {
      console.warn('[E-Commerce OrderStatus] Remote update failed:', err);
    }

    // Update local status regardless
    await db.execute(
      `UPDATE ecommerce_orders SET status = @p0, processed_at = GETUTCDATE() WHERE id = @p1`,
      [
        { name: 'p0', type: 'nvarchar', value: status },
        { name: 'p1', type: 'int', value: orderId },
      ]
    );

    return Response.json({
      ok: true,
      localUpdated: true,
      remoteUpdated,
      note: note ?? null,
    });
  } catch (err) {
    console.error('[E-Commerce OrderStatus] error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
