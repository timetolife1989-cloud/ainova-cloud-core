'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { ShoppingBag, Plus, X, Check, AlertTriangle, Truck, Package } from 'lucide-react';

// --- Types ---
interface Supplier {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: string;
  rating: number | null;
  isActive: boolean;
}

interface Order {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  totalNet: number;
  totalGross: number;
  currency: string;
  notes: string | null;
  createdAt: string;
}

interface Suggestion {
  productId: number;
  sku: string;
  itemName: string;
  currentQty: number;
  minQty: number;
  unitName: string | null;
  deficit: number;
}

type Tab = 'orders' | 'suppliers' | 'suggestions';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600',
  ordered: 'bg-blue-600',
  shipped: 'bg-yellow-600',
  received: 'bg-green-600',
  verified: 'bg-emerald-600',
  cancelled: 'bg-red-600',
};

export default function PurchasingDashboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'supplier' | 'order' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supplier form
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTaxNumber, setFormTaxNumber] = useState('');

  // Order form
  const [orderSupplierId, setOrderSupplierId] = useState(0);
  const [orderExpected, setOrderExpected] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const fetchAll = useCallback(async () => {
    try {
      const [ordersRes, suppliersRes, suggestionsRes] = await Promise.all([
        fetch('/api/modules/purchasing/orders'),
        fetch('/api/modules/purchasing/suppliers'),
        fetch('/api/modules/purchasing/suggestions'),
      ]);

      if (ordersRes.ok) {
        const json = await ordersRes.json() as { orders: Order[] };
        setOrders(json.orders);
      }
      if (suppliersRes.ok) {
        const json = await suppliersRes.json() as { suppliers: Supplier[] };
        setSuppliers(json.suppliers);
      }
      if (suggestionsRes.ok) {
        const json = await suggestionsRes.json() as { suggestions: Suggestion[] };
        setSuggestions(json.suggestions);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // --- Save handlers ---
  const handleSaveSupplier = async () => {
    if (!formName.trim()) { setError(t('purchasing.error.name_required')); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/purchasing/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ name: formName, contactName: formContact || undefined, email: formEmail || undefined, phone: formPhone || undefined, address: formAddress || undefined, taxNumber: formTaxNumber || undefined }),
      });
      if (!res.ok) { const b = await res.json() as { error?: string }; throw new Error(b.error ?? t('common.error')); }
      setModalOpen(null);
      setFormName(''); setFormContact(''); setFormEmail(''); setFormPhone(''); setFormAddress(''); setFormTaxNumber('');
      await fetchAll();
    } catch (e) { setError(getErrorMessage(e, t)); }
    finally { setSaving(false); }
  };

  const handleSaveOrder = async () => {
    if (!orderSupplierId) { setError(t('purchasing.error.supplier_required')); return; }
    const validItems = orderItems.filter(i => i.description.trim() && i.quantity > 0 && i.unitPrice > 0);
    if (validItems.length === 0) { setError(t('purchasing.error.items_required')); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          supplierId: orderSupplierId,
          expectedDate: orderExpected || undefined,
          notes: orderNotes || undefined,
          items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
        }),
      });
      if (!res.ok) { const b = await res.json() as { error?: string }; throw new Error(b.error ?? t('common.error')); }
      setModalOpen(null);
      setOrderSupplierId(0); setOrderExpected(''); setOrderNotes('');
      setOrderItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      await fetchAll();
    } catch (e) { setError(getErrorMessage(e, t)); }
    finally { setSaving(false); }
  };

  const handleApprove = async (orderId: number) => {
    try {
      const res = await fetch(`/api/modules/purchasing/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      if (res.ok) await fetchAll();
    } catch { /* ignore */ }
  };

  const addOrderItem = () => setOrderItems([...orderItems, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeOrderItem = (idx: number) => setOrderItems(orderItems.filter((_, i) => i !== idx));
  const updateOrderItem = (idx: number, field: string, value: string | number) => {
    setOrderItems(orderItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title={t('purchasing.title')}
        subtitle={t('purchasing.description')}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {(['orders', 'suppliers', 'suggestions'] as Tab[]).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {t(`purchasing.${key}`)}
            {key === 'suggestions' && suggestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">{suggestions.length}</span>
            )}
          </button>
        ))}

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <ExportButton moduleId="purchasing" />
          {tab === 'suppliers' && (
            <button onClick={() => setModalOpen('supplier')} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />{t('purchasing.new_supplier')}
            </button>
          )}
          {tab === 'orders' && (
            <button onClick={() => setModalOpen('order')} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />{t('purchasing.new_order')}
            </button>
          )}
        </div>
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('purchasing.no_orders')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.order_number')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.supplier')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('common.status')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.order_date')}</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">{t('purchasing.total')}</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-300">{o.supplierName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full text-white ${STATUS_COLORS[o.status] ?? 'bg-gray-600'}`}>
                        {t(`purchasing.status.${o.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{o.orderDate}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {new Intl.NumberFormat().format(o.totalGross)} {o.currency}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.status === 'draft' && (
                        <button onClick={() => handleApprove(o.id)} title={t('purchasing.approve')} className="p-1 text-green-400 hover:text-green-300">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suppliers tab */}
      {tab === 'suppliers' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {suppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('purchasing.no_suppliers')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.supplier_name')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.contact')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('user.email')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.phone')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('purchasing.payment_terms')}</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">{t('purchasing.rating_label')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-300">{s.contactName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{s.paymentTerms}</td>
                    <td className="px-4 py-3 text-center text-yellow-400">{s.rating ? '★'.repeat(s.rating) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suggestions tab */}
      {tab === 'suggestions' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('purchasing.no_suggestions')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {suggestions.map(s => (
                <div key={s.productId} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{s.itemName} <span className="text-gray-500 text-xs">({s.sku})</span></p>
                      <p className="text-sm text-gray-400">
                        {t('purchasing.stock')}: <span className="text-red-400 font-medium">{s.currentQty}</span> / {t('purchasing.min')}: {s.minQty} {s.unitName ?? 'db'}
                        {' — '}{t('purchasing.deficit')}: <span className="text-red-400">{s.deficit}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Supplier Modal */}
      {modalOpen === 'supplier' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setModalOpen(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">{t('purchasing.new_supplier')}</h3>
              <button onClick={() => setModalOpen(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <input placeholder={t('purchasing.supplier_name')} value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
              <input placeholder={t('purchasing.contact')} value={formContact} onChange={e => setFormContact(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder={t('user.email')} value={formEmail} onChange={e => setFormEmail(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
                <input placeholder={t('purchasing.phone')} value={formPhone} onChange={e => setFormPhone(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
              </div>
              <input placeholder={t('purchasing.address')} value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
              <input placeholder={t('purchasing.tax_number')} value={formTaxNumber} onChange={e => setFormTaxNumber(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">{t('common.cancel')}</button>
              <button onClick={handleSaveSupplier} disabled={saving} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg disabled:opacity-50">
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {modalOpen === 'order' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto py-8" onClick={() => setModalOpen(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">{t('purchasing.new_order')}</h3>
              <button onClick={() => setModalOpen(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <select
                value={orderSupplierId}
                onChange={e => setOrderSupplierId(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
              >
                <option value={0}>{t('purchasing.select_supplier')}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" placeholder={t('purchasing.expected_date')} value={orderExpected} onChange={e => setOrderExpected(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />

              {/* Items */}
              <div className="space-y-2">
                <p className="text-sm text-gray-400 font-medium">{t('purchasing.items')}</p>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input placeholder={t('purchasing.item_desc')} value={item.description} onChange={e => updateOrderItem(idx, 'description', e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
                    <input type="number" placeholder={t('purchasing.qty')} value={item.quantity || ''} onChange={e => updateOrderItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
                    <input type="number" placeholder={t('purchasing.price')} value={item.unitPrice || ''} onChange={e => updateOrderItem(idx, 'unitPrice', Number(e.target.value))} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none" />
                    {orderItems.length > 1 && (
                      <button onClick={() => removeOrderItem(idx)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={addOrderItem} className="text-sm text-orange-400 hover:text-orange-300">+ {t('purchasing.add_item')}</button>
              </div>

              <textarea placeholder={t('purchasing.notes')} value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">{t('common.cancel')}</button>
              <button onClick={handleSaveOrder} disabled={saving} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg disabled:opacity-50">
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
