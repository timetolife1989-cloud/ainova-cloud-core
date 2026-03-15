'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { ShieldCheck, Plus, X, Check, AlertTriangle, CheckCircle, XCircle, FileText, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Inspection {
  id: number; inspectionDate: string; productCode: string | null; productName: string | null;
  batchNumber: string | null; inspector: string | null; totalChecked: number; passedCount: number;
  rejectedCount: number; rejectCode: string | null; status: string;
}

interface Report8D {
  id: number; inspectionId: number | null; reportNumber: string;
  d1Team: string | null; d2Problem: string | null; d3Containment: string | null;
  d4RootCause: string | null; d5Corrective: string | null; d6Implemented: string | null;
  d7Preventive: string | null; d8Recognition: string | null;
  status: string; createdBy: string | null; createdAt: string;
}

const D_STEPS = ['d1Team', 'd2Problem', 'd3Containment', 'd4RootCause', 'd5Corrective', 'd6Implemented', 'd7Preventive', 'd8Recognition'] as const;

export default function QualityDashboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'inspections' | '8d'>('inspections');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [reports8d, setReports8d] = useState<Report8D[]>([]);
  const [loading, setLoading] = useState(true);
  const [loading8d, setLoading8d] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 8D wizard state
  const [wizard8dOpen, setWizard8dOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardNumber, setWizardNumber] = useState('');
  const [wizardFields, setWizardFields] = useState<Record<string, string>>({});
  const [saving8d, setSaving8d] = useState(false);
  const [error8d, setError8d] = useState<string | null>(null);

  // 8D viewer
  const [viewing8d, setViewing8d] = useState<Report8D | null>(null);

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProduct, setFormProduct] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formTotal, setFormTotal] = useState(0);
  const [formPassed, setFormPassed] = useState(0);
  const [formRejectCode, setFormRejectCode] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/quality/data');
      if (res.ok) {
      const json = await res.json() as { inspections?: Inspection[] };
      setInspections(json.inspections ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  const fetch8d = useCallback(async () => {
    setLoading8d(true);
    try {
      const res = await fetch('/api/modules/quality/8d');
      if (res.ok) {
      const json = await res.json() as { reports?: Report8D[] };
      setReports8d(json.reports ?? []);
      }
    } finally { setLoading8d(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === '8d' && reports8d.length === 0) void fetch8d(); }, [tab, reports8d.length, fetch8d]);
  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/quality/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ inspectionDate: formDate, productName: formProduct || undefined, batchNumber: formBatch || undefined, totalChecked: formTotal, passedCount: formPassed, rejectCode: formRejectCode || undefined }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('dt.status.error'));
      setModalOpen(false); setFormProduct(''); setFormBatch(''); setFormTotal(0); setFormPassed(0); setFormRejectCode('');
      await fetchData();
    } catch (e) { setError(getErrorMessage(e, t)); }
    finally { setSaving(false); }
  };

  const openWizard = () => {
    const year = new Date().getFullYear();
    const seq = String(reports8d.length + 1).padStart(3, '0');
    setWizardNumber(`8D-${year}-${seq}`);
    setWizardFields({});
    setWizardStep(0);
    setError8d(null);
    setWizard8dOpen(true);
  };

  const handleSave8d = async () => {
    if (!wizardNumber.trim()) { setError8d(t('quality.8d_number_required')); return; }
    setSaving8d(true); setError8d(null);
    try {
      const res = await fetch('/api/modules/quality/8d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          reportNumber: wizardNumber,
          d1Team: wizardFields.d1Team || undefined,
          d2Problem: wizardFields.d2Problem || undefined,
          d3Containment: wizardFields.d3Containment || undefined,
          d4RootCause: wizardFields.d4RootCause || undefined,
          d5Corrective: wizardFields.d5Corrective || undefined,
          d6Implemented: wizardFields.d6Implemented || undefined,
          d7Preventive: wizardFields.d7Preventive || undefined,
          d8Recognition: wizardFields.d8Recognition || undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('dt.status.error'));
      setWizard8dOpen(false);
      await fetch8d();
    } catch (e) { setError8d(e instanceof Error ? e.message : t('dt.status.error')); }
    finally { setSaving8d(false); }
  };

  const handleDelete8d = async (id: number) => {
    try {
      await fetch(`/api/modules/quality/8d/${id}`, {
        method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      setReports8d(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'closed': return 'bg-green-900/40 text-green-400 border-green-800';
      case 'implemented': return 'bg-blue-900/40 text-blue-400 border-blue-800';
      case 'in_progress': return 'bg-yellow-900/40 text-yellow-400 border-yellow-800';
      default: return 'bg-red-900/40 text-red-400 border-red-800';
    }
  };

  const statusLabel = (s: string) => t(`quality.8d_status_${s}`) || s;

  const totalChecked = inspections.reduce((s, i) => s + i.totalChecked, 0);
  const totalPassed = inspections.reduce((s, i) => s + i.passedCount, 0);
  const totalRejected = inspections.reduce((s, i) => s + i.rejectedCount, 0);
  const passRate = totalChecked > 0 ? Math.round((totalPassed / totalChecked) * 100) : 0;

  if (loading) return (<div className="max-w-7xl mx-auto px-4 py-8"><DashboardSectionHeader title={t('quality.title')} subtitle={t('quality.subtitle')} /><div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" /></div>);

  const dStepLabels: Record<string, string> = {
    d1Team: t('quality.8d_d1'), d2Problem: t('quality.8d_d2'), d3Containment: t('quality.8d_d3'),
    d4RootCause: t('quality.8d_d4'), d5Corrective: t('quality.8d_d5'), d6Implemented: t('quality.8d_d6'),
    d7Preventive: t('quality.8d_d7'), d8Recognition: t('quality.8d_d8'),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('quality.title')} subtitle={t('quality.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="quality" table="quality_inspections" />
          {tab === 'inspections' && (
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> {t('quality.new_inspection')}</button>
          )}
          {tab === '8d' && (
            <button onClick={openWizard} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> {t('quality.8d_new')}</button>
          )}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('inspections')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'inspections' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          <ShieldCheck className="w-4 h-4 inline mr-2" />{t('quality.title')}
        </button>
        <button onClick={() => setTab('8d')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === '8d' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          <FileText className="w-4 h-4 inline mr-2" />{t('quality.8d_title')}
        </button>
      </div>

      {/* Inspections tab */}
      {tab === 'inspections' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><p className="text-xs text-gray-500">{t('quality.checked')}</p><p className="text-2xl font-bold text-white">{totalChecked.toLocaleString()}</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-xs text-gray-500">{t('quality.passed')}</p></div><p className="text-2xl font-bold text-green-400">{totalPassed.toLocaleString()}</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-gray-500">{t('quality.rejected')}</p></div><p className="text-2xl font-bold text-red-400">{totalRejected.toLocaleString()}</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><p className="text-xs text-gray-500">{t('quality.pass_rate')}</p><p className={`text-2xl font-bold ${passRate >= 95 ? 'text-green-400' : passRate >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{passRate}%</p></div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                <tr><th className="px-4 py-3 text-left">{t('quality.date')}</th><th className="px-4 py-3 text-left">{t('quality.product')}</th><th className="px-4 py-3 text-left">{t('quality.batch')}</th><th className="px-4 py-3 text-right">{t('quality.checked')}</th><th className="px-4 py-3 text-right">{t('quality.good')}</th><th className="px-4 py-3 text-right">{t('quality.rejected')}</th><th className="px-4 py-3 text-right">%</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {inspections.slice(0, 20).map(i => (
                  <tr key={i.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-300">{i.inspectionDate}</td>
                    <td className="px-4 py-3 text-white">{i.productName ?? i.productCode ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i.batchNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{i.totalChecked}</td>
                    <td className="px-4 py-3 text-right text-green-400">{i.passedCount}</td>
                    <td className="px-4 py-3 text-right text-red-400">{i.rejectedCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{i.totalChecked > 0 ? Math.round((i.passedCount / i.totalChecked) * 100) : 0}%</td>
                  </tr>
                ))}
                {inspections.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500"><ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />{t('quality.no_inspections')}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 8D Reports tab */}
      {tab === '8d' && (
        <>
          {loading8d ? (
            <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />
          ) : reports8d.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">{t('quality.8d_no_reports')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports8d.map(r => (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-indigo-400 font-medium">{r.reportNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                      </div>
                      <p className="text-white text-sm mb-1">{r.d2Problem || '-'}</p>
                      {r.d4RootCause && <p className="text-gray-400 text-xs">{t('quality.8d_d4')}: {r.d4RootCause}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button onClick={() => setViewing8d(r)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white" title={t('quality.8d_view')}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => void handleDelete8d(r.id)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400" title={t('quality.8d_delete')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{r.createdBy}</span>
                    <span>{r.createdAt.split('T')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Inspection modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-white">{t('quality.new_inspection')}</h3><button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('quality.date')}</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('quality.batch_number')}</label><input type="text" value={formBatch} onChange={e => setFormBatch(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">{t('quality.product')}</label><input type="text" value={formProduct} onChange={e => setFormProduct(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">{t('quality.checked')}</label><input type="number" value={formTotal} onChange={e => setFormTotal(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('quality.passed')}</label><input type="number" value={formPassed} onChange={e => setFormPassed(parseInt(e.target.value) || 0)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">{t('quality.reject_code')}</label><input type="text" value={formRejectCode} onChange={e => setFormRejectCode(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('quality.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? t('quality.saving') : t('quality.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 8D Wizard Modal */}
      {wizard8dOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('quality.8d_new')}</h3>
              <button onClick={() => setWizard8dOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-6">
              {D_STEPS.map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= wizardStep ? 'bg-indigo-500' : 'bg-gray-700'}`} />
              ))}
            </div>

            {wizardStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('quality.8d_report_number')}</label>
                  <input type="text" value={wizardNumber} onChange={e => setWizardNumber(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{dStepLabels.d1Team}</label>
                  <textarea value={wizardFields.d1Team ?? ''} onChange={e => setWizardFields(f => ({ ...f, d1Team: e.target.value }))} rows={3} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 resize-none" placeholder={t('quality.8d_d1_hint')} />
                </div>
              </div>
            )}

            {wizardStep >= 1 && wizardStep <= 7 && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  <span className="text-indigo-400 font-mono mr-1">D{wizardStep + 1}</span>
                  {dStepLabels[D_STEPS[wizardStep]]}
                </label>
                <textarea
                  value={wizardFields[D_STEPS[wizardStep]] ?? ''}
                  onChange={e => setWizardFields(f => ({ ...f, [D_STEPS[wizardStep]]: e.target.value }))}
                  rows={5}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 resize-none"
                />
              </div>
            )}

            {error8d && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error8d}</div>}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setWizardStep(s => Math.max(0, s - 1))} disabled={wizardStep === 0} className="flex items-center gap-1 px-4 py-2 text-gray-400 text-sm disabled:opacity-30 hover:text-white">
                <ChevronLeft className="w-4 h-4" /> {t('quality.8d_prev')}
              </button>
              {wizardStep < 7 ? (
                <button onClick={() => setWizardStep(s => s + 1)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                  {t('quality.8d_next')} <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSave8d} disabled={saving8d} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  <Check className="w-4 h-4" /> {saving8d ? t('quality.saving') : t('quality.save')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8D Viewer Modal */}
      {viewing8d && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-white font-mono">{viewing8d.reportNumber}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(viewing8d.status)}`}>{statusLabel(viewing8d.status)}</span>
              </div>
              <button onClick={() => setViewing8d(null)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {D_STEPS.map(step => {
                const val = viewing8d[step];
                return (
                  <div key={step} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                    <p className="text-xs text-indigo-400 font-medium mb-1">{dStepLabels[step]}</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{val || <span className="text-gray-600 italic">—</span>}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span>{viewing8d.createdBy}</span>
              <span>{viewing8d.createdAt.split('T')[0]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
