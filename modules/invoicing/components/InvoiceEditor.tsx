'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, X, Check, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { VAT_RATES, calculateLineItem, calculateInvoiceTotals, type LineItemCalc } from '../lib/vat-calculator';

// ── Types ──

interface Customer {
  id: number;
  customerName: string;
  taxNumber: string | null;
  addressCity: string | null;
}

interface InventoryItem {
  id: number;
  sku: string;
  itemName: string;
  currentQty: number;
  unitName: string | null;
}

interface LineItemDraft {
  key: number;
  itemId?: number;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitName: string;
  unitPriceNet: number;
  vatRateCode: string;
  vatRate: number;
}

interface InvoiceEditorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

let lineKeyCounter = 0;

export default function InvoiceEditor({ onSuccess, onCancel }: InvoiceEditorProps) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [fulfillmentDate, setFulfillmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceType, setInvoiceType] = useState<'normal' | 'advance' | 'proforma'>('normal');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { key: ++lineKeyCounter, itemName: '', itemSku: '', quantity: 1, unitName: 'db', unitPriceNet: 0, vatRateCode: '27%', vatRate: 27 },
  ]);

  // Load customers + inventory
  useEffect(() => {
    fetch('/api/modules/invoicing/data/customers')
      .then(r => r.json())
      .then((d: { customers: Customer[] }) => setCustomers(d.customers))
      .catch(() => {});
    fetch('/api/modules/inventory/data')
      .then(r => r.json())
      .then((d: { items: InventoryItem[] }) => setInventoryItems(d.items))
      .catch(() => {});
  }, []);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  // Customer selection
  const filteredCustomers = customers.filter(c =>
    c.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.taxNumber && c.taxNumber.includes(customerSearch))
  );

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerSearch(c.customerName);
    setShowCustomerDropdown(false);
  };

  // Line item helpers
  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      key: ++lineKeyCounter, itemName: '', itemSku: '', quantity: 1, unitName: 'db', unitPriceNet: 0, vatRateCode: '27%', vatRate: 27,
    }]);
  };

  const removeLineItem = (key: number) => {
    setLineItems(prev => prev.length > 1 ? prev.filter(li => li.key !== key) : prev);
  };

  const updateLineItem = (key: number, field: keyof LineItemDraft, value: string | number) => {
    setLineItems(prev => prev.map(li => {
      if (li.key !== key) return li;
      const updated = { ...li, [field]: value };
      // Sync VAT rate when code changes
      if (field === 'vatRateCode') {
        const vr = VAT_RATES.find(r => r.code === value);
        if (vr) updated.vatRate = vr.rate;
      }
      return updated;
    }));
  };

  const selectInventoryItem = (key: number, item: InventoryItem) => {
    setLineItems(prev => prev.map(li => {
      if (li.key !== key) return li;
      return { ...li, itemId: item.id, itemName: item.itemName, itemSku: item.sku, unitName: item.unitName || 'db' };
    }));
  };

  // Totals calculation
  const lineCalcs: LineItemCalc[] = lineItems.map(li => ({
    quantity: li.quantity,
    unitPriceNet: li.unitPriceNet,
    vatRateCode: li.vatRateCode,
    vatRate: li.vatRate,
  }));
  const totals = calculateInvoiceTotals(lineCalcs, 'HUF');

  // Submit
  const handleSubmit = async () => {
    if (!customerId) { setError(t('invoicing.error_select_customer')); return; }
    if (lineItems.some(li => !li.itemName.trim())) { setError(t('invoicing.error_item_name')); return; }
    if (lineItems.some(li => li.quantity <= 0)) { setError(t('invoicing.error_quantity')); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/modules/invoicing/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          invoiceType,
          customerId,
          fulfillmentDate,
          dueDate: dueDate || undefined,
          paymentMethod,
          notes: notes || undefined,
          lineItems: lineItems.map(li => ({
            itemId: li.itemId,
            itemName: li.itemName,
            itemSku: li.itemSku || undefined,
            quantity: li.quantity,
            unitName: li.unitName,
            unitPriceNet: li.unitPriceNet,
            vatRateCode: li.vatRateCode,
            vatRate: li.vatRate,
          })),
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice type + Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.invoice_type')}</label>
          <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as typeof invoiceType)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
            <option value="normal">{t('invoicing.type_normal')}</option>
            <option value="advance">{t('invoicing.type_advance')}</option>
            <option value="proforma">{t('invoicing.type_proforma')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.payment_method')}</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
            <option value="cash">Készpénz</option>
            <option value="card">Bankkártya</option>
            <option value="transfer">Átutalás</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.fulfillment_date')}</label>
          <input type="date" value={fulfillmentDate} onChange={e => setFulfillmentDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
        </div>
      </div>

      {/* Due date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.due_date')} <span className="text-gray-600">({t('invoicing.optional')})</span></label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
        </div>
      </div>

      {/* Customer selector */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.customer')} *</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setCustomerId(null); setShowCustomerDropdown(true); }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder={t('invoicing.search_customer')}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100"
          />
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-xl">
              {filteredCustomers.slice(0, 10).map(c => (
                <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm">
                  <span className="text-gray-200">{c.customerName}</span>
                  {c.taxNumber && <span className="ml-2 text-gray-500 font-mono text-xs">{c.taxNumber}</span>}
                  {c.addressCity && <span className="ml-2 text-gray-600 text-xs">{c.addressCity}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-400">{t('invoicing.line_items')}</label>
          <button onClick={addLineItem} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> {t('invoicing.add_item')}
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.map(li => {
            const calc = calculateLineItem({ quantity: li.quantity, unitPriceNet: li.unitPriceNet, vatRateCode: li.vatRateCode, vatRate: li.vatRate }, 'HUF');
            return (
              <div key={li.key} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <div className="grid grid-cols-12 gap-2 items-end">
                  {/* Item name */}
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('invoicing.item_name')} *</label>
                    <input
                      type="text"
                      value={li.itemName}
                      onChange={e => updateLineItem(li.key, 'itemName', e.target.value)}
                      placeholder={t('invoicing.item_placeholder')}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                    />
                    {/* Quick pick from inventory */}
                    {inventoryItems.length > 0 && !li.itemId && li.itemName.length >= 2 && (
                      <div className="mt-1">
                        {inventoryItems
                          .filter(inv => inv.itemName.toLowerCase().includes(li.itemName.toLowerCase()) || inv.sku.toLowerCase().includes(li.itemName.toLowerCase()))
                          .slice(0, 3)
                          .map(inv => (
                            <button key={inv.id} onClick={() => selectInventoryItem(li.key, inv)} className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded">
                              {inv.sku} — {inv.itemName} ({inv.currentQty} {inv.unitName})
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  {/* Qty */}
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('invoicing.qty')}</label>
                    <input type="number" value={li.quantity} onChange={e => updateLineItem(li.key, 'quantity', parseFloat(e.target.value) || 0)} min={0.001} step={1} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 text-right" />
                  </div>
                  {/* Unit */}
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('invoicing.unit')}</label>
                    <input type="text" value={li.unitName} onChange={e => updateLineItem(li.key, 'unitName', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100" />
                  </div>
                  {/* Net price */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('invoicing.net_price')}</label>
                    <input type="number" value={li.unitPriceNet} onChange={e => updateLineItem(li.key, 'unitPriceNet', parseFloat(e.target.value) || 0)} min={0} step={1} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 text-right" />
                  </div>
                  {/* VAT rate */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('invoicing.vat_rate')}</label>
                    <select value={li.vatRateCode} onChange={e => updateLineItem(li.key, 'vatRateCode', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100">
                      {VAT_RATES.map(vr => <option key={vr.code} value={vr.code}>{vr.label}</option>)}
                    </select>
                  </div>
                  {/* Line total + delete */}
                  <div className="col-span-12 sm:col-span-2 flex items-end justify-between">
                    <div className="text-right flex-1">
                      <p className="text-[10px] text-gray-500">{t('invoicing.line_gross')}</p>
                      <p className="text-sm font-mono text-white">{calc.lineGross.toLocaleString('hu-HU')} Ft</p>
                    </div>
                    <button onClick={() => removeLineItem(li.key)} className="ml-2 p-1.5 text-gray-600 hover:text-red-400" title={t('common.delete')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-8 text-sm">
            <span className="text-gray-400">{t('invoicing.net_total')}:</span>
            <span className="font-mono text-gray-300 w-32 text-right">{totals.netTotal.toLocaleString('hu-HU')} Ft</span>
          </div>
          {totals.vatSummary.map(vs => (
            <div key={vs.vatRateCode} className="flex items-center gap-8 text-sm">
              <span className="text-gray-400">ÁFA {vs.vatRateCode}:</span>
              <span className="font-mono text-gray-300 w-32 text-right">{vs.vatAmount.toLocaleString('hu-HU')} Ft</span>
            </div>
          ))}
          <div className="flex items-center gap-8 text-base font-bold border-t border-gray-700 pt-2 mt-1">
            <span className="text-gray-200">{t('invoicing.gross_total')}:</span>
            <span className="font-mono text-white w-32 text-right">{totals.grossTotal.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.notes')}</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Check className="w-4 h-4" /> {saving ? t('common.saving') : t('invoicing.save_draft')}
        </button>
      </div>
    </div>
  );
}
