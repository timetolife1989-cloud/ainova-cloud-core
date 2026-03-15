'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { Calendar, Plus, X, Check, AlertTriangle, Users, Cpu, MapPin } from 'lucide-react';

interface CapacityEntry {
  id: number;
  weekStart: string;
  resourceType: string;
  resourceName: string;
  plannedHours: number;
  allocatedHours: number;
  actualHours: number;
  utilizationPercent: number;
}

const RESOURCE_TYPES = [
  { value: 'worker', labelKey: 'scheduling.type_worker', icon: Users },
  { value: 'machine', labelKey: 'scheduling.type_machine', icon: Cpu },
  { value: 'area', labelKey: 'scheduling.type_area', icon: MapPin },
];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export default function SchedulingDashboardPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CapacityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));

  // Form state
  const [formResourceType, setFormResourceType] = useState('worker');
  const [formResourceName, setFormResourceName] = useState('');
  const [formPlannedHours, setFormPlannedHours] = useState(40);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/modules/scheduling/data?weekStart=${selectedWeek}`);
      if (res.ok) {
        const json = await res.json() as { items: CapacityEntry[] };
        setEntries((json.items ?? []).map(e => ({
          ...e,
          utilizationPercent: e.plannedHours > 0 ? Math.round((e.allocatedHours / e.plannedHours) * 100) : 0,
        })));
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!formResourceName.trim()) {
      setError(t('scheduling.resource_required'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/modules/scheduling/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          weekStart: selectedWeek,
          resourceType: formResourceType,
          resourceName: formResourceName,
          plannedHours: formPlannedHours,
        }),
      });

      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));

      setModalOpen(false);
      setFormResourceName('');
      setFormPlannedHours(40);
      await fetchData();
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    if (percent >= 50) return 'bg-green-500';
    return 'bg-gray-600';
  };

  // Summary (memoized)
  const totalPlanned = useMemo(() => entries.reduce((sum, e) => sum + e.plannedHours, 0), [entries]);
  const totalAllocated = useMemo(() => entries.reduce((sum, e) => sum + e.allocatedHours, 0), [entries]);
  const avgUtilization = useMemo(() => entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.utilizationPercent, 0) / entries.length)
    : 0, [entries]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('scheduling.title')} subtitle={t('scheduling.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('scheduling.title')} subtitle={t('scheduling.subtitle')} />
        <div className="flex items-center gap-3">
          <ExportButton moduleId="scheduling" table="scheduling_capacity" />
          <input
            type="date"
            value={selectedWeek}
            onChange={e => setSelectedWeek(getWeekStart(new Date(e.target.value)))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {t('scheduling.resource')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{t('scheduling.planned_capacity')}</p>
          <p className="text-2xl font-bold text-white">{Number(totalPlanned.toFixed(1))} {t('scheduling.hours')}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{t('scheduling.allocated')}</p>
          <p className="text-2xl font-bold text-white">{Number(totalAllocated.toFixed(1))} {t('scheduling.hours')}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{t('scheduling.avg_utilization')}</p>
          <p className="text-2xl font-bold text-white">{avgUtilization}%</p>
        </div>
      </div>

      {/* Capacity grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(entry => {
          const TypeIcon = RESOURCE_TYPES.find(t => t.value === entry.resourceType)?.icon ?? Users;
          return (
            <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-teal-900/30 rounded-lg">
                  <TypeIcon className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{entry.resourceName}</p>
                  <p className="text-xs text-gray-500">{RESOURCE_TYPES.find(rt => rt.value === entry.resourceType) ? t(RESOURCE_TYPES.find(rt => rt.value === entry.resourceType)!.labelKey) : entry.resourceType}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t('scheduling.utilization')}</span>
                  <span className="text-white font-medium">{entry.utilizationPercent}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUtilizationColor(entry.utilizationPercent)} transition-all`}
                    style={{ width: `${Math.min(entry.utilizationPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{Number(entry.allocatedHours.toFixed(1))} / {Number(entry.plannedHours.toFixed(1))} {t('scheduling.hours')}</span>
                  <span>{Number((entry.plannedHours - entry.allocatedHours).toFixed(1))} {t('scheduling.free')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">{t('scheduling.no_resources')}</p>
            <p className="text-xs text-gray-600 mt-1">{t('scheduling.no_resources_hint')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('scheduling.add_resource')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('scheduling.type')}</label>
                <select value={formResourceType} onChange={e => setFormResourceType(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                  {RESOURCE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{t(rt.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('scheduling.name')} *</label>
                <input type="text" value={formResourceName} onChange={e => setFormResourceName(e.target.value)} placeholder={t('scheduling.placeholder_name')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('scheduling.planned_hours')}</label>
                <input type="number" value={formPlannedHours} onChange={e => setFormPlannedHours(parseInt(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
