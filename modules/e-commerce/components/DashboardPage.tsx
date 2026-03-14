'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, RefreshCw, Link2, ShoppingCart, Package, X, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';

interface Connection {
  id: number;
  platform: string;
  store_name: string;
  store_url: string;
  is_active: boolean;
  last_sync: string | null;
  sync_interval: number;
  sync_stock: boolean;
  sync_price: boolean;
  sync_orders: boolean;
  created_at: string;
}

interface ProductMap {
  id: number;
  connection_id: number;
  local_product_id: number;
  remote_product_id: string;
  remote_sku: string | null;
  sync_stock: boolean;
  sync_price: boolean;
  last_synced: string | null;
  local_name: string | null;
  local_stock: number | null;
}

interface Order {
  id: number;
  connection_id: number;
  remote_order_id: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  status: string;
  processed_at: string | null;
  created_at: string;
}

type Tab = 'connections' | 'products' | 'orders';

export default function EcommerceDashboardPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [tab, setTab] = useState<Tab>('connections');

  // Connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showNewConn, setShowNewConn] = useState(false);
  const [cPlatform, setCPlatform] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [cName, setCName] = useState('');
  const [cUrl, setCUrl] = useState('');
  const [cApiKey, setCApiKey] = useState('');
  const [cApiSecret, setCApiSecret] = useState('');

  // Products
  const [products, setProducts] = useState<ProductMap[]>([]);
  const [selectedConn, setSelectedConn] = useState<number | null>(null);
  const [showNewMap, setShowNewMap] = useState(false);
  const [mLocalId, setMLocalId] = useState('');
  const [mRemoteId, setMRemoteId] = useState('');
  const [mSku, setMSku] = useState('');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);

  // Sync
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  }), [csrfToken]);

  // ── Loaders ──────────────────────────────────────────
  const loadConnections = useCallback(async () => {
    const res = await fetch('/api/modules/e-commerce/connections');
    if (res.ok) {
      const data = await res.json() as { connections: Connection[] };
      setConnections(data.connections ?? []);
    }
  }, []);

  const loadProducts = useCallback(async (connId: number) => {
    const res = await fetch(`/api/modules/e-commerce/products?connectionId=${connId}`);
    if (res.ok) {
      const data = await res.json() as { products: ProductMap[] };
      setProducts(data.products ?? []);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    const params = selectedConn ? `?connectionId=${selectedConn}` : '';
    const res = await fetch(`/api/modules/e-commerce/orders${params}`);
    if (res.ok) {
      const data = await res.json() as { orders: Order[] };
      setOrders(data.orders ?? []);
    }
  }, [selectedConn]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (tab === 'products' && selectedConn) loadProducts(selectedConn);
    if (tab === 'orders') loadOrders();
  }, [tab, selectedConn, loadProducts, loadOrders]);

  // ── Actions ──────────────────────────────────────────
  const createConnection = async () => {
    const res = await fetch('/api/modules/e-commerce/connections', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        platform: cPlatform,
        storeName: cName,
        storeUrl: cUrl,
        apiKey: cApiKey,
        apiSecret: cApiSecret || undefined,
      }),
    });
    if (res.ok) {
      setShowNewConn(false);
      setCName(''); setCUrl(''); setCApiKey(''); setCApiSecret('');
      await loadConnections();
    }
  };

  const toggleConnection = async (conn: Connection) => {
    await fetch('/api/modules/e-commerce/connections', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id: conn.id, isActive: !conn.is_active }),
    });
    await loadConnections();
  };

  const createMapping = async () => {
    if (!selectedConn) return;
    const res = await fetch('/api/modules/e-commerce/products', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        connectionId: selectedConn,
        localProductId: parseInt(mLocalId, 10),
        remoteProductId: mRemoteId,
        remoteSku: mSku || undefined,
      }),
    });
    if (res.ok) {
      setShowNewMap(false);
      setMLocalId(''); setMRemoteId(''); setMSku('');
      await loadProducts(selectedConn);
    }
  };

  const deleteMapping = async (id: number) => {
    await fetch(`/api/modules/e-commerce/products?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (selectedConn) await loadProducts(selectedConn);
  };

  const triggerSync = async (connId: number) => {
    setSyncing(connId);
    setSyncMsg('');
    const res = await fetch('/api/modules/e-commerce/sync', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ connectionId: connId }),
    });
    const data = await res.json() as { ok: boolean; stockUpdated?: number; ordersImported?: number; errors?: string[] };
    setSyncing(null);
    if (data.ok) {
      setSyncMsg(`${t('ecommerce.sync_done')}: ${data.stockUpdated ?? 0} stock, ${data.ordersImported ?? 0} orders`);
      await loadConnections();
    } else {
      setSyncMsg(data.errors?.[0] ?? 'Sync failed');
    }
  };

  const platformLabel = (p: string) => p === 'woocommerce' ? 'WooCommerce' : 'Shopify';
  const platformColor = (p: string) => p === 'woocommerce' ? 'bg-purple-600' : 'bg-green-600';

  // ── UI ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <DashboardSectionHeader title={t('ecommerce.title')} subtitle={t('ecommerce.subtitle')} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(['connections', 'products', 'orders'] as Tab[]).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition ${tab === tb ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
          >
            {tb === 'connections' && <Link2 className="inline w-4 h-4 mr-1" />}
            {tb === 'products' && <Package className="inline w-4 h-4 mr-1" />}
            {tb === 'orders' && <ShoppingCart className="inline w-4 h-4 mr-1" />}
            {t(`ecommerce.tab_${tb}`)}
          </button>
        ))}
      </div>

      {syncMsg && (
        <div className="bg-blue-500/20 text-blue-200 p-3 rounded text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {syncMsg}
        </div>
      )}

      {/* ──── Connections Tab ──── */}
      {tab === 'connections' && (
        <div className="space-y-4">
          <button onClick={() => setShowNewConn(true)}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> {t('ecommerce.add_connection')}
          </button>

          <div className="grid gap-4 md:grid-cols-2">
            {connections.map((c) => (
              <div key={c.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded text-white ${platformColor(c.platform)}`}>
                      {platformLabel(c.platform)}
                    </span>
                    <h3 className="font-medium text-white">{c.store_name}</h3>
                  </div>
                  <button onClick={() => toggleConnection(c)}
                    className={`text-xs px-2 py-1 rounded ${c.is_active ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}
                  >
                    {c.is_active ? t('ecommerce.active') : t('ecommerce.inactive')}
                  </button>
                </div>
                <p className="text-white/50 text-xs mb-2 truncate">{c.store_url}</p>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{t('ecommerce.last_sync')}: {c.last_sync ? new Date(c.last_sync).toLocaleString() : '—'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedConn(c.id); setTab('products'); }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button onClick={() => triggerSync(c.id)} disabled={syncing === c.id || !c.is_active}
                      className="text-cyan-400 hover:text-cyan-300 disabled:opacity-30"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === c.id ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {connections.length === 0 && (
            <div className="text-center text-white/30 py-8">
              <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('ecommerce.no_connections')}</p>
            </div>
          )}
        </div>
      )}

      {/* ──── Products Tab ──── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select value={selectedConn ?? ''} onChange={(e) => setSelectedConn(parseInt(e.target.value, 10) || null)}
              className="bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm"
            >
              <option value="">{t('ecommerce.select_connection')}</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.store_name} ({platformLabel(c.platform)})</option>
              ))}
            </select>
            {selectedConn && (
              <button onClick={() => setShowNewMap(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> {t('ecommerce.add_mapping')}
              </button>
            )}
          </div>

          {selectedConn && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-white/50 border-b border-white/10">
                  <tr>
                    <th className="py-2 px-3">{t('ecommerce.local_product')}</th>
                    <th className="py-2 px-3">{t('ecommerce.remote_id')}</th>
                    <th className="py-2 px-3">{t('ecommerce.stock')}</th>
                    <th className="py-2 px-3">{t('ecommerce.last_synced')}</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 text-white/70">
                      <td className="py-2 px-3">{p.local_name ?? `#${p.local_product_id}`}</td>
                      <td className="py-2 px-3 font-mono text-xs">{p.remote_product_id}</td>
                      <td className="py-2 px-3">{p.local_stock ?? '—'}</td>
                      <td className="py-2 px-3 text-xs">{p.last_synced ? new Date(p.last_synced).toLocaleString() : '—'}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => deleteMapping(p.id)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && (
                <p className="text-center text-white/30 py-4">{t('ecommerce.no_mappings')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──── Orders Tab ──── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-white/50 border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">{t('ecommerce.order_id')}</th>
                  <th className="py-2 px-3">{t('ecommerce.customer')}</th>
                  <th className="py-2 px-3">{t('ecommerce.amount')}</th>
                  <th className="py-2 px-3">{t('ecommerce.status')}</th>
                  <th className="py-2 px-3">{t('ecommerce.date')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 text-white/70">
                    <td className="py-2 px-3 font-mono text-xs">{o.remote_order_id}</td>
                    <td className="py-2 px-3">{o.customer_name ?? '—'}</td>
                    <td className="py-2 px-3">
                      {o.total_amount != null ? `${o.total_amount.toLocaleString()} ${o.currency}` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        o.status === 'new' ? 'bg-blue-600/20 text-blue-300' :
                        o.status === 'processed' ? 'bg-green-600/20 text-green-300' :
                        'bg-gray-600/20 text-gray-300'
                      }`}>{o.status}</span>
                    </td>
                    <td className="py-2 px-3 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center text-white/30 py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('ecommerce.no_orders')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──── New Connection Modal ──── */}
      {showNewConn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowNewConn(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{t('ecommerce.new_connection')}</h3>
              <button onClick={() => setShowNewConn(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.platform')}</label>
                <select value={cPlatform} onChange={(e) => setCPlatform(e.target.value as 'woocommerce' | 'shopify')}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm"
                >
                  <option value="woocommerce">WooCommerce</option>
                  <option value="shopify">Shopify</option>
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.store_name')}</label>
                <input value={cName} onChange={(e) => setCName(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm"
                  placeholder="My Store" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.store_url')}</label>
                <input value={cUrl} onChange={(e) => setCUrl(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm"
                  placeholder="https://mystore.com" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.api_key')}</label>
                <input value={cApiKey} onChange={(e) => setCApiKey(e.target.value)} type="password"
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
              </div>
              {cPlatform === 'woocommerce' && (
                <div>
                  <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.api_secret')}</label>
                  <input value={cApiSecret} onChange={(e) => setCApiSecret(e.target.value)} type="password"
                    className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowNewConn(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">{t('common.cancel')}</button>
              <button onClick={createConnection} disabled={!cName || !cUrl || !cApiKey}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded text-sm disabled:opacity-30"
              >{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── New Mapping Modal ──── */}
      {showNewMap && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowNewMap(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{t('ecommerce.new_mapping')}</h3>
              <button onClick={() => setShowNewMap(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.local_product_id')}</label>
                <input value={mLocalId} onChange={(e) => setMLocalId(e.target.value)} type="number"
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.remote_product_id')}</label>
                <input value={mRemoteId} onChange={(e) => setMRemoteId(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('ecommerce.sku')}</label>
                <input value={mSku} onChange={(e) => setMSku(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowNewMap(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">{t('common.cancel')}</button>
              <button onClick={createMapping} disabled={!mLocalId || !mRemoteId}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded text-sm disabled:opacity-30"
              >{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
