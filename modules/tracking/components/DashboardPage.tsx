'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { ClipboardCheck, Plus, X, Check, AlertTriangle, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';

interface TrackingItem {
  id: number;
  referenceCode: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  quantity: number | null;
  dueDate: string | null;
  createdAt: string;
}

const PRIORITIES = [
  { value: 'low', labelKey: 'tracking.priority_low', color: 'text-gray-400' },
  { value: 'normal', labelKey: 'tracking.priority_normal', color: 'text-blue-400' },
  { value: 'high', labelKey: 'tracking.priority_high', color: 'text-orange-400' },
  { value: 'urgent', labelKey: 'tracking.priority_urgent', color: 'text-red-400' },
];

const STATUS_KEYS: Record<string, string> = {
  'Nyitott': 'tracking.status_open',
  'Folyamatban': 'tracking.status_in_progress',
  'Kész': 'tracking.status_done',
  'Lezárt': 'tracking.status_closed',
};

const DEFAULT_STATUSES = ['Nyitott', 'Folyamatban', 'Kész', 'Lezárt'];

function getStatusIcon(status: string) {
  switch (status) {
    case 'Nyitott': return <Circle className="w-4 h-4 text-gray-400" />;
    case 'Folyamatban': return <Clock className="w-4 h-4 text-blue-400" />;
    case 'Kész': return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'Lezárt': return <Check className="w-4 h-4 text-gray-500" />;
    default: return <Circle className="w-4 h-4 text-gray-400" />;
  }
}

export default function TrackingDashboardPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Form state
  const [formRef, setFormRef] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formAssigned, setFormAssigned] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const fetchData = useCallback(async () => {
    try {
      let url = '/api/modules/tracking/data';
      if (filterStatus) url += `?status=${encodeURIComponent(filterStatus)}`;
      const res = await fetch(url);
      if (res.ok) {
      const json = await res.json() as { items?: TrackingItem[] };
      setItems(json.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      setError(t('tracking.title_required'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/modules/tracking/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          referenceCode: formRef || undefined,
          title: formTitle,
          description: formDesc || undefined,
          priority: formPriority,
          assignedTo: formAssigned || undefined,
          dueDate: formDueDate || undefined,
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

  const handleStatusChange = async (item: TrackingItem, newStatus: string) => {
    try {
      await fetch(`/api/modules/tracking/data/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setFormRef('');
    setFormTitle('');
    setFormDesc('');
    setFormPriority('normal');
    setFormAssigned('');
    setFormDueDate('');
  };

  // Summary (memoized)
  const openCount = useMemo(() => items.filter(i => i.status === 'Nyitott').length, [items]);
  const inProgressCount = useMemo(() => items.filter(i => i.status === 'Folyamatban').length, [items]);
  const doneCount = useMemo(() => items.filter(i => i.status === 'Kész' || i.status === 'Lezárt').length, [items]);
  const overdueCount = useMemo(() => items.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'Kész' && i.status !== 'Lezárt').length, [items]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('tracking.title')} subtitle={t('tracking.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('tracking.title')} subtitle={t('tracking.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="tracking" table="tracking_items" />
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {t('tracking.new_task')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700" onClick={() => setFilterStatus('Nyitott')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800 rounded-lg"><Circle className="w-5 h-5 text-gray-400" /></div>
            <div>
              <p className="text-xs text-gray-500">{t('tracking.status_open')}</p>
              <p className="text-2xl font-bold text-white">{openCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700" onClick={() => setFilterStatus('Folyamatban')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg"><Clock className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-gray-500">{t('tracking.status_in_progress')}</p>
              <p className="text-2xl font-bold text-white">{inProgressCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700" onClick={() => setFilterStatus('')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg"><CheckCircle className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-gray-500">{t('tracking.status_done')}</p>
              <p className="text-2xl font-bold text-white">{doneCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg"><AlertCircle className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-gray-500">{t('tracking.overdue')}</p>
              <p className="text-2xl font-bold text-white">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 text-xs rounded-lg border ${!filterStatus ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>{t('common.all')}</button>
        {DEFAULT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-xs rounded-lg border ${filterStatus === s ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>{t(STATUS_KEYS[s] ?? s)}</button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(item.status)}
              <div>
                <div className="flex items-center gap-2">
                  {item.referenceCode && <span className="text-xs text-gray-500 font-mono">{item.referenceCode}</span>}
                  <h3 className="text-white font-medium">{item.title}</h3>
                  <span className={`text-xs ${PRIORITIES.find(p => p.value === item.priority)?.color ?? 'text-gray-400'}`}>
                    {t(PRIORITIES.find(p => p.value === item.priority)?.labelKey ?? item.priority)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {item.assignedTo && <span>{t('tracking.assigned_label')}: {item.assignedTo} • </span>}
                  {item.dueDate && <span>{t('tracking.due_label')}: {item.dueDate}</span>}
                </p>
              </div>
            </div>
            <select
              value={item.status}
              onChange={e => handleStatusChange(item, e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-300"
            >
              {DEFAULT_STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEYS[s] ?? s)}</option>)}
            </select>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">{t('tracking.no_tasks')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('tracking.new_task')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.ref_code')}</label>
                <input type="text" value={formRef} onChange={e => setFormRef(e.target.value)} placeholder={t('tracking.ref_placeholder')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.task_title')} *</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.description')}</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.priority')}</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{t(p.labelKey)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.assigned_to')}</label>
                  <input type="text" value={formAssigned} onChange={e => setFormAssigned(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('tracking.due_date')}</label>
                <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? `${t('common.saving')}...` : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
