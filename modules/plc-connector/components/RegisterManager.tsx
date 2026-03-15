'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { Plus, Save, X, AlertTriangle, Cpu, Trash2 } from 'lucide-react';

interface PlcRegister {
  id: number;
  deviceId: number;
  registerAddress: string;
  registerName: string;
  dataType: string;
  unit: string | null;
  scaleFactor: number | null;
  isActive: boolean;
}

interface Props {
  deviceId: number;
  deviceName: string;
}

const DATA_TYPES = ['INT16', 'INT32', 'UINT16', 'UINT32', 'FLOAT32', 'FLOAT64', 'BOOL', 'STRING'];

export default function RegisterManager({ deviceId, deviceName }: Props) {
  const { t } = useTranslation();
  const [registers, setRegisters] = useState<PlcRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [formAddr, setFormAddr] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('INT16');
  const [formUnit, setFormUnit] = useState('');
  const [formScale, setFormScale] = useState<number | ''>('');

  const fetchRegisters = useCallback(async () => {
    try {
      const res = await fetch(`/api/modules/plc-connector/registers?deviceId=${deviceId}`);
      if (res.ok) {
        const json = await res.json() as { registers?: PlcRegister[] };
        setRegisters(json.registers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { void fetchRegisters(); }, [fetchRegisters]);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSave = async () => {
    if (!formAddr.trim() || !formName.trim()) {
      setError(t('plc.register_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/modules/plc-connector/registers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          deviceId,
          registerAddress: formAddr,
          registerName: formName,
          dataType: formType,
          unit: formUnit || undefined,
          scaleFactor: formScale !== '' ? formScale : undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setModalOpen(false);
      setFormAddr(''); setFormName(''); setFormType('INT16'); setFormUnit(''); setFormScale('');
      await fetchRegisters();
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/modules/plc-connector/registers?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      await fetchRegisters();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-48" />;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400">{t('plc.registers')}</h3>
          <p className="text-xs text-gray-500">{deviceName}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> {t('plc.add_register')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">{t('plc.address')}</th>
              <th className="text-left px-3 py-2">{t('plc.name')}</th>
              <th className="text-left px-3 py-2">{t('plc.data_type')}</th>
              <th className="text-left px-3 py-2">{t('plc.unit')}</th>
              <th className="text-right px-3 py-2">{t('plc.scale')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {registers.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-cyan-400 font-mono text-xs">{r.registerAddress}</td>
                <td className="px-3 py-2 text-white">{r.registerName}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{r.dataType}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{r.unit ?? '-'}</td>
                <td className="px-3 py-2 text-right text-gray-400">{r.scaleFactor ?? '1'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => void handleDelete(r.id)} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {registers.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">
                <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />{t('plc.no_registers')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('plc.add_register')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('plc.address')} *</label>
                  <input type="text" value={formAddr} onChange={e => setFormAddr(e.target.value)} placeholder="40001" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('plc.data_type')}</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('plc.name')} *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('plc.unit')}</label>
                  <input type="text" value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="°C, bar, rpm" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('plc.scale')}</label>
                  <input type="number" step="0.01" value={formScale} onChange={e => setFormScale(e.target.value ? parseFloat(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
