import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const SellItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
});

const SellSchema = z.object({
  items: z.array(SellItemSchema).min(1),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  discountAmount: z.number().min(0).optional(),
  discountType: z.enum(['percent', 'fixed']).optional(),
  notes: z.string().max(2000).optional(),
});

// POST — execute a sale
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.sell');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = SellSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();
  const vatRate = 27; // default VAT

  try {
    // Generate receipt number
    const year = new Date().getFullYear();
    const countRows = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM pos_transactions WHERE receipt_number LIKE @p0",
      [{ name: 'p0', type: 'nvarchar', value: `REC-${year}-%` }]
    );
    const nextNum = (countRows[0]?.cnt ?? 0) + 1;
    const receiptNumber = `REC-${year}-${String(nextNum).padStart(4, '0')}`;

    // Calculate line totals
    let subtotal = 0;
    const lineDetails: Array<{
      productId: number; productName: string; barcode: string | null;
      quantity: number; unit: string; unitPrice: number;
      discount: number; lineTotal: number;
    }> = [];

    for (const item of d.items) {
      // Fetch product details from inventory
      const productRows = await db.query<{
        id: number; name: string; barcode: string | null; unit_name: string; current_qty: number;
      }>(
        `SELECT id, name, barcode, unit_name, current_qty FROM inventory_items WHERE id = @p0 AND is_active = 1`,
        [{ name: 'p0', type: 'int', value: item.productId }]
      );

      if (!productRows.length) {
        return Response.json(
          { error: `Product ID ${item.productId} not found or inactive` },
          { status: 400 }
        );
      }

      const product = productRows[0];

      if (product.current_qty < item.quantity) {
        return Response.json(
          { error: `Insufficient stock for ${product.name}: available ${product.current_qty}, requested ${item.quantity}` },
          { status: 400 }
        );
      }

      const linDiscount = item.discount ?? 0;
      const lineTotal = (item.quantity * item.unitPrice) - linDiscount;
      subtotal += lineTotal;

      lineDetails.push({
        productId: item.productId,
        productName: product.name,
        barcode: product.barcode,
        quantity: item.quantity,
        unit: product.unit_name ?? 'db',
        unitPrice: item.unitPrice,
        discount: linDiscount,
        lineTotal,
      });
    }

    // Apply order-level discount
    let discountAmount = 0;
    if (d.discountAmount && d.discountAmount > 0) {
      if (d.discountType === 'percent') {
        discountAmount = Math.round(subtotal * d.discountAmount) / 100;
      } else {
        discountAmount = d.discountAmount;
      }
    }

    const totalNet = subtotal - discountAmount;
    const totalVat = Math.round(totalNet * vatRate) / 100;
    const totalGross = totalNet + totalVat;

    // Insert transaction
    const txResult = await db.query<{ id: number }>(
      `INSERT INTO pos_transactions
        (receipt_number, cashier_id, payment_method, subtotal, discount_amount, discount_type,
         total_net, total_vat, total_gross, is_refund, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, 0, @p9)`,
      [
        { name: 'p0', type: 'nvarchar', value: receiptNumber },
        { name: 'p1', type: 'int', value: auth.userId },
        { name: 'p2', type: 'nvarchar', value: d.paymentMethod },
        { name: 'p3', type: 'nvarchar', value: String(Math.round(subtotal * 100) / 100) },
        { name: 'p4', type: 'nvarchar', value: String(Math.round(discountAmount * 100) / 100) },
        { name: 'p5', type: 'nvarchar', value: d.discountType ?? null },
        { name: 'p6', type: 'nvarchar', value: String(Math.round(totalNet * 100) / 100) },
        { name: 'p7', type: 'nvarchar', value: String(Math.round(totalVat * 100) / 100) },
        { name: 'p8', type: 'nvarchar', value: String(Math.round(totalGross * 100) / 100) },
        { name: 'p9', type: 'nvarchar', value: d.notes ?? null },
      ]
    );

    const txId = txResult[0]?.id;
    if (!txId) throw new Error('Failed to create transaction');

    // Insert items + deduct inventory
    for (const line of lineDetails) {
      await db.execute(
        `INSERT INTO pos_transaction_items
          (transaction_id, product_id, product_name, barcode, quantity, unit, unit_price, vat_rate, discount, line_total)
         VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`,
        [
          { name: 'p0', type: 'int', value: txId },
          { name: 'p1', type: 'int', value: line.productId },
          { name: 'p2', type: 'nvarchar', value: line.productName },
          { name: 'p3', type: 'nvarchar', value: line.barcode },
          { name: 'p4', type: 'nvarchar', value: String(line.quantity) },
          { name: 'p5', type: 'nvarchar', value: line.unit },
          { name: 'p6', type: 'nvarchar', value: String(line.unitPrice) },
          { name: 'p7', type: 'nvarchar', value: String(vatRate) },
          { name: 'p8', type: 'nvarchar', value: String(line.discount) },
          { name: 'p9', type: 'nvarchar', value: String(Math.round(line.lineTotal * 100) / 100) },
        ]
      );

      // Deduct inventory
      await db.execute(
        `UPDATE inventory_items SET current_qty = current_qty - @p0 WHERE id = @p1`,
        [
          { name: 'p0', type: 'float', value: line.quantity },
          { name: 'p1', type: 'int', value: line.productId },
        ]
      );

      // Record inventory movement
      await db.execute(
        `INSERT INTO inventory_movements (item_id, type, quantity, reference, created_by)
         VALUES (@p0, 'out', @p1, @p2, @p3)`,
        [
          { name: 'p0', type: 'int', value: line.productId },
          { name: 'p1', type: 'float', value: line.quantity },
          { name: 'p2', type: 'nvarchar', value: receiptNumber },
          { name: 'p3', type: 'int', value: auth.userId },
        ]
      );
    }

    return Response.json({
      ok: true,
      id: txId,
      receiptNumber,
      total: Math.round(totalGross * 100) / 100,
    }, { status: 201 });
  } catch (err) {
    console.error('[POS API] sell error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
