'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, CreditCard, Banknote, ArrowLeftRight, X, Plus, Minus, Trash2, ClipboardList, Receipt } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface Product {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  stock: number;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
  lineTotal: number;
}

interface DailySummary {
  date: string;
  totalSales: number;
  totalRefunds: number;
  netRevenue: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  transactionCount: number;
  refundCount: number;
  isClosed: boolean;
}

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function fmt(n: number): string {
  return new Intl.NumberFormat('hu-HU').format(Math.round(n));
}

export default function POSDashboardPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<'pos' | 'history'>('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saleResult, setSaleResult] = useState<{ receiptNumber: string; total: number } | null>(null);
  const [closingModal, setClosingModal] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [transactions, setTransactions] = useState<Array<{
    id: number; receiptNumber: string; date: string; cashierName: string;
    paymentMethod: string; total: number; isRefund: boolean;
  }>>([]);

  // Fetch daily summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/pos/daily-summary');
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Product search
  useEffect(() => {
    if (searchQuery.length < 1) { setProducts([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/modules/pos/product-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products ?? []);
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load transaction history
  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/pos/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (view === 'history') loadTransactions(); }, [view, loadTransactions]);

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        return prev.map(c =>
          c.id === product.id
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.price }
            : c
        );
      }
      return [...prev, { ...product, quantity: 1, lineTotal: product.price }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => {
          if (c.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          return { ...c, quantity: newQty, lineTotal: newQty * c.price };
        })
        .filter((c): c is CartItem => c !== null);
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.id !== productId));
  };

  const clearCart = () => { setCart([]); setSaleResult(null); };

  const cartTotal = cart.reduce((sum, c) => sum + c.lineTotal, 0);
  const cartVat = Math.round(cartTotal * 27) / 100;
  const cartGross = cartTotal + cartVat;

  // Execute sale
  const executeSale = async (paymentMethod: 'cash' | 'card' | 'transfer') => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/modules/pos/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          items: cart.map(c => ({
            productId: c.id,
            quantity: c.quantity,
            unitPrice: c.price,
          })),
          paymentMethod,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaleResult({ receiptNumber: data.receiptNumber, total: data.total });
        setCart([]);
        loadSummary();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Close day
  const closeDay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/modules/pos/close-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          actualCash: parseFloat(actualCash) || 0,
          notes: closingNotes || undefined,
        }),
      });
      if (res.ok) {
        setClosingModal(false);
        setActualCash('');
        setClosingNotes('');
        loadSummary();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // ─── POS View ───
  if (view === 'pos') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <DashboardSectionHeader title={t('pos.title')} />
          <div className="flex gap-2">
            <button onClick={() => setView('history')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
              <ClipboardList className="w-4 h-4" />
              {t('pos.history')}
            </button>
            <button onClick={() => setClosingModal(true)} disabled={summary?.isClosed}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm">
              <Receipt className="w-4 h-4" />
              {t('pos.close_day')}
            </button>
          </div>
        </div>

        {/* Sale success message */}
        {saleResult && (
          <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-400 font-semibold">{t('pos.sale_complete')}</p>
              <p className="text-sm text-gray-300">
                {saleResult.receiptNumber} — {fmt(saleResult.total)} Ft
              </p>
            </div>
            <button onClick={() => setSaleResult(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main POS layout: left = search, right = cart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Product search */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('pos.search_placeholder')}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg"
                autoFocus
              />
            </div>

            {/* Product grid — touchscreen-friendly large tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-800 hover:bg-gray-700
                             border border-gray-700 hover:border-emerald-500 rounded-xl
                             min-h-[100px] transition-colors touch-manipulation"
                >
                  <span className="text-white font-medium text-center text-sm leading-tight">{p.name}</span>
                  <span className="text-emerald-400 font-bold mt-1">{fmt(p.price)} Ft</span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {t('pos.stock')}: {p.stock} {p.unit}
                  </span>
                </button>
              ))}
              {searchQuery.length >= 1 && products.length === 0 && (
                <p className="col-span-full text-gray-500 text-center py-8">{t('pos.no_results')}</p>
              )}
            </div>

            {/* Daily summary bar */}
            {summary && (
              <div className="bg-gray-800 rounded-lg p-3 flex flex-wrap gap-4 text-sm text-gray-300">
                <span>{t('pos.today_revenue')}: <strong className="text-white">{fmt(summary.netRevenue)} Ft</strong></span>
                <span>{t('pos.transactions')}: <strong className="text-white">{summary.transactionCount}</strong></span>
                {summary.isClosed && (
                  <span className="text-amber-400 font-semibold">{t('pos.day_closed')}</span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Cart */}
          <div className="bg-gray-900 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">{t('pos.cart')}</h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="ml-auto text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> {t('pos.clear_cart')}
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 space-y-2 max-h-[45vh] overflow-y-auto">
              {cart.length === 0 && (
                <p className="text-gray-500 text-center py-12">{t('pos.cart_empty')}</p>
              )}
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-gray-400 text-xs">{fmt(item.price)} Ft/{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg touch-manipulation">
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-10 text-center text-white font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg touch-manipulation">
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <span className="w-24 text-right text-white font-semibold">{fmt(item.lineTotal)} Ft</span>
                  <button onClick={() => removeFromCart(item.id)}
                    className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300 touch-manipulation">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-700 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-gray-300 text-sm">
                <span>{t('pos.subtotal')}</span>
                <span>{fmt(cartTotal)} Ft</span>
              </div>
              <div className="flex justify-between text-gray-300 text-sm">
                <span>{t('pos.vat')} (27%)</span>
                <span>{fmt(cartVat)} Ft</span>
              </div>
              <div className="flex justify-between text-white text-xl font-bold pt-1">
                <span>{t('pos.total')}</span>
                <span>{fmt(cartGross)} Ft</span>
              </div>
            </div>

            {/* Payment buttons — large touchscreen-friendly */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => executeSale('cash')}
                disabled={cart.length === 0 || loading || summary?.isClosed}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500
                           disabled:opacity-40 text-white font-semibold rounded-xl text-lg touch-manipulation"
              >
                <Banknote className="w-6 h-6" />
                {t('pos.pay_cash')}
              </button>
              <button
                onClick={() => executeSale('card')}
                disabled={cart.length === 0 || loading || summary?.isClosed}
                className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500
                           disabled:opacity-40 text-white font-semibold rounded-xl text-lg touch-manipulation"
              >
                <CreditCard className="w-6 h-6" />
                {t('pos.pay_card')}
              </button>
              <button
                onClick={() => executeSale('transfer')}
                disabled={cart.length === 0 || loading || summary?.isClosed}
                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600
                           disabled:opacity-40 text-white font-medium rounded-xl touch-manipulation"
              >
                <ArrowLeftRight className="w-5 h-5" />
                {t('pos.pay_transfer')}
              </button>
            </div>
          </div>
        </div>

        {/* Daily closing modal */}
        {closingModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700">
              <h3 className="text-white text-lg font-semibold">{t('pos.close_day')}</h3>
              {summary && (
                <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>{t('pos.expected_cash')}</span>
                    <span className="text-white font-semibold">{fmt(summary.totalCash - summary.totalRefunds)} Ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('pos.card_total')}</span>
                    <span>{fmt(summary.totalCard)} Ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('pos.transactions')}</span>
                    <span>{summary.transactionCount}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('pos.actual_cash')}</label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('pos.notes')}</label>
                <textarea
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={closeDay} disabled={loading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg">
                  {t('pos.confirm_close')}
                </button>
                <button onClick={() => setClosingModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── History View ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DashboardSectionHeader title={t('pos.history')} />
        <button onClick={() => setView('pos')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm">
          <ShoppingCart className="w-4 h-4" />
          {t('pos.back_to_register')}
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="text-left px-4 py-3">{t('pos.receipt')}</th>
              <th className="text-left px-4 py-3">{t('pos.date')}</th>
              <th className="text-left px-4 py-3">{t('pos.cashier')}</th>
              <th className="text-left px-4 py-3">{t('pos.payment')}</th>
              <th className="text-right px-4 py-3">{t('pos.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {transactions.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-500 py-8">{t('pos.no_transactions')}</td></tr>
            )}
            {transactions.map(tx => (
              <tr key={tx.id} className={`hover:bg-gray-800/50 ${tx.isRefund ? 'text-red-400' : 'text-gray-200'}`}>
                <td className="px-4 py-3 font-mono text-sm">{tx.receiptNumber}</td>
                <td className="px-4 py-3">{new Date(tx.date).toLocaleString('hu-HU')}</td>
                <td className="px-4 py-3">{tx.cashierName}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    tx.paymentMethod === 'cash' ? 'bg-emerald-900/50 text-emerald-400' :
                    tx.paymentMethod === 'card' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {t(`pos.pay_${tx.paymentMethod}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {tx.isRefund ? '-' : ''}{fmt(Math.abs(tx.total))} Ft
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
