/**
 * NAV Online Számla 3.0 Adapter (stub)
 * =====================================
 * Provides interface for Hungarian NAV Online Invoice System.
 * This is a stub — full implementation requires:
 *   - SHA3-512 request signing
 *   - XML generation per NAV XSD v3.0
 *   - manageInvoice / queryInvoiceStatus / queryInvoiceData calls
 *
 * NAV docs: https://onlineszamla.nav.gov.hu/
 */

import { getModuleSetting } from '@/lib/modules/settings';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

interface NavCredentials {
  enabled: boolean;
  user: string;
  signatureKey: string;
  exchangeKey: string;
}

export async function getNavCredentials(): Promise<NavCredentials> {
  const [enabled, user, signatureKey, exchangeKey] = await Promise.all([
    getModuleSetting('invoicing', 'nav_enabled'),
    getModuleSetting('invoicing', 'nav_user'),
    getModuleSetting('invoicing', 'nav_signature_key'),
    getModuleSetting('invoicing', 'nav_exchange_key'),
  ]);

  return {
    enabled: enabled === 'true',
    user: user || '',
    signatureKey: signatureKey || '',
    exchangeKey: exchangeKey || '',
  };
}

export function isNavConfigured(creds: NavCredentials): boolean {
  return creds.enabled && !!creds.user && !!creds.signatureKey && !!creds.exchangeKey;
}

/**
 * Report invoice to NAV Online Számla.
 * STUB — logs intent, updates nav_status to 'pending'.
 * Full implementation will POST XML to NAV API.
 */
export async function reportInvoiceToNav(invoiceId: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const creds = await getNavCredentials();

  if (!isNavConfigured(creds)) {
    logger.info('[NAV] NAV reporting is not configured, skipping', { invoiceId });
    return { success: true };
  }

  const db = getDb();
  const idParam = [{ name: 'p0', type: 'nvarchar' as const, value: String(invoiceId) }];

  try {
    // Mark as pending
    await db.query(
      `UPDATE invoicing_invoices SET nav_status = 'pending' WHERE id = @p0`,
      idParam
    );

    // TODO: Generate XML per NAV XSD v3.0 schema
    // TODO: SHA3-512 request signature
    // TODO: POST to /invoiceService/v3/manageInvoice
    // TODO: Parse transactionId from response
    // TODO: Poll queryTransactionStatus for final result

    const transactionId = `STUB-${Date.now()}`;
    logger.info('[NAV] Invoice reported (stub)', { invoiceId, transactionId });

    return { success: true, transactionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'NAV reporting failed';
    logger.error('[NAV] Invoice reporting failed', { invoiceId, error: message });

    await db.query(
      `UPDATE invoicing_invoices SET nav_status = 'error' WHERE id = @p0`,
      idParam
    );

    return { success: false, error: message };
  }
}

/**
 * Query invoice status from NAV.
 * STUB — returns current nav_status from DB.
 */
export async function queryNavStatus(invoiceId: number): Promise<string> {
  const db = getDb();
  const rows = await db.query<{ nav_status: string }>(
    `SELECT nav_status FROM invoicing_invoices WHERE id = @p0`,
    [{ name: 'p0', type: 'nvarchar', value: String(invoiceId) }]
  );
  return rows[0]?.nav_status ?? 'not_sent';
}
