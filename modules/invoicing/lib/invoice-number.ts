import { getDb } from '@/lib/db';
import { getModuleSetting } from '@/lib/modules/settings';

/**
 * Invoice Number Generator
 * ========================
 * Pattern: {PREFIX}-{YYYY}-{NNNNN}
 * Example: ACI-2026-00001
 *
 * Uses INSERT ON CONFLICT + UPDATE RETURNING for atomicity across DB adapters.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const prefix = (await getModuleSetting('invoicing', 'invoicing_invoice_prefix')) || 'ACI';
  const year = new Date().getFullYear();

  const db = getDb();
  const prefixParam = { name: 'p0', type: 'nvarchar' as const, value: prefix };
  const yearParam = { name: 'p1', type: 'int' as const, value: year };

  // Ensure the row exists (idempotent)
  await db.query(
    `INSERT INTO invoicing_number_sequence (prefix, seq_year, last_number)
     VALUES (@p0, @p1, 0)
     ON CONFLICT (prefix, seq_year) DO NOTHING`,
    [prefixParam, yearParam]
  );

  // Atomic increment + return
  const rows = await db.query<{ last_number: number }>(
    `UPDATE invoicing_number_sequence
     SET last_number = last_number + 1
     WHERE prefix = @p0 AND seq_year = @p1
     RETURNING last_number`,
    [prefixParam, yearParam]
  );

  const nextNumber = rows[0]?.last_number ?? 1;
  const padded = String(nextNumber).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}
