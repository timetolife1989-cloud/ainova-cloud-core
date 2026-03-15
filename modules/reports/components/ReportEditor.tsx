'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { X, Check, AlertTriangle } from 'lucide-react';

interface ReportEditorProps {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  presetName?: string;
  presetChartType?: string;
  presetDateRange?: string;
}

const SOURCE_MODULES = [
  { id: 'oee',         table: 'oee_records',         label: 'OEE' },
  { id: 'workforce',   table: 'workforce_daily',     label: 'Workforce' },
  { id: 'maintenance', table: 'maintenance_log',     label: 'Maintenance' },
  { id: 'quality',     table: 'quality_inspections', label: 'Quality' },
  { id: 'delivery',    table: 'delivery_shipments',  label: 'Delivery' },
  { id: 'inventory',   table: 'inventory_movements', label: 'Inventory' },
  { id: 'fleet',       table: 'fleet_trips',         label: 'Fleet' },
  { id: 'performance', table: 'performance_entries', label: 'Performance' },
];

const CHART_TYPES = ['bar', 'line', 'pie', 'area', 'table'] as const;
const DATE_RANGES = ['last_7_days', 'last_30_days', 'last_90_days', 'last_365_days'] as const;

export function ReportEditor({ onClose, onSaved, presetName, presetChartType, presetDateRange }: ReportEditorProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(presetName ?? '');
  const [description, setDescription] = useState('');
  const [sourceIdx, setSourceIdx] = useState(0);
  const [chartType, setChartType] = useState<string>(presetChartType ?? 'bar');
  const [dateRange, setDateRange] = useState<string>(presetDateRange ?? 'last_30_days');
  const [isPublic, setIsPublic] = useState(true);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('reports.err_name_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const source = SOURCE_MODULES[sourceIdx];
      const res = await fetch('/api/modules/reports/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          reportName: name.trim(),
          description: description.trim() || undefined,
          sourceModule: source.id,
          sourceTable: source.table,
          chartType,
          config: { dateRange, groupBy: 'day', showLegend: true },
          isPublic,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Error');
      onClose();
      await onSaved();
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">{t('reports.new_report')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Report name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('reports.report_name')} *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
              placeholder={t('reports.report_name_placeholder')} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('reports.description')}</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
          </div>

          {/* Source module */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('reports.source_module')}</label>
            <select value={sourceIdx} onChange={e => setSourceIdx(parseInt(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
              {SOURCE_MODULES.map((m, i) => (
                <option key={m.id} value={i}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Chart type & date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('reports.chart_type')}</label>
              <select value={chartType} onChange={e => setChartType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                {CHART_TYPES.map(ct => (
                  <option key={ct} value={ct}>{t(`reports.chart_${ct}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('reports.date_range')}</label>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                {DATE_RANGES.map(dr => (
                  <option key={dr} value={dr}>{t(`reports.range_${dr}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Public toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              className="rounded border-gray-700 bg-gray-950 text-violet-500 focus:ring-violet-500" />
            <span className="text-sm text-gray-300">{t('reports.is_public')}</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <Check className="w-4 h-4" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
