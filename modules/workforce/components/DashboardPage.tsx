'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Users, Plus, Calendar, TrendingUp, UserMinus, X, Check, AlertTriangle, Pencil, Trash2, Download, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import WorkforceCharts from './WorkforceCharts';

interface WorkforceDaily {
  id: number;
  recordDate: string;
  shiftName: string | null;
  areaName: string | null;
  plannedCount: number;
  actualCount: number;
  absentCount: number;
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
  notes: string;
}

const emptyForm = (): FormState => ({
  date: new Date().toISOString().split('T')[0],
  shift: '',
  area: '',
  planned: 0,
  actual: 0,
  absent: 0,
  notes: '',
});

export default function WorkforceDashboardPage() {
  const { t } = useTranslation();

  const [items, setItems] = useState<WorkforceDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Edit / Delete state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkforceDaily | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterShift, setFilterShift] = useState('');

  // Form state
  const [form, setForm] = useState<FormState>(emptyForm());

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

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
      notes: item.notes ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        recordDate: form.date,
        shiftName: form.shift || null,
        areaName: form.area || null,
        plannedCount: form.planned,
        actualCount: form.actual,
        absentCount: form.absent,
        notes: form.notes || null,
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
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
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
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const exportCsv = () => {
    const header = [
      t('workforce.date'), t('workforce.shift'), t('workforce.area'),
      t('workforce.planned'), t('workforce.actual'), t('workforce.absent'),
      t('workforce.rate'), t('workforce.notes'),
    ];
    const rows = items.map(i => {
      const rate = i.plannedCount > 0 ? Math.round((i.actualCount / i.plannedCount) * 100) : 0;
      return [
        i.recordDate, i.shiftName ?? '', i.areaName ?? '',
        String(i.plannedCount), String(i.actualCount), String(i.absentCount),
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
  };

  const today = new Date().toISOString().split('T')[0];
  const todayItems = items.filter(i => i.recordDate === today);
  const totalPlanned = todayItems.reduce((s, i) => s + i.plannedCount, 0);
  const totalActual = todayItems.reduce((s, i) => s + i.actualCount, 0);
  const totalAbsent = todayItems.reduce((s, i) => s + i.absentCount, 0);
  const attendanceRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  const uniqueShifts = [...new Set(items.map(i => i.shiftName).filter(Boolean))] as string[];

  const inputCls = 'w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-600';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('workforce.title')} subtitle={t('workforce.subtitle')} />
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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <DashboardSectionHeader title={t('workforce.title')} subtitle={t('workforce.subtitle')} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${showFilters ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' : 'border-gray-700 text-gray-400 hover:text-gray-300'}`}
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {t('workforce.new_entry')}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('workforce.planned_today'), value: totalPlanned, icon: <Calendar className="w-5 h-5 text-blue-400" />, bg: 'bg-blue-900/30', color: 'text-white' },
          { label: t('workforce.actual_today'), value: totalActual, icon: <Users className="w-5 h-5 text-green-400" />, bg: 'bg-green-900/30', color: 'text-white' },
          { label: t('workforce.absent_today'), value: totalAbsent, icon: <UserMinus className="w-5 h-5 text-red-400" />, bg: 'bg-red-900/30', color: totalAbsent > 0 ? 'text-red-400' : 'text-white' },
          { label: t('workforce.attendance_rate'), value: `${attendanceRate}%`, icon: <TrendingUp className="w-5 h-5 text-purple-400" />, bg: 'bg-purple-900/30', color: attendanceRate >= 90 ? 'text-green-400' : attendanceRate >= 70 ? 'text-yellow-400' : 'text-red-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${card.bg} rounded-lg`}>{card.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global error banner */}
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Data table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <span className="text-xs text-gray-500">{items.length} {t('workforce.records')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{t('workforce.date')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.shift')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.area')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.planned')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.actual')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.absent')}</th>
                <th className="px-4 py-3 text-center">{t('workforce.rate')}</th>
                <th className="px-4 py-3 text-left">{t('workforce.notes')}</th>
                <th className="px-4 py-3 text-center w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map(item => {
                const rate = item.plannedCount > 0
                  ? Math.round((item.actualCount / item.plannedCount) * 100)
                  : 0;
                const isDeleting = deleteConfirmId === item.id;
                return (
                  <tr key={item.id} className={`transition-colors ${isDeleting ? 'bg-red-950/20' : 'hover:bg-gray-800/40'}`}>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{item.recordDate}</td>
                    <td className="px-4 py-3 text-gray-300">{item.shiftName ?? <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-gray-300">{item.areaName ?? <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{item.plannedCount}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{item.actualCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={item.absentCount > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>
                        {item.absentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        rate >= 90 ? 'bg-green-900/40 text-green-400'
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

      {/* Charts Section */}
      <WorkforceCharts items={items} t={t} />

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editItem ? t('workforce.edit_entry') : t('workforce.new_entry')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.date')}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.shift')}</label>
                  <input
                    type="text"
                    value={form.shift}
                    onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
                    placeholder={t('workforce.shift_placeholder')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.area')}</label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder={t('workforce.area_placeholder')}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.planned')}</label>
                  <input
                    type="number"
                    value={form.planned}
                    min={0}
                    onChange={e => setForm(f => ({ ...f, planned: parseInt(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.actual')}</label>
                  <input
                    type="number"
                    value={form.actual}
                    min={0}
                    onChange={e => setForm(f => ({ ...f, actual: parseInt(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.absent')}</label>
                  <input
                    type="number"
                    value={form.absent}
                    min={0}
                    onChange={e => setForm(f => ({ ...f, absent: parseInt(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('workforce.notes')}</label>
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
                className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
