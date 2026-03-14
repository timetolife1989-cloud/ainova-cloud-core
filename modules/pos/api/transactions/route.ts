import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

// GET — transactions list with filters
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const paymentMethod = searchParams.get('paymentMethod');

  try {
    let sql = `SELECT t.id, t.receipt_number, t.transaction_date, t.cashier_id,
                      u.username AS cashier_name, t.payment_method,
                      t.subtotal, t.discount_amount, t.total_gross,
                      t.is_refund, t.invoice_id, t.notes, t.created_at
               FROM pos_transactions t
               JOIN core_users u ON u.id = t.cashier_id
               WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'datetime2'; value: unknown }> = [];
    let idx = 0;

    if (dateFrom) {
      sql += ` AND t.transaction_date >= @p${idx}`;
      params.push({ name: `p${idx}`, type: 'datetime2', value: dateFrom });
      idx++;
    }
    if (dateTo) {
      sql += ` AND t.transaction_date <= @p${idx}`;
      params.push({ name: `p${idx}`, type: 'datetime2', value: dateTo });
      idx++;
    }
    if (paymentMethod) {
      sql += ` AND t.payment_method = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: paymentMethod });
      idx++;
    }

    sql += ' ORDER BY t.created_at DESC';

    const rows = await getDb().query<{
      id: number; receipt_number: string; transaction_date: string;
      cashier_id: number; cashier_name: string; payment_method: string;
      subtotal: number; discount_amount: number; total_gross: number;
      is_refund: boolean; invoice_id: number | null; notes: string | null; created_at: Date;
    }>(sql, params);

    return Response.json({
      transactions: rows.map(r => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        date: String(r.transaction_date),
        cashierId: r.cashier_id,
        cashierName: r.cashier_name,
        paymentMethod: r.payment_method,
        subtotal: r.subtotal,
        discount: r.discount_amount,
        total: r.total_gross,
        isRefund: !!r.is_refund,
        invoiceId: r.invoice_id,
        notes: r.notes,
      })),
    });
  } catch (err) {
    console.error('[POS API] GET transactions error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
