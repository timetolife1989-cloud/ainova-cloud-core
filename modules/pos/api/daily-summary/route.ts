import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

// GET — real-time daily summary
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.view');
  if (!auth.valid) return auth.response;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const summary = await getDb().query<{
      total_sales: number; total_refunds: number;
      total_cash: number; total_card: number; total_transfer: number;
      tx_count: number; refund_count: number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN is_refund = 1 THEN ABS(total_gross) ELSE 0 END), 0) AS total_refunds,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_card,
        COALESCE(SUM(CASE WHEN payment_method = 'transfer' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_transfer,
        SUM(CASE WHEN is_refund = 0 THEN 1 ELSE 0 END) AS tx_count,
        SUM(CASE WHEN is_refund = 1 THEN 1 ELSE 0 END) AS refund_count
       FROM pos_transactions
       WHERE CAST(transaction_date AS DATE) = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: today }]
    );

    const s = summary[0] ?? {
      total_sales: 0, total_refunds: 0,
      total_cash: 0, total_card: 0, total_transfer: 0,
      tx_count: 0, refund_count: 0,
    };

    // Check if day is already closed
    const closingRows = await getDb().query<{ id: number }>(
      `SELECT id FROM pos_daily_closings WHERE closing_date = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: today }]
    );

    return Response.json({
      date: today,
      totalSales: s.total_sales,
      totalRefunds: s.total_refunds,
      netRevenue: s.total_sales - s.total_refunds,
      totalCash: s.total_cash,
      totalCard: s.total_card,
      totalTransfer: s.total_transfer,
      transactionCount: s.tx_count,
      refundCount: s.refund_count,
      isClosed: closingRows.length > 0,
    });
  } catch (err) {
    console.error('[POS API] daily-summary error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
