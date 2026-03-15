'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { Save, AlertTriangle, Calendar, Plus, X } from 'lucide-react';

interface TargetRow {
  id: number;
  targetDate: string;
  lineCode: string | null;
  targetQty: number;
  targetEfficiency: number | null;
  shift: string | null;
}

interface WeeklyTarget {
  id: number;
  yearWeek: string;
  lineCode: string | null;
  targetQty: number;
  targetEfficiency: number | null;
}

export default function TargetManager() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [dailyRows, setDailyRows] = useState<TargetRow[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Add form
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLine, setFormLine] = useState('');
  const [formQty, setFormQty] = useState(0);
  const [formEff, setFormEff] = useState<number | ''>('');
  const [formShift, setFormShift] = useState('');
  const [formYearWeek, setFormYearWeek] = useState('');

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/modules/lac-napi-perces/targets');
      if (res.ok) {
        const json = await res.json() as { daily?: TargetRow[]; weekly?: WeeklyTarget[] };
        setDailyRows(json.daily ?? []);
        setWeeklyRows(json.weekly ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTargets(); }, [fetchTargets]);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = tab === 'daily'
        ? {
            type: 'daily',
            targetDate: formDate,
            lineCode: formLine || undefined,
            targetQty: formQty,
            targetEfficiency: formEff !== '' ? formEff : undefined,
            shift: formShift || undefined,
          }
        : {
            type: 'weekly',
            yearWeek: formYearWeek,
            lineCode: formLine || undefined,
            targetQty: formQty,
            targetEfficiency: formEff !== '' ? formEff : undefined,
          };

      const res = await fetch('/api/modules/lac-napi-perces/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));

      setModalOpen(false);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormLine(''); setFormQty(0); setFormEff(''); setFormShift(''); setFormYearWeek('');
      setSuccess(true);
      await fetchTargets();
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-64" />;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{t('lac.target_management')}</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> {t('lac.add_target')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm">
          {t('common.saved_success')}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('daily')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${tab === 'daily' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Calendar className="w-3 h-3 inline mr-1" />{t('lac.daily')}
        </button>
        <button onClick={() => setTab('weekly')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${tab === 'weekly' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          <Calendar className="w-3 h-3 inline mr-1" />{t('lac.weekly')}
        </button>
      </div>

      {tab === 'daily' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">{t('lac.date')}</th>
                <th className="text-left px-3 py-2">{t('lac.line')}</th>
                <th className="text-left px-3 py-2">{t('lac.shift')}</th>
                <th className="text-right px-3 py-2">{t('lac.target_qty')}</th>
                <th className="text-right px-3 py-2">{t('lac.target_eff')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {dailyRows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-gray-300">{r.targetDate}</td>
                  <td className="px-3 py-2 text-white">{r.lineCode ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-400">{r.shift ?? '-'}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{r.targetQty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.targetEfficiency != null ? `${r.targetEfficiency}%` : '-'}</td>
                </tr>
              ))}
              {dailyRows.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('common.no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'weekly' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">{t('lac.year_week')}</th>
                <th className="text-left px-3 py-2">{t('lac.line')}</th>
                <th className="text-right px-3 py-2">{t('lac.target_qty')}</th>
                <th className="text-right px-3 py-2">{t('lac.target_eff')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {weeklyRows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-gray-300">{r.yearWeek}</td>
                  <td className="px-3 py-2 text-white">{r.lineCode ?? '-'}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{r.targetQty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.targetEfficiency != null ? `${r.targetEfficiency}%` : '-'}</td>
                </tr>
              ))}
              {weeklyRows.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">{t('common.no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('lac.add_target')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab('daily')} className={`px-3 py-1 text-xs rounded ${tab === 'daily' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{t('lac.daily')}</button>
              <button onClick={() => setTab('weekly')} className={`px-3 py-1 text-xs rounded ${tab === 'weekly' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{t('lac.weekly')}</button>
            </div>

            <div className="space-y-4">
              {tab === 'daily' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.date')}</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.shift')}</label>
                    <input type="text" value={formShift} onChange={e => setFormShift(e.target.value)} placeholder="A / B / C" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.year_week')}</label>
                  <input type="text" value={formYearWeek} onChange={e => setFormYearWeek(e.target.value)} placeholder="2026-W12" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.line')}</label>
                <input type="text" value={formLine} onChange={e => setFormLine(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.target_qty')}</label>
                  <input type="number" value={formQty} onChange={e => setFormQty(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('lac.target_eff')} (%)</label>
                  <input type="number" step="0.1" value={formEff} onChange={e => setFormEff(e.target.value ? parseFloat(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
            </div>

            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
