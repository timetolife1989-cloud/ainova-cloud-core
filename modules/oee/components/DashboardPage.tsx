'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { Gauge, Plus, X, Check, AlertTriangle } from 'lucide-react';

interface OeeRecord {
  id: number; machineCode: string; machineName: string; recordDate: string;
  availabilityPct: number | null; performancePct: number | null;
  qualityPct: number | null; oeePct: number | null;
}
interface Machine { id: number; code: string; name: string; }

function getOeeColor(pct: number | null): string {
  if (pct === null) return 'text-gray-400';
  if (pct >= 85) return 'text-green-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export default function OeeDashboardPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<OeeRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formMachine, setFormMachine] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPlanned, setFormPlanned] = useState(480);
  const [formRun, setFormRun] = useState(0);
  const [formTotal, setFormTotal] = useState(0);
  const [formGood, setFormGood] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/oee/data');
      if (res.ok) {
        const json = await res.json() as { records: OeeRecord[]; machines: Machine[] };
        setRecords(json.records);
        setMachines(json.machines);
        if (json.machines[0]) setFormMachine(json.machines[0].id);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/oee/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ machineId: formMachine, recordDate: formDate, plannedTimeMin: formPlanned, runTimeMin: formRun, totalCount: formTotal, goodCount: formGood }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('dt.status.error'));
      setModalOpen(false);
      await fetchData();
    } catch (e) { setError(getErrorMessage(e, t)); }
    finally { setSaving(false); }
  };

  const avgOee = useMemo(() => records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.oeePct ?? 0), 0) / records.filter(r => r.oeePct !== null).length) : 0, [records]);
  const avgAvailability = useMemo(() => records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.availabilityPct ?? 0), 0) / records.length) : 0, [records]);
  const avgPerformance = useMemo(() => records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.performancePct ?? 0), 0) / records.filter(r => r.performancePct !== null).length || 0) : 0, [records]);
  const avgQuality = useMemo(() => records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.qualityPct ?? 0), 0) / records.length) : 0, [records]);

  if (loading) {
    return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title={t('oee.title')} subtitle={t('oee.subtitle')} /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('oee.title')} subtitle={t('oee.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="oee" table="oee_records" />
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> {t('oee.new_measurement')}</button>
        </div>
      </div>

      {/* OEE summary gauge */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <Gauge className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-xs text-gray-500">{t('oee.avg_oee')}</p>
          <p className={`text-3xl font-bold ${getOeeColor(avgOee)}`}>{avgOee}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-500">{t('oee.availability')}</p>
          <p className="text-2xl font-bold text-blue-400">{avgAvailability}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-500">{t('oee.performance')}</p>
          <p className="text-2xl font-bold text-amber-400">{avgPerformance}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-500">{t('oee.quality')}</p>
          <p className="text-2xl font-bold text-green-400">{avgQuality}%</p>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr><th className="px-4 py-3 text-left">{t('oee.date')}</th><th className="px-4 py-3 text-left">{t('oee.machine')}</th><th className="px-4 py-3 text-right">A%</th><th className="px-4 py-3 text-right">P%</th><th className="px-4 py-3 text-right">Q%</th><th className="px-4 py-3 text-right">OEE%</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.slice(0, 20).map(r => (
              <tr key={r.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-300">{r.recordDate}</td>
                <td className="px-4 py-3 text-white">{r.machineName}</td>
                <td className="px-4 py-3 text-right text-blue-400">{r.availabilityPct != null ? `${r.availabilityPct}%` : '-'}</td>
                <td className="px-4 py-3 text-right text-amber-400">{r.performancePct != null ? `${r.performancePct}%` : '-'}</td>
                <td className="px-4 py-3 text-right text-green-400">{r.qualityPct != null ? `${r.qualityPct}%` : '-'}</td>
                <td className={`px-4 py-3 text-right font-bold ${getOeeColor(r.oeePct)}`}>{r.oeePct != null ? `${r.oeePct}%` : '-'}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('oee.no_data')}</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('oee.new_oee_measurement')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.machine')}</label><select value={formMachine} onChange={e => setFormMachine(parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">{machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.date')}</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.planned_time')}</label><input type="number" value={formPlanned} onChange={e => setFormPlanned(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.run_time')}</label><input type="number" value={formRun} onChange={e => setFormRun(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.total_count')}</label><input type="number" value={formTotal} onChange={e => setFormTotal(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('oee.good_count')}</label><input type="number" value={formGood} onChange={e => setFormGood(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('oee.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? t('oee.saving') : t('oee.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
