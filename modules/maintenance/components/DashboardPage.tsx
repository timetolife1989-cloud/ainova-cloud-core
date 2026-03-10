'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Wrench, Plus, X, Check, AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface Schedule {
  id: number; assetId: number; assetName: string; taskName: string;
  intervalDays: number; lastDoneDate: string | null; nextDueDate: string | null;
  priority: string; assignedTo: string | null; isOverdue: boolean;
}
interface Asset { id: number; code: string; name: string; type: string | null; }

export default function MaintenanceDashboardPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formAsset, setFormAsset] = useState(0);
  const [formTask, setFormTask] = useState('');
  const [formInterval, setFormInterval] = useState(30);
  const [formPriority, setFormPriority] = useState('normal');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/maintenance/data');
      if (res.ok) {
        const json = await res.json() as { assets: Asset[]; schedules: Schedule[]; overdueCount: number };
        setAssets(json.assets);
        setSchedules(json.schedules);
        setOverdueCount(json.overdueCount);
        if (json.assets[0]) setFormAsset(json.assets[0].id);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    if (!formTask.trim()) { setError('Feladat neve kötelező'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/maintenance/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ assetId: formAsset, taskName: formTask, intervalDays: formInterval, priority: formPriority }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      setModalOpen(false); setFormTask(''); setFormInterval(30);
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Hiba'); }
    finally { setSaving(false); }
  };

  if (loading) return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title="Karbantartás" subtitle="Ütemezés és alertek" /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Karbantartás" subtitle="Ütemezés, MTBF/MTTR, esedékességek" />
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Új ütemezés</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><Wrench className="w-5 h-5 text-stone-400" /><div><p className="text-xs text-gray-500">Ütemezések</p><p className="text-2xl font-bold text-white">{schedules.length}</p></div></div></div>
        <div className={`bg-gray-900 border rounded-xl p-4 ${overdueCount > 0 ? 'border-red-800' : 'border-gray-800'}`}><div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" /><div><p className="text-xs text-gray-500">Esedékes</p><p className="text-2xl font-bold text-red-400">{overdueCount}</p></div></div></div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400" /><div><p className="text-xs text-gray-500">Eszközök</p><p className="text-2xl font-bold text-white">{assets.length}</p></div></div></div>
      </div>

      <div className="space-y-2">
        {schedules.map(s => (
          <div key={s.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between ${s.isOverdue ? 'border-red-800' : 'border-gray-800'}`}>
            <div className="flex items-center gap-4">
              {s.isOverdue ? <AlertCircle className="w-5 h-5 text-red-400" /> : <Clock className="w-5 h-5 text-gray-500" />}
              <div>
                <p className="text-white font-medium">{s.taskName}</p>
                <p className="text-xs text-gray-500">{s.assetName} • Minden {s.intervalDays} nap{s.assignedTo ? ` • ${s.assignedTo}` : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${s.isOverdue ? 'text-red-400' : 'text-gray-300'}`}>{s.nextDueDate ?? 'N/A'}</p>
              <p className="text-xs text-gray-500">{s.lastDoneDate ? `Utolsó: ${s.lastDoneDate}` : 'Még nem volt'}</p>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nincs karbantartási ütemezés</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white">Új karbantartás ütemezés</h3><button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1">Eszköz</label><select value={formAsset} onChange={e => setFormAsset(parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">{assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1">Feladat *</label><input type="text" value={formTask} onChange={e => setFormTask(e.target.value)} placeholder="pl. Olajcsere, szűrő csere" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Intervallum (nap)</label><input type="number" value={formInterval} onChange={e => setFormInterval(parseInt(e.target.value) || 30)} min={1} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Prioritás</label><select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="critical">Kritikus</option></select></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
