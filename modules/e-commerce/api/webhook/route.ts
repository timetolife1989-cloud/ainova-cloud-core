import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// POST /api/modules/e-commerce/webhook
// Receives real-time order notifications from external platforms (Shopify, WooCommerce)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  const platform = searchParams.get('platform');

  if (!connectionId || !platform) {
    return Response.json({ error: 'connectionId and platform are required' }, { status: 400 });
  }

  try {
    const db = getDb();

    // Verify connection exists and is active
    const conn = await db.query<{ id: number; api_secret_enc: string | null }>(
      'SELECT id, api_secret_enc FROM ecommerce_connections WHERE id = @p0 AND is_active = 1',
      [{ name: 'p0', type: 'int', value: parseInt(connectionId) }]
    );

    if (conn.length === 0) {
      return Response.json({ error: 'Connection not found or inactive' }, { status: 404 });
    }

    // Verify webhook signature if secret is configured
    const secret = conn[0].api_secret_enc;
    if (secret) {
      const signature = request.headers.get('x-webhook-signature')
        || request.headers.get('x-wc-webhook-signature')
        || request.headers.get('x-shopify-hmac-sha256');

      if (!signature) {
        return Response.json({ error: 'Missing webhook signature' }, { status: 401 });
      }

      const rawBody = await request.clone().text();
      const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

      if (signature !== expectedSig) {
        console.warn('[E-Commerce Webhook] Invalid signature for connection', connectionId);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await request.json() as Record<string, unknown>;

    // Extract order data based on platform
    let remoteOrderId: string;
    let customerName: string | null = null;
    let totalAmount: number | null = null;
    let currency = 'HUF';

    if (platform === 'shopify') {
      remoteOrderId = String(body.id ?? body.order_number ?? '');
      const customer = body.customer as Record<string, unknown> | undefined;
      customerName = customer ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() : null;
      totalAmount = body.total_price ? Number(body.total_price) : null;
      currency = String(body.currency ?? 'HUF');
    } else if (platform === 'woocommerce') {
      remoteOrderId = String(body.id ?? body.number ?? '');
      const billing = body.billing as Record<string, unknown> | undefined;
      customerName = billing ? `${billing.first_name ?? ''} ${billing.last_name ?? ''}`.trim() : null;
      totalAmount = body.total ? Number(body.total) : null;
      currency = String(body.currency ?? 'HUF');
    } else {
      remoteOrderId = String(body.id ?? body.order_id ?? crypto.randomUUID());
      customerName = body.customer_name ? String(body.customer_name) : null;
      totalAmount = body.total ? Number(body.total) : null;
    }

    if (!remoteOrderId) {
      return Response.json({ error: 'Could not extract order ID from payload' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.query<{ id: number }>(
      'SELECT id FROM ecommerce_orders WHERE connection_id = @p0 AND remote_order_id = @p1',
      [
        { name: 'p0', type: 'int', value: parseInt(connectionId) },
        { name: 'p1', type: 'nvarchar', value: remoteOrderId },
      ]
    );

    if (existing.length > 0) {
      // Update existing order
      await db.execute(
        `UPDATE ecommerce_orders SET order_data = @p0, customer_name = @p1, total_amount = @p2, currency = @p3
         WHERE connection_id = @p4 AND remote_order_id = @p5`,
        [
          { name: 'p0', type: 'nvarchar', value: JSON.stringify(body) },
          { name: 'p1', type: 'nvarchar', value: customerName },
          { name: 'p2', type: 'nvarchar', value: totalAmount },
          { name: 'p3', type: 'nvarchar', value: currency },
          { name: 'p4', type: 'int', value: parseInt(connectionId) },
          { name: 'p5', type: 'nvarchar', value: remoteOrderId },
        ]
      );
      return Response.json({ ok: true, action: 'updated', remoteOrderId });
    }

    // Insert new order
    const result = await db.query<{ id: number }>(
      `INSERT INTO ecommerce_orders (connection_id, remote_order_id, order_data, customer_name, total_amount, currency, status)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, 'new')`,
      [
        { name: 'p0', type: 'int', value: parseInt(connectionId) },
        { name: 'p1', type: 'nvarchar', value: remoteOrderId },
        { name: 'p2', type: 'nvarchar', value: JSON.stringify(body) },
        { name: 'p3', type: 'nvarchar', value: customerName },
        { name: 'p4', type: 'nvarchar', value: totalAmount },
        { name: 'p5', type: 'nvarchar', value: currency },
      ]
    );

    console.log(`[E-Commerce Webhook] New order ${remoteOrderId} from ${platform}, id: ${result[0]?.id}`);
    return Response.json({ ok: true, action: 'created', id: result[0]?.id, remoteOrderId }, { status: 201 });
  } catch (err) {
    console.error('[E-Commerce Webhook] error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
