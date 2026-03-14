/**
 * Invoice PDF Generator
 * =====================
 * Generates A4 Hungarian-standard invoice HTML for server-side rendering.
 * The HTML can be served as a printable page (Print → Save as PDF).
 */

interface InvoicePdfData {
  // Company (seller)
  companyName: string;
  companyTaxNumber: string;
  companyAddress: string;
  companyBankAccount: string;
  // Invoice
  invoiceNumber: string;
  invoiceType: string;
  issueDate: string;
  fulfillmentDate: string;
  dueDate: string;
  paymentMethod: string;
  notes: string | null;
  // Customer (buyer)
  customerName: string;
  customerTaxNumber: string | null;
  customerAddress: string;
  // Line items
  lineItems: {
    itemName: string;
    quantity: number;
    unitName: string;
    unitPriceNet: number;
    vatRateCode: string;
    lineNet: number;
    lineVat: number;
    lineGross: number;
  }[];
  // Totals
  vatSummary: {
    vatRateCode: string;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }[];
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  // Storno reference
  stornoOfNumber?: string;
  currency: string;
}

const TYPE_LABELS: Record<string, string> = {
  normal: 'SZÁMLA',
  storno: 'SZTORNÓ SZÁMLA',
  advance: 'ELŐLEGSZÁMLA',
  proforma: 'DÍJBEKÉRŐ',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Készpénz',
  card: 'Bankkártya',
  transfer: 'Átutalás',
};

function fmt(n: number, currency: string): string {
  if (currency === 'HUF') return Math.round(n).toLocaleString('hu-HU') + ' Ft';
  return n.toLocaleString('hu-HU', { minimumFractionDigits: 2 }) + ` ${currency}`;
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const typeLabel = TYPE_LABELS[data.invoiceType] ?? 'SZÁMLA';

  const lineItemRows = data.lineItems
    .map(
      (li, i) => `
      <tr>
        <td class="num">${i + 1}.</td>
        <td>${escapeHtml(li.itemName)}</td>
        <td class="num">${li.quantity}</td>
        <td>${escapeHtml(li.unitName)}</td>
        <td class="num">${fmt(li.unitPriceNet, data.currency)}</td>
        <td class="num">${li.vatRateCode}</td>
        <td class="num">${fmt(li.lineNet, data.currency)}</td>
        <td class="num">${fmt(li.lineVat, data.currency)}</td>
        <td class="num bold">${fmt(li.lineGross, data.currency)}</td>
      </tr>`
    )
    .join('\n');

  const vatRows = data.vatSummary
    .map(
      (vs) => `
      <tr>
        <td>${vs.vatRateCode}</td>
        <td class="num">${fmt(vs.netAmount, data.currency)}</td>
        <td class="num">${fmt(vs.vatAmount, data.currency)}</td>
        <td class="num bold">${fmt(vs.grossAmount, data.currency)}</td>
      </tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<title>${typeLabel} — ${escapeHtml(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #10b981; }
  .header h1 { font-size: 22px; color: #10b981; margin-bottom: 4px; }
  .header .inv-num { font-size: 14px; font-weight: 600; color: #333; }
  .header .company { text-align: right; font-size: 11px; color: #555; }
  .parties { display: flex; gap: 40px; margin-bottom: 20px; }
  .party { flex: 1; }
  .party h3 { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 6px; letter-spacing: 0.5px; }
  .party .name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; background: #f8f9fa; padding: 10px; border-radius: 4px; }
  .meta-item label { font-size: 9px; text-transform: uppercase; color: #888; display: block; }
  .meta-item span { font-size: 12px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; color: #666; padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .bold { font-weight: 600; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 15px; }
  .totals table { width: auto; min-width: 300px; }
  .totals td { border-bottom: 1px solid #eee; }
  .totals tr:last-child td { border-bottom: 2px solid #10b981; border-top: 1px solid #10b981; font-size: 14px; font-weight: 700; padding: 8px; }
  .vat-summary { margin-bottom: 15px; }
  .vat-summary h3 { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
  .notes { background: #fffbeb; padding: 10px; border-radius: 4px; font-size: 10px; color: #666; margin-bottom: 15px; }
  .storno-ref { background: #fef2f2; padding: 8px; border-radius: 4px; color: #991b1b; font-size: 11px; margin-bottom: 15px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #ddd; }
  .signature { width: 200px; text-align: center; }
  .signature .line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 10px; color: #666; }
  @media print { .page { padding: 0; width: auto; min-height: auto; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>${typeLabel}</h1>
      <div class="inv-num">${escapeHtml(data.invoiceNumber)}</div>
    </div>
    <div class="company">
      <div style="font-weight:600;font-size:13px">${escapeHtml(data.companyName)}</div>
      <div>Adószám: ${escapeHtml(data.companyTaxNumber)}</div>
      <div>${escapeHtml(data.companyAddress)}</div>
      ${data.companyBankAccount ? `<div>Bankszámlaszám: ${escapeHtml(data.companyBankAccount)}</div>` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Eladó</h3>
      <div class="name">${escapeHtml(data.companyName)}</div>
      <div>Adószám: ${escapeHtml(data.companyTaxNumber)}</div>
      <div>${escapeHtml(data.companyAddress)}</div>
    </div>
    <div class="party">
      <h3>Vevő</h3>
      <div class="name">${escapeHtml(data.customerName)}</div>
      ${data.customerTaxNumber ? `<div>Adószám: ${escapeHtml(data.customerTaxNumber)}</div>` : ''}
      <div>${escapeHtml(data.customerAddress)}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Számla kelte</label><span>${escapeHtml(data.issueDate)}</span></div>
    <div class="meta-item"><label>Teljesítés</label><span>${escapeHtml(data.fulfillmentDate)}</span></div>
    <div class="meta-item"><label>Fizetési határidő</label><span>${escapeHtml(data.dueDate)}</span></div>
    <div class="meta-item"><label>Fizetési mód</label><span>${PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}</span></div>
  </div>

  ${data.stornoOfNumber ? `<div class="storno-ref">Sztornózott számla: <strong>${escapeHtml(data.stornoOfNumber)}</strong></div>` : ''}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Megnevezés</th>
        <th class="num">Menny.</th>
        <th>Egys.</th>
        <th class="num">Nettó egységár</th>
        <th class="num">ÁFA</th>
        <th class="num">Nettó</th>
        <th class="num">ÁFA összeg</th>
        <th class="num">Bruttó</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <div class="vat-summary">
    <h3>ÁFA összesítő</h3>
    <table>
      <thead>
        <tr><th>ÁFA kulcs</th><th class="num">Nettó</th><th class="num">ÁFA</th><th class="num">Bruttó</th></tr>
      </thead>
      <tbody>${vatRows}</tbody>
    </table>
  </div>

  <div class="totals">
    <table>
      <tr><td>Nettó összesen:</td><td class="num">${fmt(data.netTotal, data.currency)}</td></tr>
      <tr><td>ÁFA összesen:</td><td class="num">${fmt(data.vatTotal, data.currency)}</td></tr>
      <tr><td>Fizetendő összesen:</td><td class="num bold">${fmt(data.grossTotal, data.currency)}</td></tr>
    </table>
  </div>

  ${data.notes ? `<div class="notes"><strong>Megjegyzés:</strong> ${escapeHtml(data.notes)}</div>` : ''}

  <div class="footer">
    <div class="signature"><div class="line">Kiállító aláírása</div></div>
    <div class="signature"><div class="line">Átvevő aláírása</div></div>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
