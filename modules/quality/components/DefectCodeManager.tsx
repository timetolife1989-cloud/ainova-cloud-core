'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { Plus, X, Check, AlertTriangle, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';

interface DefectCode {
  id: number;
  code: string;
  nameHu: string;
  nameEn: string | null;
  nameDe: string | null;
  category: string | null;
  severity: string;
  isActive: boolean;
}

const SEVERITIES = ['minor', 'major', 'critical'] as const;

export default function DefectCodeManager() {
  const { t } = useTranslation();
  const [codes, setCodes] = useState<DefectCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  // Form
  const [fCode, setFCode] = useState('');
  const [fNameHu, setFNameHu] = useState('');
  const [fNameEn, setFNameEn] = useState('');
  const [fNameDe, setFNameDe] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fSeverity, setFSeverity] = useState<string>('minor');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/quality/defect-codes');
      if (res.ok) {
        const json = await res.json() as { items?: DefectCode[] };
        setCodes(json.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const openCreate = () => {
    setEditId(null);
    setFCode(''); setFNameHu(''); setFNameEn(''); setFNameDe(''); setFCategory(''); setFSeverity('minor');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (dc: DefectCode) => {
    setEditId(dc.id);
    setFCode(dc.code);
    setFNameHu(dc.nameHu);
    setFNameEn(dc.nameEn ?? '');
    setFNameDe(dc.nameDe ?? '');
    setFCategory(dc.category ?? '');
    setFSeverity(dc.severity);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!fCode.trim() || !fNameHu.trim()) {
      setError(t('quality.dc_code_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: fCode,
        nameHu: fNameHu,
        nameEn: fNameEn || undefined,
        nameDe: fNameDe || undefined,
        category: fCategory || undefined,
        severity: fSeverity,
      };

      let res: Response;
      if (editId) {
        res = await fetch('/api/modules/quality/defect-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ id: editId, ...payload }),
        });
      } else {
        res = await fetch('/api/modules/quality/defect-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify(payload),
        });
      }

      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      closeModal();
      await fetchData();
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dc: DefectCode) => {
    try {
      await fetch('/api/modules/quality/defect-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ id: dc.id, isActive: !dc.isActive }),
      });
      await fetchData();
    } catch { /* ignore */ }
  };

  const categories = [...new Set(codes.map(c => c.category).filter(Boolean))] as string[];
  const filtered = filterCategory ? codes.filter(c => c.category === filterCategory) : codes;

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-900/40 text-red-400 border-red-800';
      case 'major': return 'bg-orange-900/40 text-orange-400 border-orange-800';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />;

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCategory('')} className={`px-3 py-1.5 text-xs rounded-lg border ${!filterCategory ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>{t('common.all')} ({codes.length})</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 text-xs rounded-lg border ${filterCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>{cat}</button>
          ))}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> {t('quality.dc_new')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">{t('quality.dc_code')}</th>
              <th className="px-4 py-3 text-left">{t('quality.dc_name')}</th>
              <th className="px-4 py-3 text-left">{t('quality.dc_category')}</th>
              <th className="px-4 py-3 text-center">{t('quality.dc_severity')}</th>
              <th className="px-4 py-3 text-center">{t('quality.dc_active')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(dc => (
              <tr key={dc.id} className={`hover:bg-gray-800/50 ${!dc.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-indigo-400 font-mono text-xs font-medium">{dc.code}</td>
                <td className="px-4 py-3 text-white">{dc.nameHu}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{dc.category ?? '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-[10px] rounded-full border ${severityColor(dc.severity)}`}>{t(`quality.dc_sev_${dc.severity}`)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => void toggleActive(dc)} className="text-gray-400 hover:text-white">
                    {dc.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(dc)} className="p-1 text-gray-500 hover:text-indigo-400" title={t('common.edit')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('quality.dc_empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{editId ? t('quality.dc_edit') : t('quality.dc_new')}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_code')} *</label>
                  <input type="text" value={fCode} onChange={e => setFCode(e.target.value)} placeholder="E01" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_category')}</label>
                  <input type="text" value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_name')} (HU) *</label>
                <input type="text" value={fNameHu} onChange={e => setFNameHu(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_name')} (EN)</label>
                  <input type="text" value={fNameEn} onChange={e => setFNameEn(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_name')} (DE)</label>
                  <input type="text" value={fNameDe} onChange={e => setFNameDe(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('quality.dc_severity')}</label>
                <div className="flex gap-2">
                  {SEVERITIES.map(s => (
                    <button key={s} onClick={() => setFSeverity(s)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${fSeverity === s ? severityColor(s) : 'bg-gray-950 border-gray-700 text-gray-500'}`}>
                      {t(`quality.dc_sev_${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
