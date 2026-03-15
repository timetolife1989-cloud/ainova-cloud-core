import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import { calculateLineItem, calculateInvoiceTotals, type LineItemCalc } from '../lib/vat-calculator';
import { getModuleSetting } from '@/lib/modules/settings';

// ── Types ──

interface InvoiceRow {
  id: number;
  invoice_number: string;
  invoice_type: string;
  customer_id: number | null;
  customer_name: string;
  customer_tax_number: string | null;
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
  created_by: string | null;
  created_at: Date;
}

// ── GET: List invoices ──

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'invoicing.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const search = searchParams.get('search');

  try {
    let sql = `SELECT id, invoice_number, invoice_type, customer_id, customer_name,
                      customer_tax_number, issue_date, fulfillment_date, due_date,
                      payment_method, currency, net_total, vat_total, gross_total,
                      status, nav_status, created_by, created_at
               FROM invoicing_invoices WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let pi = 0;

    if (status) {
      sql += ` AND status = @p${pi}`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: status });
      pi++;
    }
    if (customerId) {
      sql += ` AND customer_id = @p${pi}`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: customerId });
      pi++;
    }
    if (dateFrom) {
      sql += ` AND issue_date >= @p${pi}`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: dateFrom });
      pi++;
    }
    if (dateTo) {
      sql += ` AND issue_date <= @p${pi}`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: dateTo });
      pi++;
    }
    if (search) {
      sql += ` AND (invoice_number LIKE @p${pi} OR customer_name LIKE @p${pi})`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: `%${search}%` });
      pi++;
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await getDb().query<InvoiceRow>(sql, params);

    return Response.json({
      invoices: rows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        invoiceType: r.invoice_type,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerTaxNumber: r.customer_tax_number,
        issueDate: String(r.issue_date).split('T')[0],
        fulfillmentDate: String(r.fulfillment_date).split('T')[0],
        dueDate: String(r.due_date).split('T')[0],
        paymentMethod: r.payment_method,
        currency: r.currency,
        netTotal: Number(r.net_total) || 0,
        vatTotal: Number(r.vat_total) || 0,
        grossTotal: Number(r.gross_total) || 0,
        status: r.status,
        navStatus: r.nav_status,
        createdBy: r.created_by,
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[Invoicing API] GET invoices error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

// ── POST: Create draft invoice ──

const LineItemSchema = z.object({
  itemId: z.number().int().positive().optional(),
  itemName: z.string().min(1).max(200),
  itemSku: z.string().max(50).optional(),
  quantity: z.number().positive(),
  unitName: z.string().max(20).optional(),
  unitPriceNet: z.number().min(0),
  vatRateCode: z.string().min(1).max(10),
  vatRate: z.number().min(0).max(100),
});

const CreateInvoiceSchema = z.object({
  invoiceType: z.enum(['normal', 'advance', 'proforma']).optional(),
  customerId: z.number().int().positive(),
  fulfillmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(500).optional(),
  lineItems: z.array(LineItemSchema).min(1),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'invoicing.create');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  try {
    // Resolve customer
    const customers = await db.query<{ customer_name: string; tax_number: string | null; address_zip: string | null; address_city: string | null; address_street: string | null; address_country: string }>(
      `SELECT customer_name, tax_number, address_zip, address_city, address_street, address_country
       FROM invoicing_customers WHERE id = @p0 AND is_active = 1`,
      [{ name: 'p0', type: 'nvarchar', value: String(d.customerId) }]
    );
    if (customers.length === 0) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }
    const cust = customers[0];
    const custAddress = [cust.address_zip, cust.address_city, cust.address_street]
      .filter(Boolean).join(' ') + (cust.address_country !== 'HU' ? ` (${cust.address_country})` : '');

    // Resolve defaults
    const defaultPayment = (await getModuleSetting('invoicing', 'invoicing_default_payment_method')) || 'cash';
    const defaultDueDays = parseInt((await getModuleSetting('invoicing', 'invoicing_default_due_days')) || '8', 10);
    const currency = d.currency || 'HUF';
    const paymentMethod = d.paymentMethod || defaultPayment;

    // Calculate due date if not provided
    const issueDate = new Date().toISOString().slice(0, 10);
    let dueDate = d.dueDate;
    if (!dueDate) {
      const dd = new Date();
      dd.setDate(dd.getDate() + defaultDueDays);
      dueDate = dd.toISOString().slice(0, 10);
    }

    // Calculate totals
    const lineCalcs: LineItemCalc[] = d.lineItems.map(li => ({
      quantity: li.quantity,
      unitPriceNet: li.unitPriceNet,
      vatRateCode: li.vatRateCode,
      vatRate: li.vatRate,
    }));
    const totals = calculateInvoiceTotals(lineCalcs, currency);

    // Draft gets a temporary number (replaced on issue)
    const tempNumber = `DRAFT-${Date.now()}`;

    // Insert invoice
    const invoiceResult = await db.query<{ id: number }>(
      `INSERT INTO invoicing_invoices
         (invoice_number, invoice_type, customer_id, customer_name, customer_tax_number, customer_address,
          issue_date, fulfillment_date, due_date, payment_method, currency,
          net_total, vat_total, gross_total, status, nav_status, notes, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, 'draft', 'pending', @p14, @p15)`,
      [
        { name: 'p0',  type: 'nvarchar', value: tempNumber },
        { name: 'p1',  type: 'nvarchar', value: d.invoiceType || 'normal' },
        { name: 'p2',  type: 'nvarchar', value: String(d.customerId) },
        { name: 'p3',  type: 'nvarchar', value: cust.customer_name },
        { name: 'p4',  type: 'nvarchar', value: cust.tax_number ?? null },
        { name: 'p5',  type: 'nvarchar', value: custAddress || null },
        { name: 'p6',  type: 'nvarchar', value: issueDate },
        { name: 'p7',  type: 'nvarchar', value: d.fulfillmentDate },
        { name: 'p8',  type: 'nvarchar', value: dueDate },
        { name: 'p9',  type: 'nvarchar', value: paymentMethod },
        { name: 'p10', type: 'nvarchar', value: currency },
        { name: 'p11', type: 'nvarchar', value: String(totals.netTotal) },
        { name: 'p12', type: 'nvarchar', value: String(totals.vatTotal) },
        { name: 'p13', type: 'nvarchar', value: String(totals.grossTotal) },
        { name: 'p14', type: 'nvarchar', value: d.notes ?? null },
        { name: 'p15', type: 'nvarchar', value: auth.username },
      ]
    );
    const invoiceId = invoiceResult[0]?.id;
    if (!invoiceId) throw new Error('Failed to create invoice');

    // Insert line items
    for (let i = 0; i < d.lineItems.length; i++) {
      const li = d.lineItems[i];
      const calc = calculateLineItem({
        quantity: li.quantity,
        unitPriceNet: li.unitPriceNet,
        vatRateCode: li.vatRateCode,
        vatRate: li.vatRate,
      }, currency);

      await db.query(
        `INSERT INTO invoicing_line_items
           (invoice_id, item_id, item_name, item_sku, quantity, unit_name,
            unit_price_net, vat_rate, vat_rate_code, line_net, line_vat, line_gross, sort_order)
         VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12)`,
        [
          { name: 'p0',  type: 'nvarchar', value: String(invoiceId) },
          { name: 'p1',  type: 'nvarchar', value: li.itemId ? String(li.itemId) : null },
          { name: 'p2',  type: 'nvarchar', value: li.itemName },
          { name: 'p3',  type: 'nvarchar', value: li.itemSku ?? null },
          { name: 'p4',  type: 'nvarchar', value: String(li.quantity) },
          { name: 'p5',  type: 'nvarchar', value: li.unitName || 'db' },
          { name: 'p6',  type: 'nvarchar', value: String(li.unitPriceNet) },
          { name: 'p7',  type: 'nvarchar', value: String(li.vatRate) },
          { name: 'p8',  type: 'nvarchar', value: li.vatRateCode },
          { name: 'p9',  type: 'nvarchar', value: String(calc.lineNet) },
          { name: 'p10', type: 'nvarchar', value: String(calc.lineVat) },
          { name: 'p11', type: 'nvarchar', value: String(calc.lineGross) },
          { name: 'p12', type: 'nvarchar', value: String(i) },
        ]
      );
    }

    return Response.json({ ok: true, id: invoiceId }, { status: 201 });
  } catch (err) {
    console.error('[Invoicing API] POST invoice error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
