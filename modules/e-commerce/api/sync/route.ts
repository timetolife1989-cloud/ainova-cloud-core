import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { decryptValue } from '@/modules/e-commerce/adapters/types';
import { WooCommerceAdapter } from '@/modules/e-commerce/adapters/woocommerce';
import { ShopifyAdapter } from '@/modules/e-commerce/adapters/shopify';
import type { PlatformAdapter } from '@/modules/e-commerce/adapters/types';

interface ConnectionRow {
  id: number;
  platform: string;
  store_url: string;
  api_key_enc: string;
  api_secret_enc: string | null;
  sync_stock: boolean;
  sync_price: boolean;
  sync_orders: boolean;
  last_sync: string | null;
}

interface MapRow {
  id: number;
  local_product_id: number;
  remote_product_id: string;
  sync_stock: boolean;
  sync_price: boolean;
}

async function getAdapter(conn: ConnectionRow): Promise<PlatformAdapter> {
  const apiKey = await decryptValue(conn.api_key_enc);
  if (conn.platform === 'shopify') {
    return new ShopifyAdapter(conn.store_url, apiKey);
  }
  const apiSecret = conn.api_secret_enc ? await decryptValue(conn.api_secret_enc) : '';
  return new WooCommerceAdapter(conn.store_url, apiKey, apiSecret);
}

// POST /api/modules/e-commerce/sync — trigger manual sync for a connection
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'e-commerce.sync');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const connectionId = body?.connectionId;
  if (!connectionId || typeof connectionId !== 'number') {
    return Response.json({ error: 'connectionId required' }, { status: 400 });
  }

  const db = getDb();
  const conns = await db.query<ConnectionRow>(
    'SELECT * FROM ecommerce_connections WHERE id = @p0 AND is_active = 1',
    [{ name: 'p0', type: 'int', value: connectionId }]
  );

  if (conns.length === 0) {
    return Response.json({ error: 'Connection not found or inactive' }, { status: 404 });
  }

  const conn = conns[0];
  const adapter = await getAdapter(conn);

  const syncResult: { stockUpdated: number; priceUpdated: number; ordersImported: number; errors: string[] } = {
    stockUpdated: 0,
    priceUpdated: 0,
    ordersImported: 0,
    errors: [],
  };

  // ec-01: Sync price: push local price → remote
  if (conn.sync_price) {
    const priceMappings = await db.query<MapRow>(
      'SELECT * FROM ecommerce_product_map WHERE connection_id = @p0 AND sync_price = 1',
      [{ name: 'p0', type: 'int', value: conn.id }]
    );

    for (const m of priceMappings) {
      try {
        const priceRows = await db.query<{ unit_price: number; currency: string }>(
          'SELECT unit_price, ISNULL(currency, \'HUF\') AS currency FROM inventory_items WHERE id = @p0',
          [{ name: 'p0', type: 'int', value: m.local_product_id }]
        );
        if (priceRows[0]) {
          const ok = await adapter.updatePrice(m.remote_product_id, priceRows[0].unit_price);
          if (ok) {
            syncResult.priceUpdated++;
            await db.query(
              'UPDATE ecommerce_product_map SET last_synced = GETUTCDATE() WHERE id = @p0',
              [{ name: 'p0', type: 'int', value: m.id }]
            );
          }
        }
      } catch (err) {
        syncResult.errors.push(`Price sync failed for product ${m.remote_product_id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
  }

  // Sync stock: push local stock → remote
  if (conn.sync_stock) {
    const mappings = await db.query<MapRow>(
      'SELECT * FROM ecommerce_product_map WHERE connection_id = @p0 AND sync_stock = 1',
      [{ name: 'p0', type: 'int', value: conn.id }]
    );

    for (const m of mappings) {
      try {
        const stockRows = await db.query<{ current_stock: number }>(
          'SELECT current_stock FROM inventory_items WHERE id = @p0',
          [{ name: 'p0', type: 'int', value: m.local_product_id }]
        );
        const stock = stockRows[0]?.current_stock ?? 0;
        const ok = await adapter.updateStock(m.remote_product_id, stock);
        if (ok) {
          syncResult.stockUpdated++;
          await db.query(
            'UPDATE ecommerce_product_map SET last_synced = GETUTCDATE() WHERE id = @p0',
            [{ name: 'p0', type: 'int', value: m.id }]
          );
        }
      } catch (err) {
        syncResult.errors.push(`Stock sync failed for product ${m.remote_product_id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
  }

  // Sync orders: pull remote orders → local
  if (conn.sync_orders) {
    try {
      const since = conn.last_sync ? new Date(conn.last_sync) : undefined;
      const orders = await adapter.getNewOrders(since);

      for (const order of orders) {
        // Check if already imported
        const existing = await db.query<{ id: number }>(
          'SELECT id FROM ecommerce_orders WHERE connection_id = @p0 AND remote_order_id = @p1',
          [
            { name: 'p0', type: 'int', value: conn.id },
            { name: 'p1', type: 'nvarchar', value: order.remoteOrderId },
          ]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO ecommerce_orders (connection_id, remote_order_id, order_data, customer_name, total_amount, currency)
             VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
            [
              { name: 'p0', type: 'int', value: conn.id },
              { name: 'p1', type: 'nvarchar', value: order.remoteOrderId },
              { name: 'p2', type: 'nvarchar', value: JSON.stringify(order.rawData) },
              { name: 'p3', type: 'nvarchar', value: order.customerName },
              { name: 'p4', type: 'float', value: order.totalAmount },
              { name: 'p5', type: 'nvarchar', value: order.currency },
            ]
          );
          syncResult.ordersImported++;
        }
      }
    } catch (err) {
      syncResult.errors.push(`Order sync failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  // Update last_sync timestamp
  await db.query(
    'UPDATE ecommerce_connections SET last_sync = GETUTCDATE() WHERE id = @p0',
    [{ name: 'p0', type: 'int', value: conn.id }]
  );

  return Response.json({ ok: true, ...syncResult });
}
