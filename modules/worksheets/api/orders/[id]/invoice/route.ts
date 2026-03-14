import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const db = await getDb();

  // Load order
  const orders = await db.query<Record<string, unknown>>(
    `SELECT * FROM worksheets_orders WHERE id = @p0`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );
  if (orders.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const order = orders[0];

  if (order.status !== 'completed') {
    return Response.json({ error: 'Order must be completed before invoicing' }, { status: 400 });
  }
  if (order.invoice_id) {
    return Response.json({ error: 'Invoice already generated' }, { status: 400 });
  }

  // Load labor and materials
  const labor = await db.query<{ description: string | null; hours: number; rate: number; total: number }>(
    `SELECT description, hours, rate, (hours * rate) AS total FROM worksheets_labor WHERE order_id = @p0`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );
  const materials = await db.query<{ product_name: string; quantity: number; unit: string; unit_price: number; total: number }>(
    `SELECT product_name, quantity, unit, unit_price, (quantity * unit_price) AS total FROM worksheets_materials WHERE order_id = @p0`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );

  // Build invoice items
  const items: { description: string; quantity: number; unitPrice: number; vatRate: number }[] = [];

  for (const l of labor) {
    items.push({
      description: `Munkadíj: ${l.description ?? 'Munkaóra'}, ${l.hours} óra × ${l.rate} Ft`,
      quantity: 1,
      unitPrice: l.total,
      vatRate: 27,
    });
  }

  for (const m of materials) {
    items.push({
      description: `Anyag: ${m.product_name}, ${m.quantity} ${m.unit} × ${m.unit_price} Ft`,
      quantity: 1,
      unitPrice: m.total,
      vatRate: 27,
    });
  }

  if (items.length === 0) {
    return Response.json({ error: 'No items to invoice' }, { status: 400 });
  }

  // Call invoicing module API internally
  try {
    const invoicePayload = {
      customerName: String(order.customer_name ?? ''),
      customerTaxNumber: '',
      customerAddress: '',
      items,
      notes: `Munkalap: ${order.order_number}`,
    };

    // Use internal fetch to invoicing module
    const baseUrl = request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin;

    const invRes = await fetch(`${baseUrl}/api/modules/invoicing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') ?? '',
        'x-csrf-token': request.headers.get('x-csrf-token') ?? '',
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!invRes.ok) {
      const errData = await invRes.json().catch(() => ({}));
      return Response.json({ error: 'Invoice creation failed', detail: errData }, { status: 500 });
    }

    const invData = await invRes.json() as { invoiceId?: number; invoiceNumber?: string };

    // Update order with invoice reference
    await db.execute(
      `UPDATE worksheets_orders SET invoice_id = @p0, status = 'invoiced', updated_at = GETUTCDATE() WHERE id = @p1`,
      [
        { name: 'p0', type: 'int', value: invData.invoiceId },
        { name: 'p1', type: 'int', value: orderId },
      ]
    );

    return Response.json({
      invoiceId: invData.invoiceId,
      invoiceNumber: invData.invoiceNumber,
    });
  } catch (err) {
    return Response.json({ error: 'Invoicing module unavailable', detail: String(err) }, { status: 500 });
  }
}
