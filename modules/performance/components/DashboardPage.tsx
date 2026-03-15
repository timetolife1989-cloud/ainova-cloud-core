'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { TrendingUp, Plus, X, Check, AlertTriangle, Users, Clock, Target, Zap, Crosshair, Trash2 } from 'lucide-react';

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

interface PerformanceTarget {
  id: number;
  targetType: string;
  targetName: string | null;
  periodType: string;
  targetValue: number;
  targetUnit: string | null;
  validFrom: string;
  validTo: string | null;
}

export default function PerformanceDashboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'entries' | 'targets'>('entries');
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTarget, setErrorTarget] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formWorker, setFormWorker] = useState('');
  const [formTeam, setFormTeam] = useState('');
  const [formTaskCode, setFormTaskCode] = useState('');
  const [formTaskName, setFormTaskName] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formNormTime, setFormNormTime] = useState<number | ''>('');
  const [formActualTime, setFormActualTime] = useState<number | ''>('');

  // Target form state
  const [tgtType, setTgtType] = useState<'worker' | 'team' | 'global'>('global');
  const [tgtName, setTgtName] = useState('');
  const [tgtPeriod, setTgtPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [tgtValue, setTgtValue] = useState(0);
  const [tgtUnit, setTgtUnit] = useState('');
  const [tgtFrom, setTgtFrom] = useState(new Date().toISOString().split('T')[0]);
  const [tgtTo, setTgtTo] = useState('');

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

  const fetchTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const res = await fetch('/api/modules/performance/targets');
      if (res.ok) {
        const json = await res.json() as { targets: PerformanceTarget[] };
        setTargets(json.targets);
      }
    } finally { setLoadingTargets(false); }
  }, []);

  useEffect(() => { if (tab === 'targets' && targets.length === 0) void fetchTargets(); }, [tab, targets.length, fetchTargets]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!formWorker.trim()) {
      setError(t('performance.name_required'));
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
      if (!res.ok) throw new Error(body.error ?? t('common.error'));

      setModalOpen(false);
      resetForm();
      await fetchData();
    } catch (e) {
      setError(getErrorMessage(e, t));
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

  const handleSaveTarget = async () => {
    if (tgtType !== 'global' && !tgtName.trim()) { setErrorTarget(t('performance.target_name_required')); return; }
    if (tgtValue <= 0) { setErrorTarget(t('performance.target_value_required')); return; }
    setSavingTarget(true); setErrorTarget(null);
    try {
      const res = await fetch('/api/modules/performance/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          targetType: tgtType,
          targetName: tgtType === 'global' ? undefined : tgtName || undefined,
          periodType: tgtPeriod,
          targetValue: tgtValue,
          targetUnit: tgtUnit || undefined,
          validFrom: tgtFrom,
          validTo: tgtTo || undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setTargetModalOpen(false);
      setTgtType('global'); setTgtName(''); setTgtValue(0); setTgtUnit(''); setTgtTo('');
      await fetchTargets();
    } catch (e) { setErrorTarget(getErrorMessage(e, t)); }
    finally { setSavingTarget(false); }
  };

  const handleDeleteTarget = async (id: number) => {
    try {
      await fetch(`/api/modules/performance/targets?id=${id}`, {
        method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      setTargets(prev => prev.filter(t => t.id !== id));
    } catch { /* ignore */ }
  };

  const targetTypeLabel = (tt: string) => t(`performance.target_type_${tt}`) || tt;
  const periodTypeLabel = (pt: string) => t(`performance.period_${pt}`) || pt;

  // Summary calculations (memoized)
  const todayEntries = useMemo(() => entries.filter(e => e.entryDate === new Date().toISOString().split('T')[0]), [entries]);
  const totalQuantity = useMemo(() => todayEntries.reduce((sum, e) => sum + e.quantity, 0), [todayEntries]);
  const totalNormTime = useMemo(() => todayEntries.reduce((sum, e) => sum + (e.normTime ?? 0), 0), [todayEntries]);
  const totalActualTime = useMemo(() => todayEntries.reduce((sum, e) => sum + (e.actualTime ?? 0), 0), [todayEntries]);
  const avgEfficiency = useMemo(() => todayEntries.length > 0
    ? Math.round(todayEntries.reduce((sum, e) => sum + (e.efficiency ?? 0), 0) / todayEntries.length)
    : 0, [todayEntries]);

  const getEfficiencyColor = (eff: number | null) => {
    if (eff === null) return 'text-gray-400';
    if (eff >= 100) return 'text-green-400';
    if (eff >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('performance.title')} subtitle={t('performance.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        <DashboardSectionHeader title={t('performance.title')} subtitle={t('performance.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="performance" table="performance_entries" />
          {tab === 'entries' && (
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> {t('performance.new_entry')}
            </button>
          )}
          {tab === 'targets' && (
            <button onClick={() => setTargetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> {t('performance.new_target')}
            </button>
          )}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('entries')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'entries' ? 'bg-rose-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          <TrendingUp className="w-4 h-4 inline mr-2" />{t('performance.title')}
        </button>
        <button onClick={() => setTab('targets')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'targets' ? 'bg-rose-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          <Crosshair className="w-4 h-4 inline mr-2" />{t('performance.targets')}
        </button>
      </div>

      {tab === 'entries' && (
      <>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('performance.qty_today')}</p>
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
              <p className="text-xs text-gray-500">{t('performance.norm_time')}</p>
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
              <p className="text-xs text-gray-500">{t('performance.actual_time')}</p>
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
              <p className="text-xs text-gray-500">{t('performance.avg_efficiency')}</p>
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
              <th className="px-4 py-3 text-left">{t('performance.date')}</th>
              <th className="px-4 py-3 text-left">{t('performance.worker')}</th>
              <th className="px-4 py-3 text-left">{t('performance.team')}</th>
              <th className="px-4 py-3 text-left">{t('performance.task')}</th>
              <th className="px-4 py-3 text-right">{t('performance.quantity')}</th>
              <th className="px-4 py-3 text-right">{t('performance.norm')}</th>
              <th className="px-4 py-3 text-right">{t('performance.actual')}</th>
              <th className="px-4 py-3 text-right">{t('performance.efficiency')}</th>
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
                  {t('performance.no_data')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Targets tab */}
      {tab === 'targets' && (
        <>
          {loadingTargets ? (
            <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />
          ) : targets.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <Crosshair className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">{t('performance.no_targets')}</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('performance.target_type')}</th>
                    <th className="px-4 py-3 text-left">{t('performance.target_name_label')}</th>
                    <th className="px-4 py-3 text-left">{t('performance.period')}</th>
                    <th className="px-4 py-3 text-right">{t('performance.target_value_label')}</th>
                    <th className="px-4 py-3 text-left">{t('performance.target_unit')}</th>
                    <th className="px-4 py-3 text-left">{t('performance.valid_from')}</th>
                    <th className="px-4 py-3 text-left">{t('performance.valid_to')}</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {targets.map(tgt => (
                    <tr key={tgt.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          tgt.targetType === 'global' ? 'bg-purple-900/40 text-purple-400 border-purple-800' :
                          tgt.targetType === 'team' ? 'bg-blue-900/40 text-blue-400 border-blue-800' :
                          'bg-green-900/40 text-green-400 border-green-800'
                        }`}>{targetTypeLabel(tgt.targetType)}</span>
                      </td>
                      <td className="px-4 py-3 text-white">{tgt.targetName || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{periodTypeLabel(tgt.periodType)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{tgt.targetValue}</td>
                      <td className="px-4 py-3 text-gray-400">{tgt.targetUnit || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{tgt.validFrom}</td>
                      <td className="px-4 py-3 text-gray-400">{tgt.validTo || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => void handleDeleteTarget(tgt.id)} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('performance.new_entry')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.date')}</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.worker')} *</label>
                  <input type="text" value={formWorker} onChange={e => setFormWorker(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.team')}</label>
                  <input type="text" value={formTeam} onChange={e => setFormTeam(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.task_code')}</label>
                  <input type="text" value={formTaskCode} onChange={e => setFormTaskCode(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.task_name')}</label>
                <input type="text" value={formTaskName} onChange={e => setFormTaskName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.quantity')}</label>
                  <input type="number" value={formQuantity} onChange={e => setFormQuantity(parseInt(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.norm_time_min')}</label>
                  <input type="number" value={formNormTime} onChange={e => setFormNormTime(e.target.value ? parseInt(e.target.value) : '')} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.actual_time_min')}</label>
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
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {targetModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('performance.new_target')}</h3>
              <button onClick={() => setTargetModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.target_type')}</label>
                  <select value={tgtType} onChange={e => setTgtType(e.target.value as 'worker' | 'team' | 'global')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    <option value="global">{t('performance.target_type_global')}</option>
                    <option value="team">{t('performance.target_type_team')}</option>
                    <option value="worker">{t('performance.target_type_worker')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.period')}</label>
                  <select value={tgtPeriod} onChange={e => setTgtPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    <option value="daily">{t('performance.period_daily')}</option>
                    <option value="weekly">{t('performance.period_weekly')}</option>
                    <option value="monthly">{t('performance.period_monthly')}</option>
                  </select>
                </div>
              </div>
              {tgtType !== 'global' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.target_name_label')}</label>
                  <input type="text" value={tgtName} onChange={e => setTgtName(e.target.value)} placeholder={tgtType === 'worker' ? t('performance.worker') : t('performance.team')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.target_value_label')}</label>
                  <input type="number" value={tgtValue} onChange={e => setTgtValue(parseFloat(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.target_unit')}</label>
                  <input type="text" value={tgtUnit} onChange={e => setTgtUnit(e.target.value)} placeholder="%, db, perc" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.valid_from')}</label>
                  <input type="date" value={tgtFrom} onChange={e => setTgtFrom(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('performance.valid_to')}</label>
                  <input type="date" value={tgtTo} onChange={e => setTgtTo(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
            </div>
            {errorTarget && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorTarget}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setTargetModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSaveTarget} disabled={savingTarget} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" /> {savingTarget ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
