import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// GET — transaction detail with items
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'pos.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const txId = parseInt(id, 10);
  if (isNaN(txId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const db = getDb();

    const txRows = await db.query<{
      id: number; receipt_number: string; transaction_date: string;
      cashier_id: number; payment_method: string;
      subtotal: number; discount_amount: number; discount_type: string | null;
      total_net: number; total_vat: number; total_gross: number;
      is_refund: boolean; original_id: number | null; invoice_id: number | null;
      notes: string | null; created_at: Date;
    }>(
      `SELECT * FROM pos_transactions WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: txId }]
    );

    if (!txRows.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const tx = txRows[0];

    const items = await db.query<{
      id: number; product_id: number | null; product_name: string;
      barcode: string | null; quantity: number; unit: string;
      unit_price: number; vat_rate: number; discount: number; line_total: number;
    }>(
      `SELECT id, product_id, product_name, barcode, quantity, unit, unit_price, vat_rate, discount, line_total
       FROM pos_transaction_items WHERE transaction_id = @p0 ORDER BY id`,
      [{ name: 'p0', type: 'int', value: txId }]
    );

    return Response.json({
      transaction: {
        id: tx.id,
        receiptNumber: tx.receipt_number,
        date: String(tx.transaction_date),
        cashierId: tx.cashier_id,
        paymentMethod: tx.payment_method,
        subtotal: tx.subtotal,
        discount: tx.discount_amount,
        discountType: tx.discount_type,
        totalNet: tx.total_net,
        totalVat: tx.total_vat,
        totalGross: tx.total_gross,
        isRefund: !!tx.is_refund,
        originalId: tx.original_id,
        invoiceId: tx.invoice_id,
        notes: tx.notes,
      },
      items: items.map(i => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        barcode: i.barcode,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unit_price,
        vatRate: i.vat_rate,
        discount: i.discount,
        lineTotal: i.line_total,
      })),
    });
  } catch (err) {
    console.error('[POS API] GET transaction detail error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
