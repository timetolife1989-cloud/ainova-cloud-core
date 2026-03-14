import { getDb } from '@/lib/db';
import { getModuleSetting } from '@/lib/modules/settings';

/**
 * Invoice Number Generator
 * ========================
 * Pattern: {PREFIX}-{YYYY}-{NNNNN}
 * Example: ACI-2026-00001
 *
 * Uses row-level locking (UPDLOCK, HOLDLOCK) for atomicity.
 * Falls back to INSERT on first use per prefix+year.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const prefix = (await getModuleSetting('invoicing', 'invoicing_invoice_prefix')) || 'ACI';
  const year = new Date().getFullYear();

  const db = getDb();
  const prefixParam = { name: 'p0', type: 'nvarchar' as const, value: prefix };
  const yearParam = { name: 'p1', type: 'nvarchar' as const, value: String(year) };

  // Atomic increment with row lock
  const updated = await db.query<{ last_number: number }>(
    `UPDATE invoicing_number_sequence WITH (UPDLOCK, HOLDLOCK)
     SET last_number = last_number + 1
     OUTPUT INSERTED.last_number
     WHERE prefix = @p0 AND seq_year = @p1`,
    [prefixParam, yearParam]
  );

  let nextNumber: number;

  if (updated.length > 0) {
    nextNumber = updated[0].last_number;
  } else {
    // First invoice of this prefix+year — insert row
    await db.query(
      `IF NOT EXISTS (SELECT 1 FROM invoicing_number_sequence WHERE prefix = @p0 AND seq_year = @p1)
         INSERT INTO invoicing_number_sequence (prefix, seq_year, last_number) VALUES (@p0, @p1, 1)
       ELSE
         UPDATE invoicing_number_sequence SET last_number = last_number + 1 WHERE prefix = @p0 AND seq_year = @p1`,
      [prefixParam, yearParam]
    );

    const rows = await db.query<{ last_number: number }>(
      'SELECT last_number FROM invoicing_number_sequence WHERE prefix = @p0 AND seq_year = @p1',
      [prefixParam, yearParam]
    );
    nextNumber = rows[0]?.last_number ?? 1;
  }

  const padded = String(nextNumber).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}
