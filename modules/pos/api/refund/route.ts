import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const RefundSchema = z.object({
  originalTransactionId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

// POST — process a refund
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.refund');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = RefundSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { originalTransactionId, reason } = parsed.data;
  const db = getDb();

  try {
    // Fetch original transaction
    const origRows = await db.query<{
      id: number; receipt_number: string; payment_method: string;
      subtotal: number; discount_amount: number; discount_type: string | null;
      total_net: number; total_vat: number; total_gross: number;
      is_refund: boolean;
    }>(
      `SELECT id, receipt_number, payment_method, subtotal, discount_amount, discount_type,
              total_net, total_vat, total_gross, is_refund
       FROM pos_transactions WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: originalTransactionId }]
    );

    if (!origRows.length) {
      return Response.json({ error: 'Original transaction not found' }, { status: 404 });
    }

    const orig = origRows[0];
    if (orig.is_refund) {
      return Response.json({ error: 'Cannot refund a refund transaction' }, { status: 400 });
    }

    // Check if already refunded
    const refundCheck = await db.query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM pos_transactions WHERE original_id = @p0 AND is_refund = 1`,
      [{ name: 'p0', type: 'int', value: originalTransactionId }]
    );
    if ((refundCheck[0]?.cnt ?? 0) > 0) {
      return Response.json({ error: 'Transaction already refunded' }, { status: 400 });
    }

    // Generate refund receipt number
    const year = new Date().getFullYear();
    const countRows = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM pos_transactions WHERE receipt_number LIKE @p0",
      [{ name: 'p0', type: 'nvarchar', value: `REC-${year}-%` }]
    );
    const nextNum = (countRows[0]?.cnt ?? 0) + 1;
    const receiptNumber = `REC-${year}-${String(nextNum).padStart(4, '0')}`;

    // Create refund transaction (negative amounts)
    const txResult = await db.query<{ id: number }>(
      `INSERT INTO pos_transactions
        (receipt_number, cashier_id, payment_method, subtotal, discount_amount, discount_type,
         total_net, total_vat, total_gross, is_refund, original_id, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, 1, @p9, @p10)`,
      [
        { name: 'p0', type: 'nvarchar', value: receiptNumber },
        { name: 'p1', type: 'int', value: auth.userId },
        { name: 'p2', type: 'nvarchar', value: orig.payment_method },
        { name: 'p3', type: 'nvarchar', value: String(-orig.subtotal) },
        { name: 'p4', type: 'nvarchar', value: String(-orig.discount_amount) },
        { name: 'p5', type: 'nvarchar', value: orig.discount_type },
        { name: 'p6', type: 'nvarchar', value: String(-orig.total_net) },
        { name: 'p7', type: 'nvarchar', value: String(-orig.total_vat) },
        { name: 'p8', type: 'nvarchar', value: String(-orig.total_gross) },
        { name: 'p9', type: 'int', value: originalTransactionId },
        { name: 'p10', type: 'nvarchar', value: reason ?? `Refund of ${orig.receipt_number}` },
      ]
    );

    const refundTxId = txResult[0]?.id;
    if (!refundTxId) throw new Error('Failed to create refund transaction');

    // Fetch original items and create negative copies + restore inventory
    const origItems = await db.query<{
      product_id: number | null; product_name: string; barcode: string | null;
      quantity: number; unit: string; unit_price: number; vat_rate: number;
      discount: number; line_total: number;
    }>(
      `SELECT product_id, product_name, barcode, quantity, unit, unit_price, vat_rate, discount, line_total
       FROM pos_transaction_items WHERE transaction_id = @p0`,
      [{ name: 'p0', type: 'int', value: originalTransactionId }]
    );

    for (const item of origItems) {
      // Insert refund line item (negative)
      await db.execute(
        `INSERT INTO pos_transaction_items
          (transaction_id, product_id, product_name, barcode, quantity, unit, unit_price, vat_rate, discount, line_total)
         VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`,
        [
          { name: 'p0', type: 'int', value: refundTxId },
          { name: 'p1', type: 'int', value: item.product_id },
          { name: 'p2', type: 'nvarchar', value: item.product_name },
          { name: 'p3', type: 'nvarchar', value: item.barcode },
          { name: 'p4', type: 'nvarchar', value: String(-item.quantity) },
          { name: 'p5', type: 'nvarchar', value: item.unit },
          { name: 'p6', type: 'nvarchar', value: String(item.unit_price) },
          { name: 'p7', type: 'nvarchar', value: String(item.vat_rate) },
          { name: 'p8', type: 'nvarchar', value: String(-item.discount) },
          { name: 'p9', type: 'nvarchar', value: String(-item.line_total) },
        ]
      );

      // Restore inventory
      if (item.product_id) {
        await db.execute(
          `UPDATE inventory_items SET current_qty = current_qty + @p0 WHERE id = @p1`,
          [
            { name: 'p0', type: 'float', value: item.quantity },
            { name: 'p1', type: 'int', value: item.product_id },
          ]
        );

        await db.execute(
          `INSERT INTO inventory_movements (item_id, type, quantity, reference, created_by)
           VALUES (@p0, 'in', @p1, @p2, @p3)`,
          [
            { name: 'p0', type: 'int', value: item.product_id },
            { name: 'p1', type: 'float', value: item.quantity },
            { name: 'p2', type: 'nvarchar', value: `REFUND-${receiptNumber}` },
            { name: 'p3', type: 'int', value: auth.userId },
          ]
        );
      }
    }

    return Response.json({
      ok: true,
      id: refundTxId,
      receiptNumber,
      refundedTotal: orig.total_gross,
    }, { status: 201 });
  } catch (err) {
    console.error('[POS API] refund error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
