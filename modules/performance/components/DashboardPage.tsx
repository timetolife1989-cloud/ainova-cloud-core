'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { TrendingUp, Plus, X, Check, AlertTriangle, Users, Clock, Target, Zap } from 'lucide-react';

interface PerformanceEntry {
  id: number;
  entryDate: string;
  workerName: string;
  teamName: string | null;
  taskCode: string | null;
  taskName: string | null;
  quantity: number;
  normTime: number | null;
  actualTime: number | null;
  efficiency: number | null;
}

export default function PerformanceDashboardPage() {
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formWorker, setFormWorker] = useState('');
  const [formTeam, setFormTeam] = useState('');
  const [formTaskCode, setFormTaskCode] = useState('');
  const [formTaskName, setFormTaskName] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formNormTime, setFormNormTime] = useState<number | ''>('');
  const [formActualTime, setFormActualTime] = useState<number | ''>('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/performance/data');
      if (res.ok) {
        const json = await res.json() as { items: PerformanceEntry[] };
        setEntries(json.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!formWorker.trim()) {
      setError('Dolgozó neve kötelező');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/modules/performance/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          entryDate: formDate,
          workerName: formWorker,
          teamName: formTeam || undefined,
          taskCode: formTaskCode || undefined,
          taskName: formTaskName || undefined,
          quantity: formQuantity,
          normTime: formNormTime !== '' ? formNormTime : undefined,
          actualTime: formActualTime !== '' ? formActualTime : undefined,
        }),
      });

      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');

      setModalOpen(false);
      resetForm();
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormWorker('');
    setFormTeam('');
    setFormTaskCode('');
    setFormTaskName('');
    setFormQuantity(0);
    setFormNormTime('');
    setFormActualTime('');
  };

  // Summary calculations
  const todayEntries = entries.filter(e => e.entryDate === new Date().toISOString().split('T')[0]);
  const totalQuantity = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
  const totalNormTime = todayEntries.reduce((sum, e) => sum + (e.normTime ?? 0), 0);
  const totalActualTime = todayEntries.reduce((sum, e) => sum + (e.actualTime ?? 0), 0);
  const avgEfficiency = todayEntries.length > 0
    ? Math.round(todayEntries.reduce((sum, e) => sum + (e.efficiency ?? 0), 0) / todayEntries.length)
    : 0;

  const getEfficiencyColor = (eff: number | null) => {
    if (eff === null) return 'text-gray-400';
    if (eff >= 100) return 'text-green-400';
    if (eff >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Teljesítmény" subtitle="KPI és hatékonyság" />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Teljesítmény" subtitle="Egyéni és csapat KPI dashboard" />
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Új bejegyzés
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Mennyiség (ma)</p>
              <p className="text-2xl font-bold text-white">{totalQuantity}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Normaidő (ma)</p>
              <p className="text-2xl font-bold text-white">{totalNormTime} perc</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Valós idő (ma)</p>
              <p className="text-2xl font-bold text-white">{totalActualTime} perc</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Átlag hatékonyság</p>
              <p className={`text-2xl font-bold ${getEfficiencyColor(avgEfficiency)}`}>{avgEfficiency}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Dátum</th>
              <th className="px-4 py-3 text-left">Dolgozó</th>
              <th className="px-4 py-3 text-left">Csapat</th>
              <th className="px-4 py-3 text-left">Feladat</th>
              <th className="px-4 py-3 text-right">Mennyiség</th>
              <th className="px-4 py-3 text-right">Norma</th>
              <th className="px-4 py-3 text-right">Valós</th>
              <th className="px-4 py-3 text-right">Hatékonyság</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {entries.slice(0, 20).map(entry => (
              <tr key={entry.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-300">{entry.entryDate}</td>
                <td className="px-4 py-3 text-white font-medium">{entry.workerName}</td>
                <td className="px-4 py-3 text-gray-400">{entry.teamName ?? '-'}</td>
                <td className="px-4 py-3 text-gray-400">
                  {entry.taskCode && <span className="text-xs font-mono mr-1">{entry.taskCode}</span>}
                  {entry.taskName ?? '-'}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{entry.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-400">{entry.normTime ?? '-'}</td>
                <td className="px-4 py-3 text-right text-gray-400">{entry.actualTime ?? '-'}</td>
                <td className={`px-4 py-3 text-right font-medium ${getEfficiencyColor(entry.efficiency)}`}>
                  {entry.efficiency !== null ? `${entry.efficiency}%` : '-'}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nincs adat
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Új teljesítmény bejegyzés</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Dátum</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Dolgozó *</label>
                  <input type="text" value={formWorker} onChange={e => setFormWorker(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Csapat</label>
                  <input type="text" value={formTeam} onChange={e => setFormTeam(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Feladat kód</label>
                  <input type="text" value={formTaskCode} onChange={e => setFormTaskCode(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Feladat neve</label>
                <input type="text" value={formTaskName} onChange={e => setFormTaskName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Mennyiség</label>
                  <input type="number" value={formQuantity} onChange={e => setFormQuantity(parseInt(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Normaidő (perc)</label>
                  <input type="number" value={formNormTime} onChange={e => setFormNormTime(e.target.value ? parseInt(e.target.value) : '')} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Valós idő (perc)</label>
                  <input type="number" value={formActualTime} onChange={e => setFormActualTime(e.target.value ? parseInt(e.target.value) : '')} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
