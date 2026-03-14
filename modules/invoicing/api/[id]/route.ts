import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import { generateInvoiceNumber } from '../../lib/invoice-number';
import { calculateLineItem, calculateInvoiceTotals, type LineItemCalc } from '../../lib/vat-calculator';

// ── Types ──

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface LineItemRow {
  id: number;
  item_id: number | null;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  unit_name: string;
  unit_price_net: number;
  vat_rate: number;
  vat_rate_code: string;
  line_net: number;
  line_vat: number;
  line_gross: number;
  sort_order: number;
}

interface VatSummaryRow {
  vat_rate_code: string;
  vat_rate: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
}

interface InvoiceDetailRow {
  id: number;
  invoice_number: string;
  invoice_type: string;
  storno_of_id: number | null;
  customer_id: number | null;
  customer_name: string;
  customer_tax_number: string | null;
  customer_address: string | null;
  issue_date: string;
  fulfillment_date: string;
  due_date: string;
  payment_method: string;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
  status: string;
  nav_status: string;
  nav_transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
}

// ── GET: Invoice detail with line items ──

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'invoicing.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  try {
    const db = getDb();

    const [invoices, lineItems, vatSummary] = await Promise.all([
      db.query<InvoiceDetailRow>(
        `SELECT id, invoice_number, invoice_type, storno_of_id, customer_id,
                customer_name, customer_tax_number, customer_address,
                issue_date, fulfillment_date, due_date, payment_method, currency,
                net_total, vat_total, gross_total, status, nav_status,
                nav_transaction_id, notes, created_by, created_at
         FROM invoicing_invoices WHERE id = @p0`,
        [{ name: 'p0', type: 'nvarchar', value: String(invoiceId) }]
      ),
      db.query<LineItemRow>(
        `SELECT id, item_id, item_name, item_sku, quantity, unit_name,
                unit_price_net, vat_rate, vat_rate_code, line_net, line_vat, line_gross, sort_order
         FROM invoicing_line_items WHERE invoice_id = @p0 ORDER BY sort_order`,
        [{ name: 'p0', type: 'nvarchar', value: String(invoiceId) }]
      ),
      db.query<VatSummaryRow>(
        `SELECT vat_rate_code, vat_rate, net_amount, vat_amount, gross_amount
         FROM invoicing_vat_summary WHERE invoice_id = @p0 ORDER BY vat_rate DESC`,
        [{ name: 'p0', type: 'nvarchar', value: String(invoiceId) }]
      ),
    ]);

    if (invoices.length === 0) {
      return Response.json({ error: 'error.not_found' }, { status: 404 });
    }

    const inv = invoices[0];
    return Response.json({
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceType: inv.invoice_type,
        stornoOfId: inv.storno_of_id,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        customerTaxNumber: inv.customer_tax_number,
        customerAddress: inv.customer_address,
        issueDate: String(inv.issue_date),
        fulfillmentDate: String(inv.fulfillment_date),
        dueDate: String(inv.due_date),
        paymentMethod: inv.payment_method,
        currency: inv.currency,
        netTotal: inv.net_total,
        vatTotal: inv.vat_total,
        grossTotal: inv.gross_total,
        status: inv.status,
        navStatus: inv.nav_status,
        navTransactionId: inv.nav_transaction_id,
        notes: inv.notes,
        createdBy: inv.created_by,
        createdAt: String(inv.created_at),
      },
      lineItems: lineItems.map(li => ({
        id: li.id,
        itemId: li.item_id,
        itemName: li.item_name,
        itemSku: li.item_sku,
        quantity: li.quantity,
        unitName: li.unit_name,
        unitPriceNet: li.unit_price_net,
        vatRate: li.vat_rate,
        vatRateCode: li.vat_rate_code,
        lineNet: li.line_net,
        lineVat: li.line_vat,
        lineGross: li.line_gross,
      })),
      vatSummary: vatSummary.map(vs => ({
        vatRateCode: vs.vat_rate_code,
        vatRate: vs.vat_rate,
        netAmount: vs.net_amount,
        vatAmount: vs.vat_amount,
        grossAmount: vs.gross_amount,
      })),
    });
  } catch (err) {
    console.error('[Invoicing API] GET invoice detail error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

// ── POST: Invoice actions ──

const ActionSchema = z.object({
  action: z.enum(['issue', 'mark_paid', 'storno']),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'invoicing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const db = getDb();

  // Load invoice
  const invoices = await db.query<{ id: number; status: string; invoice_type: string; currency: string }>(
    'SELECT id, status, invoice_type, currency FROM invoicing_invoices WHERE id = @p0',
    [{ name: 'p0', type: 'nvarchar', value: String(invoiceId) }]
  );
  if (invoices.length === 0) {
    return Response.json({ error: 'error.not_found' }, { status: 404 });
  }
  const invoice = invoices[0];

  try {
    switch (parsed.data.action) {
      case 'issue':
        return await handleIssue(db, invoice, auth.username);
      case 'mark_paid':
        return await handleMarkPaid(db, invoice);
      case 'storno':
        return await handleStorno(db, invoice, auth.username);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Invoicing API] POST action error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

// ── Action: Issue (finalize) ──

async function handleIssue(
  db: ReturnType<typeof getDb>,
  invoice: { id: number; status: string; currency: string },
  username: string
) {
  if (invoice.status !== 'draft') {
    return Response.json({ error: 'Only draft invoices can be issued' }, { status: 400 });
  }

  // Generate final invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Load line items to build VAT summary
  const lineItems = await db.query<{ vat_rate_code: string; vat_rate: number; line_net: number; line_vat: number; line_gross: number; item_id: number | null; quantity: number }>(
    'SELECT vat_rate_code, vat_rate, line_net, line_vat, line_gross, item_id, quantity FROM invoicing_line_items WHERE invoice_id = @p0',
    [{ name: 'p0', type: 'nvarchar', value: String(invoice.id) }]
  );

  // Build VAT summary grouped by rate code
  const vatMap = new Map<string, { code: string; rate: number; net: number; vat: number; gross: number }>();
  for (const li of lineItems) {
    const existing = vatMap.get(li.vat_rate_code);
    if (existing) {
      existing.net += li.line_net;
      existing.vat += li.line_vat;
      existing.gross += li.line_gross;
    } else {
      vatMap.set(li.vat_rate_code, {
        code: li.vat_rate_code,
        rate: li.vat_rate,
        net: li.line_net,
        vat: li.line_vat,
        gross: li.line_gross,
      });
    }
  }

  // Insert VAT summary rows
  for (const entry of vatMap.values()) {
    await db.query(
      `INSERT INTO invoicing_vat_summary (invoice_id, vat_rate_code, vat_rate, net_amount, vat_amount, gross_amount)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
      [
        { name: 'p0', type: 'nvarchar', value: String(invoice.id) },
        { name: 'p1', type: 'nvarchar', value: entry.code },
        { name: 'p2', type: 'nvarchar', value: String(entry.rate) },
        { name: 'p3', type: 'nvarchar', value: String(entry.net) },
        { name: 'p4', type: 'nvarchar', value: String(entry.vat) },
        { name: 'p5', type: 'nvarchar', value: String(entry.gross) },
      ]
    );
  }

  // Update invoice: draft → issued, set final number and issue date
  const today = new Date().toISOString().slice(0, 10);
  await db.query(
    `UPDATE invoicing_invoices
     SET invoice_number = @p0, status = 'issued', issue_date = @p1, updated_at = SYSDATETIME()
     WHERE id = @p2`,
    [
      { name: 'p0', type: 'nvarchar', value: invoiceNumber },
      { name: 'p1', type: 'nvarchar', value: today },
      { name: 'p2', type: 'nvarchar', value: String(invoice.id) },
    ]
  );

  // Deduct inventory for items linked to inventory_items
  for (const li of lineItems) {
    if (li.item_id) {
      // Insert out movement
      await db.query(
        `INSERT INTO inventory_movements (item_id, movement_type, quantity, reference, created_by)
         VALUES (@p0, 'out', @p1, @p2, @p3)`,
        [
          { name: 'p0', type: 'nvarchar', value: String(li.item_id) },
          { name: 'p1', type: 'nvarchar', value: String(li.quantity) },
          { name: 'p2', type: 'nvarchar', value: invoiceNumber },
          { name: 'p3', type: 'nvarchar', value: username },
        ]
      );
      // Reduce current stock
      await db.query(
        `UPDATE inventory_items SET current_qty = current_qty - @p0, updated_at = SYSDATETIME() WHERE id = @p1`,
        [
          { name: 'p0', type: 'nvarchar', value: String(li.quantity) },
          { name: 'p1', type: 'nvarchar', value: String(li.item_id) },
        ]
      );
    }
  }

  return Response.json({ ok: true, invoiceNumber });
}

// ── Action: Mark as paid ──

async function handleMarkPaid(
  db: ReturnType<typeof getDb>,
  invoice: { id: number; status: string }
) {
  if (invoice.status !== 'issued') {
    return Response.json({ error: 'Only issued invoices can be marked as paid' }, { status: 400 });
  }

  await db.query(
    `UPDATE invoicing_invoices SET status = 'paid', updated_at = SYSDATETIME() WHERE id = @p0`,
    [{ name: 'p0', type: 'nvarchar', value: String(invoice.id) }]
  );

  return Response.json({ ok: true });
}

// ── Action: Storno ──

async function handleStorno(
  db: ReturnType<typeof getDb>,
  invoice: { id: number; status: string; currency: string },
  username: string
) {
  if (invoice.status !== 'issued' && invoice.status !== 'paid') {
    return Response.json({ error: 'Only issued or paid invoices can be reversed' }, { status: 400 });
  }

  // Generate storno invoice number
  const stornoNumber = await generateInvoiceNumber();
  const today = new Date().toISOString().slice(0, 10);

  // Load original invoice details
  const originals = await db.query<{
    customer_id: number | null; customer_name: string; customer_tax_number: string | null;
    customer_address: string | null; fulfillment_date: string; payment_method: string;
    currency: string; net_total: number; vat_total: number; gross_total: number;
  }>(
    `SELECT customer_id, customer_name, customer_tax_number, customer_address,
            fulfillment_date, payment_method, currency, net_total, vat_total, gross_total
     FROM invoicing_invoices WHERE id = @p0`,
    [{ name: 'p0', type: 'nvarchar', value: String(invoice.id) }]
  );
  const orig = originals[0];

  // Create storno invoice (negative amounts)
  const stornoResult = await db.query<{ id: number }>(
    `INSERT INTO invoicing_invoices
       (invoice_number, invoice_type, storno_of_id, customer_id, customer_name, customer_tax_number, customer_address,
        issue_date, fulfillment_date, due_date, payment_method, currency,
        net_total, vat_total, gross_total, status, nav_status, created_by)
     OUTPUT INSERTED.id
     VALUES (@p0, 'storno', @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p6, @p8, @p9, @p10, @p11, @p12, 'issued', 'pending', @p13)`,
    [
      { name: 'p0',  type: 'nvarchar', value: stornoNumber },
      { name: 'p1',  type: 'nvarchar', value: String(invoice.id) },
      { name: 'p2',  type: 'nvarchar', value: orig.customer_id ? String(orig.customer_id) : null },
      { name: 'p3',  type: 'nvarchar', value: orig.customer_name },
      { name: 'p4',  type: 'nvarchar', value: orig.customer_tax_number ?? null },
      { name: 'p5',  type: 'nvarchar', value: orig.customer_address ?? null },
      { name: 'p6',  type: 'nvarchar', value: today },
      { name: 'p7',  type: 'nvarchar', value: String(orig.fulfillment_date) },
      { name: 'p8',  type: 'nvarchar', value: orig.payment_method },
      { name: 'p9',  type: 'nvarchar', value: orig.currency },
      { name: 'p10', type: 'nvarchar', value: String(-orig.net_total) },
      { name: 'p11', type: 'nvarchar', value: String(-orig.vat_total) },
      { name: 'p12', type: 'nvarchar', value: String(-orig.gross_total) },
      { name: 'p13', type: 'nvarchar', value: username },
    ]
  );
  const stornoId = stornoResult[0]?.id;

  // Copy line items as negative
  const origLineItems = await db.query<LineItemRow>(
    `SELECT item_id, item_name, item_sku, quantity, unit_name, unit_price_net,
            vat_rate, vat_rate_code, line_net, line_vat, line_gross, sort_order
     FROM invoicing_line_items WHERE invoice_id = @p0 ORDER BY sort_order`,
    [{ name: 'p0', type: 'nvarchar', value: String(invoice.id) }]
  );

  for (const li of origLineItems) {
    await db.query(
      `INSERT INTO invoicing_line_items
         (invoice_id, item_id, item_name, item_sku, quantity, unit_name,
          unit_price_net, vat_rate, vat_rate_code, line_net, line_vat, line_gross, sort_order)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12)`,
      [
        { name: 'p0',  type: 'nvarchar', value: String(stornoId) },
        { name: 'p1',  type: 'nvarchar', value: li.item_id ? String(li.item_id) : null },
        { name: 'p2',  type: 'nvarchar', value: li.item_name },
        { name: 'p3',  type: 'nvarchar', value: li.item_sku ?? null },
        { name: 'p4',  type: 'nvarchar', value: String(-li.quantity) },
        { name: 'p5',  type: 'nvarchar', value: li.unit_name },
        { name: 'p6',  type: 'nvarchar', value: String(li.unit_price_net) },
        { name: 'p7',  type: 'nvarchar', value: String(li.vat_rate) },
        { name: 'p8',  type: 'nvarchar', value: li.vat_rate_code },
        { name: 'p9',  type: 'nvarchar', value: String(-li.line_net) },
        { name: 'p10', type: 'nvarchar', value: String(-li.line_vat) },
        { name: 'p11', type: 'nvarchar', value: String(-li.line_gross) },
        { name: 'p12', type: 'nvarchar', value: String(li.sort_order) },
      ]
    );

    // Restore inventory
    if (li.item_id) {
      await db.query(
        `INSERT INTO inventory_movements (item_id, movement_type, quantity, reference, created_by)
         VALUES (@p0, 'in', @p1, @p2, @p3)`,
        [
          { name: 'p0', type: 'nvarchar', value: String(li.item_id) },
          { name: 'p1', type: 'nvarchar', value: String(li.quantity) },
          { name: 'p2', type: 'nvarchar', value: `STORNO:${stornoNumber}` },
          { name: 'p3', type: 'nvarchar', value: username },
        ]
      );
      await db.query(
        `UPDATE inventory_items SET current_qty = current_qty + @p0, updated_at = SYSDATETIME() WHERE id = @p1`,
        [
          { name: 'p0', type: 'nvarchar', value: String(li.quantity) },
          { name: 'p1', type: 'nvarchar', value: String(li.item_id) },
        ]
      );
    }
  }

  // Mark original as storno'd
  await db.query(
    `UPDATE invoicing_invoices SET status = 'storno', updated_at = SYSDATETIME() WHERE id = @p0`,
    [{ name: 'p0', type: 'nvarchar', value: String(invoice.id) }]
  );

  return Response.json({ ok: true, stornoInvoiceId: stornoId, stornoNumber });
}
