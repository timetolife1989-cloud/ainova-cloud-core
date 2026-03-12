'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import {
  Users, Plus, Calendar, TrendingUp, UserMinus, X, Check,
  AlertTriangle, Pencil, Trash2, Download, Filter, Clock,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import WorkforceCharts from './WorkforceCharts';

// ── Shift Configuration ─────────────────────────────────────────────
// Configurable shift definitions. Default: standard 3-shift factory pattern.
// Supports 2/4-shift, 12h, 24h, or custom patterns (e.g. 2-on-2-off).
// TODO: Load from admin settings (core_settings workforce_shift_definitions)
interface ShiftDef {
  id: string;
  name: string;
  labelKey: string;
  startTime: string;
  endTime: string;
  color: string;
}

const SHIFT_DEFINITIONS: ShiftDef[] = [
  { id: 'morning',   name: 'Reggeli',   labelKey: 'workforce.shift_morning',   startTime: '06:00', endTime: '14:00', color: '#8B5CF6' },
  { id: 'afternoon', name: 'D\u00e9lut\u00e1ni',  labelKey: 'workforce.shift_afternoon',  startTime: '14:00', endTime: '22:00', color: '#3B82F6' },
  { id: 'night',     name: '\u00c9jszakai',  labelKey: 'workforce.shift_night',     startTime: '22:00', endTime: '06:00', color: '#1E40AF' },
];

/** Determine current shift + effective date (night shift → previous day after midnight) */
function getEffectiveShift(): { date: string; shiftId: string } {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const today = now.toISOString().split('T')[0];
  for (const s of SHIFT_DEFINITIONS) {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (end > start) {
      if (cur >= start && cur < end) return { date: today, shiftId: s.id };
    } else {
      // Overnight shift
      if (cur >= start) return { date: today, shiftId: s.id };
      if (cur < end) {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { date: y.toISOString().split('T')[0], shiftId: s.id };
      }
    }
  }
  return { date: today, shiftId: SHIFT_DEFINITIONS[0]?.id ?? '' };
}

// ── Toast ────────────────────────────────────────────────────────────
interface ToastItem { id: number; type: 'success' | 'error' | 'warning'; message: string }
let toastCounter = 0;

// ── Types ────────────────────────────────────────────────────────────
interface WorkforceDaily {
  id: number;
  recordDate: string;
  shiftName: string | null;
  areaName: string | null;
  plannedCount: number;
  actualCount: number;
  absentCount: number;
  overtimeHours: number;
  overtimeWorkers: number;
  notes: string | null;
  recordedBy: string | null;
}

interface FormState {
  date: string;
  shift: string;
  area: string;
  planned: number;
  actual: number;
  absent: number;
  overtimeHrs: number;
  overtimeWkrs: number;
  notes: string;
}

const emptyForm = (): FormState => {
  const eff = getEffectiveShift();
  const shift = SHIFT_DEFINITIONS.find(s => s.id === eff.shiftId);
  return {
    date: eff.date,
    shift: shift?.name ?? '',
    area: '',
    planned: 0,
    actual: 0,
    absent: 0,
    overtimeHrs: 0,
    overtimeWkrs: 0,
    notes: '',
  };
};

// ── Component ────────────────────────────────────────────────────────
export default function WorkforceDashboardPage() {
  const { t } = useTranslation();

  const [items, setItems] = useState<WorkforceDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Edit / Delete
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkforceDaily | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterShift, setFilterShift] = useState('');

  // Form
  const [form, setForm] = useState<FormState>(emptyForm());

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Overwrite detection
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [existingInfo, setExistingInfo] = useState<{ savedBy: string; savedAt: string } | null>(null);

  // Report-required for old data (>1 day)
  const [showReportRequired, setShowReportRequired] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────
  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const addToast = (type: ToastItem['type'], message: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev.slice(-2), { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // ── Data Fetching ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('dateFrom', filterFrom);
      if (filterTo) params.set('dateTo', filterTo);
      if (filterShift) params.set('shiftName', filterShift);
      const res = await fetch(`/api/modules/workforce/data?${params.toString()}`);
      if (res.ok) {
        const json = await res.json() as { items: WorkforceDaily[] };
        setItems(json.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, filterShift]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── CRUD ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: WorkforceDaily) => {
    setEditItem(item);
    setForm({
      date: item.recordDate,
      shift: item.shiftName ?? '',
      area: item.areaName ?? '',
      planned: item.plannedCount,
      actual: item.actualCount,
      absent: item.absentCount,
      overtimeHrs: item.overtimeHours,
      overtimeWkrs: item.overtimeWorkers,
      notes: item.notes ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  /** Execute the actual save (after validations pass) */
  const performSave = async (reason?: string) => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        recordDate: form.date,
        shiftName: form.shift || null,
        areaName: form.area || null,
        plannedCount: form.planned,
        actualCount: form.actual,
        absentCount: form.absent,
        overtimeHours: form.overtimeHrs,
        overtimeWorkers: form.overtimeWkrs,
        notes: reason
          ? `[RIPORT: ${reason}] ${form.notes || ''}`.trim()
          : (form.notes || null),
      };
      const url = editItem
        ? `/api/modules/workforce/data/${editItem.id}`
        : '/api/modules/workforce/data';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? t('common.error'));

      setModalOpen(false);
      setShowOverwrite(false);
      setShowReportRequired(false);
      setReportReason('');
      addToast('success', editItem ? t('workforce.save_success_edit') : t('workforce.save_success_create'));
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      setError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  /** Save with validations: future date, zero headcount, overwrite check, report-required */
  const handleSave = async () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const selectedDate = new Date(form.date + 'T00:00:00');

    // Validation 1: Future date
    if (selectedDate > todayDate) {
      addToast('warning', t('workforce.error_future_date'));
      return;
    }

    // Validation 2: Zero headcount
    if (form.planned === 0 && form.actual === 0 && form.absent === 0) {
      addToast('warning', t('workforce.error_zero_headcount'));
      return;
    }

    // Validation 3: Report-required (>1 day old, new entry only)
    const daysDiff = Math.round((selectedDate.getTime() - todayDate.getTime()) / 86400000);
    if (daysDiff < -1 && !editItem) {
      setShowReportRequired(true);
      return;
    }

    // Validation 4: Check existing records (new entry only)
    if (!editItem && form.shift) {
      try {
        const res = await fetch(
          `/api/modules/workforce/check?date=${form.date}&shift=${encodeURIComponent(form.shift)}`
        );
        const data = await res.json() as {
          exists: boolean;
          lastRecord?: { savedBy: string; savedAt: string };
        };
        if (data.exists && data.lastRecord) {
          setExistingInfo(data.lastRecord);
          setShowOverwrite(true);
          return;
        }
      } catch { /* proceed if check fails */ }
    }

    await performSave();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/modules/workforce/data/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? t('common.error'));
      }
      setDeleteConfirmId(null);
      addToast('success', t('workforce.delete_success'));
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      setError(msg);
      addToast('error', msg);
    }
  };

  const exportCsv = () => {
    const header = [
      t('workforce.date'), t('workforce.shift'), t('workforce.area'),
      t('workforce.planned'), t('workforce.actual'), t('workforce.absent'),
      t('workforce.overtime_hours'), t('workforce.overtime_workers'),
      t('workforce.rate'), t('workforce.notes'),
    ];
    const rows = items.map(i => {
      const rate = i.plannedCount > 0 ? Math.round((i.actualCount / i.plannedCount) * 100) : 0;
      return [
        i.recordDate, i.shiftName ?? '', i.areaName ?? '',
        String(i.plannedCount), String(i.actualCount), String(i.absentCount),
        String(i.overtimeHours), String(i.overtimeWorkers),
        `${rate}%`, i.notes ?? '',
      ];
    });
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', t('workforce.csv_exported'));
  };

  // ── Computed (memoized) ─────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todayItems = useMemo(() => items.filter(i => i.recordDate === todayStr), [items, todayStr]);
  const totalPlanned = useMemo(() => todayItems.reduce((s, i) => s + i.plannedCount, 0), [todayItems]);
  const totalActual = useMemo(() => todayItems.reduce((s, i) => s + i.actualCount, 0), [todayItems]);
  const totalAbsent = useMemo(() => todayItems.reduce((s, i) => s + i.absentCount, 0), [todayItems]);
  const totalOvertimeHrs = useMemo(() => todayItems.reduce((s, i) => s + i.overtimeHours, 0), [todayItems]);
  const attendanceRate = useMemo(() => totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0, [totalPlanned, totalActual]);

  const uniqueShifts = useMemo(() => [...new Set(items.map(i => i.shiftName).filter(Boolean))] as string[], [items]);

  const inputCls = 'w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors';

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('workforce.title')} subtitle={t('workforce.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-800/50 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ═══ Toast Notifications ═══ */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-6 z-[60] space-y-3">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border ${
                toast.type === 'success'
                  ? 'bg-emerald-600/95 border-emerald-400/30 text-white'
                  : toast.type === 'error'
                    ? 'bg-red-600/95 border-red-400/30 text-white'
                    : 'bg-amber-600/95 border-amber-400/30 text-white'
              }`}
            >
              <span className="text-xl">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
              </span>
              <span className="font-medium text-sm">{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-2 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <DashboardSectionHeader title={t('workforce.title')} subtitle={t('workforce.subtitle')} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              showFilters
                ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300'
                : 'border-gray-700 text-gray-400 hover:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" /> {t('common.filter')}
          </button>
          <button
            onClick={exportCsv}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-700 text-gray-400 hover:text-gray-300 rounded-lg text-sm disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> {t('common.export')}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
          >
            <Plus className="w-4 h-4" /> {t('workforce.new_entry')}
          </button>
        </div>
      </div>

      {/* ═══ Filters ═══ */}
      {showFilters && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 backdrop-blur-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('workforce.date_from')}</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('workforce.date_to')}</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('workforce.shift')}</label>
            <select value={filterShift} onChange={e => setFilterShift(e.target.value)} className={inputCls}>
              <option value="">{t('common.all')}</option>
              {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          {
            label: t('workforce.planned_today'),
            value: totalPlanned,
            icon: <Calendar className="w-5 h-5 text-blue-400" />,
            gradient: 'from-blue-950/80 to-blue-900/30',
            border: 'border-blue-800/40',
            valueColor: 'text-white',
          },
          {
            label: t('workforce.actual_today'),
            value: totalActual,
            icon: <Users className="w-5 h-5 text-emerald-400" />,
            gradient: 'from-emerald-950/80 to-emerald-900/30',
            border: 'border-emerald-800/40',
            valueColor: 'text-white',
          },
          {
            label: t('workforce.absent_today'),
            value: totalAbsent,
            icon: <UserMinus className="w-5 h-5 text-red-400" />,
            gradient: 'from-red-950/80 to-red-900/30',
            border: 'border-red-800/40',
            valueColor: totalAbsent > 0 ? 'text-red-400' : 'text-white',
          },
          {
            label: t('workforce.overtime_today'),
            value: `${totalOvertimeHrs}h`,
            icon: <Clock className="w-5 h-5 text-amber-400" />,
            gradient: 'from-amber-950/80 to-amber-900/30',
            border: 'border-amber-800/40',
            valueColor: totalOvertimeHrs > 0 ? 'text-amber-400' : 'text-white',
          },
          {
            label: t('workforce.attendance_rate'),
            value: `${attendanceRate}%`,
            icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
            gradient: 'from-purple-950/80 to-purple-900/30',
            border: 'border-purple-800/40',
            valueColor: attendanceRate >= 90
              ? 'text-emerald-400'
              : attendanceRate >= 70 ? 'text-yellow-400' : 'text-red-400',
          },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.gradient} border ${card.border} rounded-xl p-5 shadow-lg`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/5 rounded-lg backdrop-blur-sm">{card.icon}</div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold ${card.valueColor} mt-0.5`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Error Banner ═══ */}
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ═══ Data Table ═══ */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <span className="text-xs text-gray-500">{items.length} {t('workforce.records')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-950/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{t('workforce.date')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.shift')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.area')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.planned')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.actual')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.absent')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.overtime_hours')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.rate')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.notes')}</th>
                <th className="px-4 py-3 text-center w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {items.map(item => {
                const rate = item.plannedCount > 0
                  ? Math.round((item.actualCount / item.plannedCount) * 100)
                  : 0;
                const isDeleting = deleteConfirmId === item.id;
                const shiftDef = SHIFT_DEFINITIONS.find(s => s.name === item.shiftName);

                return (
                  <tr key={item.id} className={`transition-colors ${isDeleting ? 'bg-red-950/20' : 'hover:bg-gray-800/40'}`}>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{item.recordDate}</td>
                    <td className="px-4 py-3">
                      {item.shiftName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-300">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: shiftDef?.color ?? '#6B7280' }}
                          />
                          {shiftDef ? t(shiftDef.labelKey) : item.shiftName}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.areaName ?? <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{item.plannedCount}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{item.actualCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={item.absentCount > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>
                        {item.absentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={item.overtimeHours > 0 ? 'text-amber-400 font-medium' : 'text-gray-500'}>
                        {item.overtimeHours > 0 ? `${item.overtimeHours}h / ${item.overtimeWorkers} ${t('workforce.persons')}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        rate >= 90 ? 'bg-emerald-900/40 text-emerald-400'
                        : rate >= 70 ? 'bg-yellow-900/40 text-yellow-400'
                        : 'bg-red-900/40 text-red-400'
                      }`}>
                        {rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{item.notes ?? ''}</td>
                    <td className="px-4 py-3">
                      {isDeleting ? (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => void handleDelete(item.id)}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            title={t('common.yes')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 text-gray-500 hover:text-gray-300 rounded"
                            title={t('common.no')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1 text-gray-500 hover:text-indigo-400 rounded transition-colors"
                            title={t('common.edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>{t('common.no_data')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Charts ═══ */}
      <WorkforceCharts items={items} t={t} />

      {/* ═══ Create / Edit Modal ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">
                {editItem ? t('workforce.edit_entry') : t('workforce.new_entry')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.date')}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Shift Selector — Visual Buttons */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t('workforce.shift')}</label>
                <div className="flex flex-wrap gap-2">
                  {SHIFT_DEFINITIONS.map(s => {
                    const isSelected = form.shift === s.name;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, shift: s.name }))}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          isSelected
                            ? 'text-white shadow-lg scale-[1.02]'
                            : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:border-gray-500 hover:bg-gray-700/60'
                        }`}
                        style={isSelected ? {
                          backgroundColor: s.color,
                          borderColor: s.color,
                          boxShadow: `0 4px 20px ${s.color}40`,
                        } : {}}
                      >
                        <span className="block">{t(s.labelKey)}</span>
                        <span className="block text-[10px] opacity-75 mt-0.5">
                          <Clock className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                          {s.startTime}–{s.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.area')}</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  placeholder={t('workforce.area_placeholder')}
                  className={inputCls}
                />
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.planned')}</label>
                  <input type="number" value={form.planned} min={0} onChange={e => setForm(f => ({ ...f, planned: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.actual')}</label>
                  <input type="number" value={form.actual} min={0} onChange={e => setForm(f => ({ ...f, actual: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.absent')}</label>
                  <input type="number" value={form.absent} min={0} onChange={e => setForm(f => ({ ...f, absent: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
              </div>

              {/* Overtime */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.overtime_hours')}</label>
                  <input type="number" value={form.overtimeHrs} min={0} step={0.5} onChange={e => setForm(f => ({ ...f, overtimeHrs: parseFloat(e.target.value) || 0 }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.overtime_workers')}</label>
                  <input type="number" value={form.overtimeWkrs} min={0} onChange={e => setForm(f => ({ ...f, overtimeWkrs: parseInt(e.target.value) || 0 }))} className={inputCls} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('workforce.notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="group relative flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all overflow-hidden"
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {t('common.save')}
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Overwrite Confirmation Modal ═══ */}
      {showOverwrite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
          <div className="bg-gray-900 border border-amber-500/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Már létező adat
            </h3>
            <p className="text-gray-300 mb-3">
              Erre a napra és műszakra (<strong className="text-amber-200">{form.date}</strong> — {form.shift}) már van rögzített adat!
            </p>
            {existingInfo && (
              <div className="p-3 rounded-xl bg-gray-800/80 border border-amber-500/20 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>{t('workforce.overwrite_recorded_by')}: <strong className="text-amber-200">{existingInfo.savedBy}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 mt-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{existingInfo.savedAt}</span>
                </div>
              </div>
            )}
            <p className="text-gray-400 text-sm mb-5">{t('workforce.overwrite_confirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOverwrite(false)}
                className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void performSave()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                {t('workforce.overwrite_yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Report-Required Modal ═══ */}
      {showReportRequired && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
          <div className="bg-gray-900 border border-orange-500/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              {t('workforce.report_required_title')}
            </h3>
            <p className="text-gray-300 mb-2">
              {t('workforce.report_date_old')}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {t('workforce.report_required_desc')}
            </p>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                {t('workforce.report_reason')} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                rows={3}
                placeholder={t('workforce.report_reason_placeholder')}
                className={inputCls}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowReportRequired(false); setReportReason(''); }}
                className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void performSave(reportReason)}
                disabled={!reportReason.trim() || saving}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? `${t('common.saving')}...` : t('workforce.save_with_reason')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
