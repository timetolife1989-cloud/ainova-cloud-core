'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Truck, Plus, X, Check, AlertTriangle, Package, DollarSign, Scale } from 'lucide-react';

interface DeliveryShipment {
  id: number;
  shipmentDate: string;
  customerName: string;
  customerCode: string | null;
  orderNumber: string | null;
  quantity: number;
  weight: number | null;
  value: number | null;
  status: string;
}

const STATUSES = [
  { value: 'pending', label: 'Függőben', color: 'bg-gray-500' },
  { value: 'shipped', label: 'Elküldve', color: 'bg-blue-500' },
  { value: 'delivered', label: 'Kézbesítve', color: 'bg-green-500' },
  { value: 'returned', label: 'Visszaküldve', color: 'bg-red-500' },
];

export default function DeliveryDashboardPage() {
  const [shipments, setShipments] = useState<DeliveryShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCustomer, setFormCustomer] = useState('');
  const [formOrder, setFormOrder] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formWeight, setFormWeight] = useState<number | ''>('');
  const [formValue, setFormValue] = useState<number | ''>('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/delivery/data');
      if (res.ok) {
        const json = await res.json() as { items: DeliveryShipment[] };
        setShipments(json.items);
      }
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    if (!formCustomer.trim()) { setError('Vevő neve kötelező'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/modules/delivery/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          shipmentDate: formDate,
          customerName: formCustomer,
          orderNumber: formOrder || undefined,
          quantity: formQuantity,
          weight: formWeight !== '' ? formWeight : undefined,
          value: formValue !== '' ? formValue : undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      setModalOpen(false);
      setFormCustomer(''); setFormOrder(''); setFormQuantity(0); setFormWeight(''); setFormValue('');
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setSaving(false);
    }
  };

  // Summary
  const totalShipments = shipments.length;
  const totalValue = shipments.reduce((sum, s) => sum + (s.value ?? 0), 0);
  const totalWeight = shipments.reduce((sum, s) => sum + (s.weight ?? 0), 0);
  const deliveredCount = shipments.filter(s => s.status === 'delivered').length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Kiszállítás" subtitle="Szállítmányok és értékek" />
        <div className="animate-pulse mt-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Kiszállítás" subtitle="Szállítmányok és értékek" />
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Új szállítmány
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-900/30 rounded-lg"><Package className="w-5 h-5 text-orange-400" /></div>
            <div><p className="text-xs text-gray-500">Szállítmányok</p><p className="text-2xl font-bold text-white">{totalShipments}</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg"><Truck className="w-5 h-5 text-green-400" /></div>
            <div><p className="text-xs text-gray-500">Kézbesítve</p><p className="text-2xl font-bold text-white">{deliveredCount}</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg"><DollarSign className="w-5 h-5 text-blue-400" /></div>
            <div><p className="text-xs text-gray-500">Össz. érték</p><p className="text-2xl font-bold text-white">{totalValue.toLocaleString()} Ft</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg"><Scale className="w-5 h-5 text-purple-400" /></div>
            <div><p className="text-xs text-gray-500">Össz. súly</p><p className="text-2xl font-bold text-white">{totalWeight.toLocaleString()} kg</p></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Dátum</th>
              <th className="px-4 py-3 text-left">Vevő</th>
              <th className="px-4 py-3 text-left">Rendelés</th>
              <th className="px-4 py-3 text-right">Mennyiség</th>
              <th className="px-4 py-3 text-right">Súly</th>
              <th className="px-4 py-3 text-right">Érték</th>
              <th className="px-4 py-3 text-center">Státusz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {shipments.slice(0, 20).map(s => (
              <tr key={s.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-300">{s.shipmentDate}</td>
                <td className="px-4 py-3 text-white">{s.customerName}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.orderNumber ?? '-'}</td>
                <td className="px-4 py-3 text-right text-gray-300">{s.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-400">{s.weight ?? '-'}</td>
                <td className="px-4 py-3 text-right text-gray-300">{s.value?.toLocaleString() ?? '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-xs rounded ${STATUSES.find(st => st.value === s.status)?.color} text-white`}>
                    {STATUSES.find(st => st.value === s.status)?.label}
                  </span>
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500"><Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />Nincs szállítmány</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Új szállítmány</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Dátum</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Rendelés szám</label><input type="text" value={formOrder} onChange={e => setFormOrder(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">Vevő *</label><input type="text" value={formCustomer} onChange={e => setFormCustomer(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Mennyiség</label><input type="number" value={formQuantity} onChange={e => setFormQuantity(parseInt(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Súly (kg)</label><input type="number" value={formWeight} onChange={e => setFormWeight(e.target.value ? parseFloat(e.target.value) : '')} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Érték (Ft)</label><input type="number" value={formValue} onChange={e => setFormValue(e.target.value ? parseFloat(e.target.value) : '')} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
