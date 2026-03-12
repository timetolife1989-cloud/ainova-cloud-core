'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { CalendarClock, Plus, X, Check, AlertTriangle } from 'lucide-react';

interface ShiftDef { id: number; name: string; startTime: string; endTime: string; color: string | null; }
interface Assignment { id: number; workerName: string; teamName: string | null; shiftId: number; shiftName: string; assignmentDate: string; status: string; }

export default function ShiftManagementDashboardPage() {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState<ShiftDef[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formWorker, setFormWorker] = useState('');
  const [formTeam, setFormTeam] = useState('');
  const [formShift, setFormShift] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/shift-management/data');
      if (res.ok) {
        const json = await res.json() as { shifts: ShiftDef[]; assignments: Assignment[] };
        setShifts(json.shifts);
        setAssignments(json.assignments);
        if (json.shifts[0]) setFormShift(json.shifts[0].id);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    if (!formWorker.trim()) { setError(t('shift.worker_required')); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/shift-management/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ workerName: formWorker, teamName: formTeam || undefined, shiftId: formShift, assignmentDate: formDate }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('dt.status.error'));
      setModalOpen(false); setFormWorker(''); setFormTeam('');
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : t('dt.status.error')); }
    finally { setSaving(false); }
  };

  // Group by date
  const grouped = assignments.reduce<Record<string, Assignment[]>>((acc, a) => {
    if (!acc[a.assignmentDate]) acc[a.assignmentDate] = [];
    acc[a.assignmentDate]!.push(a);
    return acc;
  }, {});

  if (loading) return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title={t('shift.title')} subtitle={t('shift.subtitle_short')} /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('shift.title')} subtitle={t('shift.subtitle')} />
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> {t('shift.new_assignment')}</button>
      </div>

      {/* Shift legend */}
      <div className="flex gap-3 mb-4">
        {shifts.map(s => (
          <span key={s.id} className="px-3 py-1 rounded-lg text-xs text-white" style={{ backgroundColor: s.color ?? '#475569' }}>
            {s.name} ({s.startTime}–{s.endTime})
          </span>
        ))}
        {shifts.length === 0 && <p className="text-gray-500 text-sm">{t('shift.no_shift_types')}</p>}
      </div>

      {/* Calendar view */}
      <div className="space-y-4">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => (
          <div key={date} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">{new Date(date).toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-gray-950 rounded-lg p-2">
                  <div className="w-2 h-8 rounded" style={{ backgroundColor: shifts.find(s => s.id === a.shiftId)?.color ?? '#475569' }} />
                  <div>
                    <p className="text-white text-sm">{a.workerName}</p>
                    <p className="text-xs text-gray-500">{a.shiftName}{a.teamName ? ` • ${a.teamName}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">{t('shift.no_assignments')}</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white">{t('shift.assignment_title')}</h3><button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1">{t('shift.worker')}</label><input type="text" value={formWorker} onChange={e => setFormWorker(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('shift.team')}</label><input type="text" value={formTeam} onChange={e => setFormTeam(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('shift.date')}</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">{t('shift.shift')}</label><select value={formShift} onChange={e => setFormShift(parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">{shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('shift.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? t('shift.saving') : t('shift.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
