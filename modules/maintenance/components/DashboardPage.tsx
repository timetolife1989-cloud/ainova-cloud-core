'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { Wrench, Plus, X, Check, AlertTriangle, AlertCircle, Clock, CheckCircle, ClipboardCheck, History } from 'lucide-react';

interface Schedule {
  id: number; assetId: number; assetName: string; taskName: string;
  intervalDays: number; lastDoneDate: string | null; nextDueDate: string | null;
  priority: string; assignedTo: string | null; isOverdue: boolean;
}
interface Asset { id: number; code: string; name: string; type: string | null; }
interface LogEntry {
  id: number; scheduleId: number | null; taskName: string | null; assetName: string;
  doneDate: string; durationMin: number | null; cost: number | null;
  notes: string | null; performedBy: string | null;
}

export default function MaintenanceDashboardPage() {
  const { t } = useTranslation();
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

  // Complete task state
  const [completeSchedule, setCompleteSchedule] = useState<Schedule | null>(null);
  const [completeDuration, setCompleteDuration] = useState(60);
  const [completeCost, setCompleteCost] = useState(0);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  // Log tab state
  const [tab, setTab] = useState<'schedules' | 'log'>('schedules');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/modules/maintenance/log');
      if (res.ok) {
        const json = await res.json() as { logs: LogEntry[] };
        setLogs(json.logs);
      }
    } finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'log') void fetchLogs(); }, [tab, fetchLogs]);

  const handleComplete = async () => {
    if (!completeSchedule) return;
    setCompleting(true); setError(null);
    try {
      const res = await fetch('/api/modules/maintenance/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ scheduleId: completeSchedule.id, durationMin: completeDuration, cost: completeCost || undefined, notes: completeNotes || undefined }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setCompleteSchedule(null); setCompleteDuration(60); setCompleteCost(0); setCompleteNotes('');
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setCompleting(false); }
  };

  const handleSave = async () => {
    if (!formTask.trim()) { setError(t('maintenance.task_required')); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/maintenance/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ assetId: formAsset, taskName: formTask, intervalDays: formInterval, priority: formPriority }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setModalOpen(false); setFormTask(''); setFormInterval(30);
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  if (loading) return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title={t('maintenance.title')} subtitle={t('maintenance.subtitle')} /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('maintenance.title')} subtitle={t('maintenance.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="maintenance" table="mod_maintenance_schedules" />
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> {t('maintenance.new_schedule')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><Wrench className="w-5 h-5 text-stone-400" /><div><p className="text-xs text-gray-500">{t('maintenance.schedules')}</p><p className="text-2xl font-bold text-white">{schedules.length}</p></div></div></div>
        <div className={`bg-gray-900 border rounded-xl p-4 ${overdueCount > 0 ? 'border-red-800' : 'border-gray-800'}`}><div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" /><div><p className="text-xs text-gray-500">{t('maintenance.overdue')}</p><p className="text-2xl font-bold text-red-400">{overdueCount}</p></div></div></div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-400" /><div><p className="text-xs text-gray-500">{t('maintenance.devices')}</p><p className="text-2xl font-bold text-white">{assets.length}</p></div></div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab('schedules')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'schedules' ? 'bg-stone-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
          <Clock className="w-4 h-4" /> {t('maintenance.schedules')}
        </button>
        <button onClick={() => setTab('log')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'log' ? 'bg-stone-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
          <History className="w-4 h-4" /> {t('maintenance.log')}
        </button>
      </div>

      {/* Schedules tab */}
      {tab === 'schedules' && (
      <div className="space-y-2">
        {schedules.map(s => (
          <div key={s.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between ${s.isOverdue ? 'border-red-800' : 'border-gray-800'}`}>
            <div className="flex items-center gap-4">
              {s.isOverdue ? <AlertCircle className="w-5 h-5 text-red-400" /> : <Clock className="w-5 h-5 text-gray-500" />}
              <div>
                <p className="text-white font-medium">{s.taskName}</p>
                <p className="text-xs text-gray-500">{s.assetName} • {t('maintenance.every_n_days').replace('{n}', String(s.intervalDays))}{s.assignedTo ? ` • ${s.assignedTo}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-medium ${s.isOverdue ? 'text-red-400' : 'text-gray-300'}`}>{s.nextDueDate ?? 'N/A'}</p>
                <p className="text-xs text-gray-500">{s.lastDoneDate ? `${t('maintenance.last_done')}: ${s.lastDoneDate}` : t('maintenance.never')}</p>
              </div>
              <button onClick={() => setCompleteSchedule(s)} title={t('maintenance.mark_done')}
                className="p-2 bg-green-900/30 hover:bg-green-800/50 text-green-400 rounded-lg transition-colors">
                <ClipboardCheck className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">{t('maintenance.no_schedules')}</p>
          </div>
        )}
      </div>
      )}

      {/* Log tab */}
      {tab === 'log' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {logsLoading ? (
            <div className="animate-pulse h-40 bg-gray-800 m-4 rounded-xl" />
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <History className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500">{t('maintenance.no_logs')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">{t('maintenance.date')}</th>
                  <th className="px-4 py-3 text-left">{t('maintenance.task')}</th>
                  <th className="px-4 py-3 text-left">{t('maintenance.device')}</th>
                  <th className="px-4 py-3 text-right">{t('maintenance.duration')}</th>
                  <th className="px-4 py-3 text-right">{t('maintenance.cost')}</th>
                  <th className="px-4 py-3 text-left">{t('maintenance.performed_by')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-300">{l.doneDate}</td>
                    <td className="px-4 py-3 text-white">{l.taskName ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{l.assetName}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{l.durationMin ? `${l.durationMin} min` : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{l.cost ? `${Number(l.cost).toLocaleString()} Ft` : '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{l.performedBy ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Complete task modal */}
      {completeSchedule && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('maintenance.complete_task')}</h3>
              <button onClick={() => setCompleteSchedule(null)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{completeSchedule.taskName} — {completeSchedule.assetName}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('maintenance.duration')} (min)</label>
                  <input type="number" value={completeDuration} onChange={e => setCompleteDuration(parseInt(e.target.value) || 0)} min={0}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('maintenance.cost')} (Ft)</label>
                  <input type="number" value={completeCost} onChange={e => setCompleteCost(parseInt(e.target.value) || 0)} min={0}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('maintenance.notes')}</label>
                <textarea value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} rows={3}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 resize-none" />
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCompleteSchedule(null)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleComplete} disabled={completing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> {completing ? t('common.saving') : t('maintenance.mark_done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New schedule modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white">{t('maintenance.new_maintenance_schedule')}</h3><button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1">{t('maintenance.device')}</label><select value={formAsset} onChange={e => setFormAsset(parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">{assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1">{t('maintenance.task')} *</label><input type="text" value={formTask} onChange={e => setFormTask(e.target.value)} placeholder={t('maintenance.placeholder_task')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('maintenance.interval_days')}</label><input type="number" value={formInterval} onChange={e => setFormInterval(parseInt(e.target.value) || 30)} min={1} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('maintenance.priority')}</label><select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"><option value="low">{t('maintenance.priority_low')}</option><option value="normal">{t('maintenance.priority_normal')}</option><option value="high">{t('maintenance.priority_high')}</option><option value="critical">{t('maintenance.priority_critical')}</option></select></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
