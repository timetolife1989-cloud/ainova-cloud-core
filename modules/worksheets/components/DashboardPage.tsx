'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ClipboardList, Clock, Wrench, Package, FileText, X, ChevronRight } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface WorkOrder {
  id: number;
  order_number: string;
  customer_name: string | null;
  subject: string;
  status: string;
  priority: string;
  assigned_to_name: string | null;
  total_cost: number;
  created_at: string;
}

interface LaborEntry {
  description: string | null;
  hours: number;
  rate: number;
  total: number;
  worker_name: string | null;
  work_date: string;
}

interface MaterialEntry {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-gray-600',
  diagnosing: 'bg-amber-600',
  in_progress: 'bg-blue-600',
  testing: 'bg-purple-600',
  completed: 'bg-emerald-600',
  invoiced: 'bg-teal-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function fmt(n: number): string {
  return new Intl.NumberFormat('hu-HU').format(Math.round(n));
}

export default function WorksheetsDashboardPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    order: Record<string, unknown>;
    labor: LaborEntry[];
    materials: MaterialEntry[];
  } | null>(null);

  // New order form
  const [newOrder, setNewOrder] = useState({
    customerName: '', subject: '', subjectId: '', faultDesc: '', priority: 'normal',
  });

  // Add labor form
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [newLabor, setNewLabor] = useState({ description: '', hours: '' });

  // Add material form
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ productName: '', quantity: '', unitPrice: '', unit: 'db' });

  const loadOrders = useCallback(async () => {
    const url = statusFilter
      ? `/api/modules/worksheets/orders?status=${encodeURIComponent(statusFilter)}`
      : '/api/modules/worksheets/orders';
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch { /* ignore */ }
  }, [statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/modules/worksheets/orders/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const createOrder = async () => {
    if (!newOrder.customerName.trim() || !newOrder.subject.trim()) return;
    try {
      const res = await fetch('/api/modules/worksheets/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify(newOrder),
      });
      if (res.ok) {
        setShowNewOrder(false);
        setNewOrder({ customerName: '', subject: '', subjectId: '', faultDesc: '', priority: 'normal' });
        loadOrders();
      }
    } catch { /* ignore */ }
  };

  const changeStatus = async (nextStatus: string) => {
    if (!selectedId) return;
    try {
      await fetch(`/api/modules/worksheets/orders/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({ status: nextStatus }),
      });
      loadDetail(selectedId);
      loadOrders();
    } catch { /* ignore */ }
  };

  const addLabor = async () => {
    if (!selectedId || !newLabor.hours) return;
    try {
      const res = await fetch('/api/modules/worksheets/labor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          orderId: selectedId,
          description: newLabor.description,
          hours: parseFloat(newLabor.hours),
        }),
      });
      if (res.ok) {
        setShowAddLabor(false);
        setNewLabor({ description: '', hours: '' });
        loadDetail(selectedId);
      }
    } catch { /* ignore */ }
  };

  const addMaterial = async () => {
    if (!selectedId || !newMaterial.productName || !newMaterial.quantity || !newMaterial.unitPrice) return;
    try {
      const res = await fetch('/api/modules/worksheets/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          orderId: selectedId,
          productName: newMaterial.productName,
          quantity: parseFloat(newMaterial.quantity),
          unitPrice: parseFloat(newMaterial.unitPrice),
          unit: newMaterial.unit,
        }),
      });
      if (res.ok) {
        setShowAddMaterial(false);
        setNewMaterial({ productName: '', quantity: '', unitPrice: '', unit: 'db' });
        loadDetail(selectedId);
      }
    } catch { /* ignore */ }
  };

  const generateInvoice = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/modules/worksheets/orders/${selectedId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
      });
      if (res.ok) {
        loadDetail(selectedId);
        loadOrders();
      }
    } catch { /* ignore */ }
  };

  // Status flow next steps
  const getNextStatuses = (current: string): string[] => {
    const flow: Record<string, string[]> = {
      received: ['diagnosing', 'in_progress'],
      diagnosing: ['in_progress'],
      in_progress: ['testing', 'completed'],
      testing: ['in_progress', 'completed'],
    };
    return flow[current] ?? [];
  };

  return (
    <div className="space-y-4">
      <DashboardSectionHeader title={t('worksheets.title')} subtitle={t('worksheets.description')} />

      {/* ─── Order List View ─── */}
      {!selectedId && (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value="">{t('worksheets.all_statuses')}</option>
              {['received', 'diagnosing', 'in_progress', 'testing', 'completed', 'invoiced'].map(s => (
                <option key={s} value={s}>{t(`worksheets.status_${s}`)}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowNewOrder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> {t('worksheets.new_order')}
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">{t('worksheets.order_number')}</th>
                  <th className="text-left px-4 py-3">{t('worksheets.customer')}</th>
                  <th className="text-left px-4 py-3">{t('worksheets.subject')}</th>
                  <th className="text-left px-4 py-3">{t('worksheets.status')}</th>
                  <th className="text-left px-4 py-3">{t('worksheets.priority_label')}</th>
                  <th className="text-right px-4 py-3">{t('worksheets.total')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-8">{t('worksheets.no_orders')}</td></tr>
                )}
                {orders.map(o => (
                  <tr key={o.id} onClick={() => setSelectedId(o.id)}
                    className="hover:bg-gray-800/50 cursor-pointer text-gray-200">
                    <td className="px-4 py-3 font-mono text-teal-400">{o.order_number}</td>
                    <td className="px-4 py-3">{o.customer_name}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{o.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STATUS_COLORS[o.status] ?? 'bg-gray-600'}`}>
                        {t(`worksheets.status_${o.status}`)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${PRIORITY_COLORS[o.priority] ?? ''}`}>
                      {t(`worksheets.priority_${o.priority}`)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(o.total_cost)} Ft</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Order Detail View ─── */}
      {selectedId && detail && (
        <div className="space-y-4">
          <button onClick={() => { setSelectedId(null); setDetail(null); }}
            className="text-sm text-teal-400 hover:text-teal-300">
            &larr; {t('worksheets.back_to_list')}
          </button>

          {/* Order header */}
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl text-white font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-400" />
                  {String(detail.order.order_number)}
                </h3>
                <p className="text-gray-400 text-sm mt-1">{String(detail.order.customer_name ?? '')}</p>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-medium text-white ${STATUS_COLORS[String(detail.order.status)] ?? 'bg-gray-600'}`}>
                {t(`worksheets.status_${String(detail.order.status)}`)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">{t('worksheets.subject')}</span>
                <span className="text-white">{String(detail.order.subject)}</span>
              </div>
              {detail.order.subject_id ? (
                <div>
                  <span className="text-gray-500 block">{t('worksheets.subject_id')}</span>
                  <span className="text-white">{String(detail.order.subject_id)}</span>
                </div>
              ) : null}
              {detail.order.fault_desc ? (
                <div className="col-span-2">
                  <span className="text-gray-500 block">{t('worksheets.fault_desc')}</span>
                  <span className="text-white">{String(detail.order.fault_desc)}</span>
                </div>
              ) : null}
            </div>

            {/* Status workflow buttons */}
            {getNextStatuses(String(detail.order.status)).length > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                {getNextStatuses(String(detail.order.status)).map(ns => (
                  <button key={ns} onClick={() => changeStatus(ns)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${STATUS_COLORS[ns]}`}>
                    {t(`worksheets.status_${ns}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Invoice button */}
            {detail.order.status === 'completed' && !detail.order.invoice_id && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button onClick={generateInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm">
                  <FileText className="w-4 h-4" /> {t('worksheets.generate_invoice')}
                </button>
              </div>
            )}
          </div>

          {/* Costs summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-xl text-white font-bold">{fmt(Number(detail.order.total_labor))} Ft</p>
              <p className="text-xs text-gray-400">{t('worksheets.labor_cost')}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <Package className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xl text-white font-bold">{fmt(Number(detail.order.total_materials))} Ft</p>
              <p className="text-xs text-gray-400">{t('worksheets.material_cost')}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <Wrench className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl text-white font-bold">{fmt(Number(detail.order.total_cost))} Ft</p>
              <p className="text-xs text-gray-400">{t('worksheets.total_cost')}</p>
            </div>
          </div>

          {/* Labor entries */}
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> {t('worksheets.labor_entries')}
              </h4>
              {detail.order.status !== 'invoiced' && (
                <button onClick={() => setShowAddLabor(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs">
                  <Plus className="w-3 h-3" /> {t('worksheets.add_labor')}
                </button>
              )}
            </div>
            {detail.labor.length === 0 && <p className="text-gray-500 text-sm">{t('worksheets.no_labor')}</p>}
            <div className="space-y-2">
              {detail.labor.map((l, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <span className="text-white">{l.description ?? t('worksheets.labor_default')}</span>
                    <span className="text-gray-500 ml-2">({l.worker_name ?? ''})</span>
                  </div>
                  <span className="text-gray-400">{l.hours}h × {fmt(l.rate)} Ft</span>
                  <span className="text-blue-400 font-semibold">{fmt(l.total)} Ft</span>
                </div>
              ))}
            </div>
          </div>

          {/* Material entries */}
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" /> {t('worksheets.material_entries')}
              </h4>
              {detail.order.status !== 'invoiced' && (
                <button onClick={() => setShowAddMaterial(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs">
                  <Plus className="w-3 h-3" /> {t('worksheets.add_material')}
                </button>
              )}
            </div>
            {detail.materials.length === 0 && <p className="text-gray-500 text-sm">{t('worksheets.no_materials')}</p>}
            <div className="space-y-2">
              {detail.materials.map((m, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <span className="text-white">{m.product_name}</span>
                  </div>
                  <span className="text-gray-400">{m.quantity} {m.unit} × {fmt(m.unit_price)} Ft</span>
                  <span className="text-amber-400 font-semibold">{fmt(m.total)} Ft</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── New Order Modal ─── */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('worksheets.new_order')}</h3>
              <button onClick={() => setShowNewOrder(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input placeholder={t('worksheets.customer')} value={newOrder.customerName}
              onChange={e => setNewOrder(p => ({ ...p, customerName: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <input placeholder={t('worksheets.subject')} value={newOrder.subject}
              onChange={e => setNewOrder(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <input placeholder={t('worksheets.subject_id')} value={newOrder.subjectId}
              onChange={e => setNewOrder(p => ({ ...p, subjectId: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <textarea placeholder={t('worksheets.fault_desc')} value={newOrder.faultDesc} rows={3}
              onChange={e => setNewOrder(p => ({ ...p, faultDesc: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <select value={newOrder.priority} onChange={e => setNewOrder(p => ({ ...p, priority: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value="low">{t('worksheets.priority_low')}</option>
              <option value="normal">{t('worksheets.priority_normal')}</option>
              <option value="high">{t('worksheets.priority_high')}</option>
              <option value="urgent">{t('worksheets.priority_urgent')}</option>
            </select>
            <div className="flex gap-3">
              <button onClick={createOrder}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowNewOrder(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Labor Modal ─── */}
      {showAddLabor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('worksheets.add_labor')}</h3>
              <button onClick={() => setShowAddLabor(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input placeholder={t('worksheets.labor_description')} value={newLabor.description}
              onChange={e => setNewLabor(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <input placeholder={t('worksheets.hours')} type="number" step="0.5" min="0.1" value={newLabor.hours}
              onChange={e => setNewLabor(p => ({ ...p, hours: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <div className="flex gap-3">
              <button onClick={addLabor}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowAddLabor(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Material Modal ─── */}
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('worksheets.add_material')}</h3>
              <button onClick={() => setShowAddMaterial(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input placeholder={t('worksheets.product_name')} value={newMaterial.productName}
              onChange={e => setNewMaterial(p => ({ ...p, productName: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input placeholder={t('worksheets.quantity')} type="number" step="0.001" value={newMaterial.quantity}
                onChange={e => setNewMaterial(p => ({ ...p, quantity: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder={t('worksheets.unit')} value={newMaterial.unit}
                onChange={e => setNewMaterial(p => ({ ...p, unit: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder={t('worksheets.unit_price')} type="number" value={newMaterial.unitPrice}
                onChange={e => setNewMaterial(p => ({ ...p, unitPrice: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={addMaterial}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowAddMaterial(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
