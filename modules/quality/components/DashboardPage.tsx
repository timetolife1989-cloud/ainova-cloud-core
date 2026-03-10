'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ShieldCheck, Plus, X, Check, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Inspection {
  id: number; inspectionDate: string; productCode: string | null; productName: string | null;
  batchNumber: string | null; inspector: string | null; totalChecked: number; passedCount: number;
  rejectedCount: number; rejectCode: string | null; status: string;
}

export default function QualityDashboardPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProduct, setFormProduct] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formTotal, setFormTotal] = useState(0);
  const [formPassed, setFormPassed] = useState(0);
  const [formRejectCode, setFormRejectCode] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/quality/data');
      if (res.ok) {
        const json = await res.json() as { inspections: Inspection[] };
        setInspections(json.inspections);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/quality/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ inspectionDate: formDate, productName: formProduct || undefined, batchNumber: formBatch || undefined, totalChecked: formTotal, passedCount: formPassed, rejectCode: formRejectCode || undefined }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      setModalOpen(false); setFormProduct(''); setFormBatch(''); setFormTotal(0); setFormPassed(0); setFormRejectCode('');
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Hiba'); }
    finally { setSaving(false); }
  };

  const totalChecked = inspections.reduce((s, i) => s + i.totalChecked, 0);
  const totalPassed = inspections.reduce((s, i) => s + i.passedCount, 0);
  const totalRejected = inspections.reduce((s, i) => s + i.rejectedCount, 0);
  const passRate = totalChecked > 0 ? Math.round((totalPassed / totalChecked) * 100) : 0;

  if (loading) return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title="Minőségellenőrzés" subtitle="Mérések és selejtezés" /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Minőségellenőrzés" subtitle="Mérések és selejtezés" />
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Új vizsgálat</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><p className="text-xs text-gray-500">Vizsgált</p><p className="text-2xl font-bold text-white">{totalChecked.toLocaleString()}</p></div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-xs text-gray-500">Megfelelt</p></div><p className="text-2xl font-bold text-green-400">{totalPassed.toLocaleString()}</p></div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-gray-500">Selejt</p></div><p className="text-2xl font-bold text-red-400">{totalRejected.toLocaleString()}</p></div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><p className="text-xs text-gray-500">Megfelelési arány</p><p className={`text-2xl font-bold ${passRate >= 95 ? 'text-green-400' : passRate >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{passRate}%</p></div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr><th className="px-4 py-3 text-left">Dátum</th><th className="px-4 py-3 text-left">Termék</th><th className="px-4 py-3 text-left">Batch</th><th className="px-4 py-3 text-right">Vizsgált</th><th className="px-4 py-3 text-right">Jó</th><th className="px-4 py-3 text-right">Selejt</th><th className="px-4 py-3 text-right">%</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {inspections.slice(0, 20).map(i => (
              <tr key={i.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-300">{i.inspectionDate}</td>
                <td className="px-4 py-3 text-white">{i.productName ?? i.productCode ?? '-'}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i.batchNumber ?? '-'}</td>
                <td className="px-4 py-3 text-right text-gray-300">{i.totalChecked}</td>
                <td className="px-4 py-3 text-right text-green-400">{i.passedCount}</td>
                <td className="px-4 py-3 text-right text-red-400">{i.rejectedCount}</td>
                <td className="px-4 py-3 text-right font-medium text-white">{i.totalChecked > 0 ? Math.round((i.passedCount / i.totalChecked) * 100) : 0}%</td>
              </tr>
            ))}
            {inspections.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500"><ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />Nincs vizsgálat</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white">Új vizsgálat</h3><button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Dátum</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Batch szám</label><input type="text" value={formBatch} onChange={e => setFormBatch(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">Termék</label><input type="text" value={formProduct} onChange={e => setFormProduct(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Vizsgált</label><input type="number" value={formTotal} onChange={e => setFormTotal(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Megfelelt</label><input type="number" value={formPassed} onChange={e => setFormPassed(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Hibakód</label><input type="text" value={formRejectCode} onChange={e => setFormRejectCode(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
