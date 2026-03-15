'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';

interface NormaRow {
  id: number;
  matnr: string;
  maktx: string | null;
  normaSec: number;
  normaPerHour: number;
  validFrom: string | null;
}

export default function NormaManager() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<NormaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editedIds, setEditedIds] = useState<Set<number>>(new Set());

  const fetchNorma = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/modules/lac-napi-perces/norma');
      if (res.ok) {
        const json = await res.json() as { normas?: NormaRow[] };
        setRows(json.normas ?? []);
        setEditedIds(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchNorma(); }, [fetchNorma]);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleChange = (id: number, field: 'normaSec' | 'normaPerHour', value: number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setEditedIds(prev => new Set(prev).add(id));
    setSuccess(false);
  };

  const handleSave = async () => {
    const changed = rows.filter(r => editedIds.has(r.id));
    if (changed.length === 0) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/modules/lac-napi-perces/norma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          normas: changed.map(r => ({
            id: r.id,
            normaSec: r.normaSec,
            normaPerHour: r.normaPerHour,
          })),
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setSuccess(true);
      setEditedIds(new Set());
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
        <h3 className="text-sm font-medium text-gray-400">{t('lac.norma_management')}</h3>
        <div className="flex gap-2">
          <button onClick={fetchNorma} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || editedIds.size === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')} {editedIds.size > 0 && `(${editedIds.size})`}
          </button>
        </div>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">{t('lac.matnr')}</th>
              <th className="text-left px-3 py-2">{t('lac.product_name')}</th>
              <th className="text-right px-3 py-2">{t('lac.norma_sec')}</th>
              <th className="text-right px-3 py-2">{t('lac.norma_per_hour')}</th>
              <th className="text-left px-3 py-2">{t('lac.valid_from')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map(r => (
              <tr key={r.id} className={editedIds.has(r.id) ? 'bg-yellow-900/10' : ''}>
                <td className="px-3 py-2 text-gray-300 font-mono text-xs">{r.matnr}</td>
                <td className="px-3 py-2 text-white truncate max-w-xs">{r.maktx ?? '-'}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.1"
                    value={r.normaSec}
                    onChange={e => handleChange(r.id, 'normaSec', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="1"
                    value={r.normaPerHour}
                    onChange={e => handleChange(r.id, 'normaPerHour', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right"
                  />
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{r.validFrom ?? '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t('common.no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
