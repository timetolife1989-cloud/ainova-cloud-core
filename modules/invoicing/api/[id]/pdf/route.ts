import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { getModuleSetting } from '@/lib/modules/settings';
import { generateInvoiceHtml } from '@/modules/invoicing/lib/pdf-generator';

interface InvoicePdfRow {
  id: number; invoice_number: string; invoice_type: string;
  customer_name: string; customer_tax_number: string | null;
  customer_address: string | null;
  issue_date: string; fulfillment_date: string; due_date: string;
  payment_method: string; net_total: number; vat_total: number; gross_total: number;
  status: string; notes: string | null; storno_of_id: number | null;
}

interface LineItemPdfRow {
  item_name: string; quantity: number; unit_name: string;
  unit_price_net: number; vat_rate_code: string;
  line_net: number; line_vat: number; line_gross: number;
}

interface VatSummaryPdfRow {
  vat_rate_code: string; net_amount: number; vat_amount: number; gross_amount: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAuth(request, 'invoicing.view');
  if (!auth.valid) return auth.response;

  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const db = getDb();
  const idParam = [{ name: 'p0', type: 'nvarchar' as const, value: String(invoiceId) }];

  const [invoices, lineItems, vatSummary] = await Promise.all([
    db.query<InvoicePdfRow>(
      `SELECT id, invoice_number, invoice_type, customer_name, customer_tax_number,
              customer_address, issue_date, fulfillment_date, due_date,
              payment_method, net_total, vat_total, gross_total,
              status, notes, storno_of_id
       FROM invoicing_invoices WHERE id = @p0`, idParam),
    db.query<LineItemPdfRow>(
      `SELECT item_name, quantity, unit_name, unit_price_net, vat_rate_code,
              line_net, line_vat, line_gross
       FROM invoicing_line_items WHERE invoice_id = @p0 ORDER BY sort_order`, idParam),
    db.query<VatSummaryPdfRow>(
      `SELECT vat_rate_code, net_amount, vat_amount, gross_amount
       FROM invoicing_vat_summary WHERE invoice_id = @p0`, idParam),
  ]);

  const invoice = invoices[0];
  if (!invoice) return Response.json({ error: 'Not found' }, { status: 404 });

  // Get company info from module settings
  const [companyName, companyTaxNumber, companyAddress, companyBankAccount] = await Promise.all([
    getModuleSetting('invoicing', 'company_name').then(v => v || 'N/A'),
    getModuleSetting('invoicing', 'company_tax_number').then(v => v || 'N/A'),
    getModuleSetting('invoicing', 'company_address').then(v => v || 'N/A'),
    getModuleSetting('invoicing', 'company_bank_account').then(v => v || ''),
  ]);

  // If storno, get original number
  let stornoOfNumber: string | undefined;
  if (invoice.storno_of_id) {
    const orig = await db.query<{ invoice_number: string }>(
      `SELECT invoice_number FROM invoicing_invoices WHERE id = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: String(invoice.storno_of_id) }]
    );
    if (orig[0]) stornoOfNumber = orig[0].invoice_number;
  }

  const customerAddress = invoice.customer_address || '';

  const html = generateInvoiceHtml({
    companyName,
    companyTaxNumber,
    companyAddress,
    companyBankAccount,
    invoiceNumber: invoice.invoice_number,
    invoiceType: invoice.invoice_type,
    issueDate: String(invoice.issue_date),
    fulfillmentDate: String(invoice.fulfillment_date),
    dueDate: String(invoice.due_date),
    paymentMethod: invoice.payment_method,
    notes: invoice.notes,
    customerName: invoice.customer_name,
    customerTaxNumber: invoice.customer_tax_number,
    customerAddress,
    lineItems: lineItems.map(li => ({
      itemName: li.item_name,
      quantity: li.quantity,
      unitName: li.unit_name,
      unitPriceNet: li.unit_price_net,
      vatRateCode: li.vat_rate_code,
      lineNet: li.line_net,
      lineVat: li.line_vat,
      lineGross: li.line_gross,
    })),
    vatSummary: vatSummary.map(vs => ({
      vatRateCode: vs.vat_rate_code,
      netAmount: vs.net_amount,
      vatAmount: vs.vat_amount,
      grossAmount: vs.gross_amount,
    })),
    netTotal: invoice.net_total,
    vatTotal: invoice.vat_total,
    grossTotal: invoice.gross_total,
    stornoOfNumber,
    currency: 'HUF',
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
