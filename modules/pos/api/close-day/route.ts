import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const CloseDaySchema = z.object({
  actualCash: z.number().min(0),
  notes: z.string().max(2000).optional(),
});

// POST — close daily register
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'pos.close_day');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CloseDaySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { actualCash, notes } = parsed.data;
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Check if already closed today
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM pos_daily_closings WHERE closing_date = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: today }]
    );
    if (existing.length > 0) {
      return Response.json({ error: 'Daily closing already exists for today' }, { status: 400 });
    }

    // Calculate totals for today
    const summary = await db.query<{
      total_cash: number; total_card: number; total_transfer: number;
      total_refunds: number; tx_count: number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_card,
        COALESCE(SUM(CASE WHEN payment_method = 'transfer' AND is_refund = 0 THEN total_gross ELSE 0 END), 0) AS total_transfer,
        COALESCE(SUM(CASE WHEN is_refund = 1 THEN ABS(total_gross) ELSE 0 END), 0) AS total_refunds,
        COUNT(*) AS tx_count
       FROM pos_transactions
       WHERE CAST(transaction_date AS DATE) = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: today }]
    );

    const s = summary[0] ?? { total_cash: 0, total_card: 0, total_transfer: 0, total_refunds: 0, tx_count: 0 };
    const expectedCash = s.total_cash - s.total_refunds;
    const difference = actualCash - expectedCash;

    await db.execute(
      `INSERT INTO pos_daily_closings
        (closing_date, cashier_id, total_cash, total_card, total_transfer,
         total_refunds, expected_cash, actual_cash, difference, transaction_count, notes)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10)`,
      [
        { name: 'p0', type: 'nvarchar', value: today },
        { name: 'p1', type: 'int', value: auth.userId },
        { name: 'p2', type: 'nvarchar', value: String(s.total_cash) },
        { name: 'p3', type: 'nvarchar', value: String(s.total_card) },
        { name: 'p4', type: 'nvarchar', value: String(s.total_transfer) },
        { name: 'p5', type: 'nvarchar', value: String(s.total_refunds) },
        { name: 'p6', type: 'nvarchar', value: String(expectedCash) },
        { name: 'p7', type: 'nvarchar', value: String(actualCash) },
        { name: 'p8', type: 'nvarchar', value: String(difference) },
        { name: 'p9', type: 'int', value: s.tx_count },
        { name: 'p10', type: 'nvarchar', value: notes ?? null },
      ]
    );

    return Response.json({
      ok: true,
      date: today,
      totalCash: s.total_cash,
      totalCard: s.total_card,
      totalTransfer: s.total_transfer,
      totalRefunds: s.total_refunds,
      expectedCash,
      actualCash,
      difference,
      transactionCount: s.tx_count,
    }, { status: 201 });
  } catch (err) {
    console.error('[POS API] close-day error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
