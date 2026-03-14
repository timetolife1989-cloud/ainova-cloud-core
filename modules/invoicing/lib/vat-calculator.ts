/**
 * Hungarian VAT (ÁFA) Calculator
 * ===============================
 * Supports: 27%, 18%, 5%, TAM (0%), AAM (0%)
 * Rounding: HUF → whole number (Math.round), other currencies → 2 decimals
 */

export interface VatRateInfo {
  code: string;       // '27%' | '18%' | '5%' | 'TAM' | 'AAM'
  rate: number;       // 27 | 18 | 5 | 0 | 0
  label: string;
}

export const VAT_RATES: VatRateInfo[] = [
  { code: '27%', rate: 27, label: '27% ÁFA' },
  { code: '18%', rate: 18, label: '18% ÁFA' },
  { code: '5%',  rate: 5,  label: '5% ÁFA' },
  { code: 'TAM', rate: 0,  label: 'ÁFA mentes (TAM)' },
  { code: 'AAM', rate: 0,  label: 'Alanyi adómentes (AAM)' },
];

export interface LineItemCalc {
  quantity: number;
  unitPriceNet: number;
  vatRateCode: string;
  vatRate: number;
}

export interface LineItemResult {
  lineNet: number;
  lineVat: number;
  lineGross: number;
}

export interface VatSummaryEntry {
  vatRateCode: string;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface InvoiceTotals {
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  vatSummary: VatSummaryEntry[];
}

/**
 * Round amount based on currency.
 * HUF: whole number (Math.round)
 * Other: 2 decimal places
 */
function roundAmount(amount: number, currency: string): number {
  if (currency === 'HUF') {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate a single line item's net/vat/gross.
 */
export function calculateLineItem(
  item: LineItemCalc,
  currency = 'HUF'
): LineItemResult {
  const lineNet = roundAmount(item.quantity * item.unitPriceNet, currency);
  const lineVat = roundAmount(lineNet * item.vatRate / 100, currency);
  const lineGross = lineNet + lineVat;

  return { lineNet, lineVat, lineGross };
}

/**
 * Calculate invoice totals from line items.
 * Groups by VAT rate code for the ÁFA summary.
 */
export function calculateInvoiceTotals(
  items: LineItemCalc[],
  currency = 'HUF'
): InvoiceTotals {
  const summaryMap = new Map<string, VatSummaryEntry>();
  let netTotal = 0;
  let vatTotal = 0;

  for (const item of items) {
    const { lineNet, lineVat } = calculateLineItem(item, currency);
    netTotal += lineNet;
    vatTotal += lineVat;

    const existing = summaryMap.get(item.vatRateCode);
    if (existing) {
      existing.netAmount += lineNet;
      existing.vatAmount += lineVat;
      existing.grossAmount += lineNet + lineVat;
    } else {
      summaryMap.set(item.vatRateCode, {
        vatRateCode: item.vatRateCode,
        vatRate: item.vatRate,
        netAmount: lineNet,
        vatAmount: lineVat,
        grossAmount: lineNet + lineVat,
      });
    }
  }

  // Final rounding on summary entries
  const vatSummary = Array.from(summaryMap.values()).map(entry => ({
    ...entry,
    netAmount: roundAmount(entry.netAmount, currency),
    vatAmount: roundAmount(entry.vatAmount, currency),
    grossAmount: roundAmount(entry.grossAmount, currency),
  }));

  return {
    netTotal: roundAmount(netTotal, currency),
    vatTotal: roundAmount(vatTotal, currency),
    grossTotal: roundAmount(netTotal + vatTotal, currency),
    vatSummary,
  };
}

/**
 * Get VAT rate info by code.
 */
export function getVatRate(code: string): VatRateInfo | undefined {
  return VAT_RATES.find(r => r.code === code);
}

/**
 * Parse default VAT rate from admin setting value.
 * Admin stores: '27' | '18' | '5' | '0' | 'AAM'
 */
export function parseDefaultVatRate(settingValue: string): { code: string; rate: number } {
  if (settingValue === 'AAM') return { code: 'AAM', rate: 0 };
  const num = parseInt(settingValue, 10);
  if (num === 0) return { code: 'TAM', rate: 0 };
  return { code: `${num}%`, rate: num };
}
