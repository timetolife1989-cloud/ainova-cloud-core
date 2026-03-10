'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Ruler, Plus, Pencil, Trash2, X, Lock, AlertTriangle } from 'lucide-react';

interface UnitInfo {
  id: number;
  unitCode: string;
  unitLabel: string;
  unitType: string;
  symbol: string | null;
  decimals: number;
  isBuiltin: boolean;
  isActive: boolean;
}

const UNIT_TYPES = [
  { value: 'time', label: 'Idő' },
  { value: 'count', label: 'Mennyiség' },
  { value: 'weight', label: 'Súly' },
  { value: 'currency', label: 'Pénznem' },
  { value: 'ratio', label: 'Arány' },
  { value: 'length', label: 'Hossz' },
  { value: 'volume', label: 'Térfogat' },
  { value: 'distance', label: 'Távolság' },
  { value: 'custom', label: 'Egyéb' },
];

export default function UnitsPage() {
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState('custom');
  const [formSymbol, setFormSymbol] = useState('');
  const [formDecimals, setFormDecimals] = useState(2);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/units');
      if (res.ok) {
        const json = await res.json() as { units: UnitInfo[] };
        setUnits(json.units);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUnits();
  }, [fetchUnits]);

  const openCreate = () => {
    setEditingUnit(null);
    setFormCode('');
    setFormLabel('');
    setFormType('custom');
    setFormSymbol('');
    setFormDecimals(2);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (unit: UnitInfo) => {
    setEditingUnit(unit);
    setFormCode(unit.unitCode);
    setFormLabel(unit.unitLabel);
    setFormType(unit.unitType);
    setFormSymbol(unit.symbol ?? '');
    setFormDecimals(unit.decimals);
    setError(null);
    setModalOpen(true);
  };

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() };

      if (editingUnit) {
        const res = await fetch('/api/admin/units', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: editingUnit.id,
            unitLabel: formLabel,
            symbol: formSymbol || undefined,
            decimals: formDecimals,
          }),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Hiba');
      } else {
        const res = await fetch('/api/admin/units', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            unitCode: formCode,
            unitLabel: formLabel,
            unitType: formType,
            symbol: formSymbol || undefined,
            decimals: formDecimals,
          }),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Hiba');
      }

      setModalOpen(false);
      await fetchUnits();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unit: UnitInfo) => {
    if (unit.isBuiltin) return;
    if (!confirm(`Biztosan törölni szeretnéd a "${unit.unitLabel}" mértékegységet?`)) return;

    try {
      const res = await fetch('/api/admin/units', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ id: unit.id }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      await fetchUnits();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Hiba történt');
    }
  };

  const filteredUnits = filter
    ? units.filter(u => u.unitType === filter)
    : units;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Mértékegységek" subtitle="Mértékegységek kezelése" />
        <div className="animate-pulse space-y-3 mt-6">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title="Mértékegységek" subtitle="Mértékegységek kezelése (perc, darab, kg, egyedi)" />

      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filter === '' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            Összes
          </button>
          {UNIT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                filter === t.value ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Új mértékegység
        </button>
      </div>

      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Kód</th>
              <th className="px-4 py-3 text-left">Név</th>
              <th className="px-4 py-3 text-left">Típus</th>
              <th className="px-4 py-3 text-center">Szimbólum</th>
              <th className="px-4 py-3 text-center">Tizedes</th>
              <th className="px-4 py-3 text-center">Műveletek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredUnits.map(unit => (
              <tr key={unit.id} className={`hover:bg-gray-800/50 ${!unit.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-gray-300">{unit.unitCode}</td>
                <td className="px-4 py-3 text-gray-100">{unit.unitLabel}</td>
                <td className="px-4 py-3 text-gray-400">{UNIT_TYPES.find(t => t.value === unit.unitType)?.label ?? unit.unitType}</td>
                <td className="px-4 py-3 text-center text-gray-300">{unit.symbol ?? '-'}</td>
                <td className="px-4 py-3 text-center text-gray-400">{unit.decimals}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {unit.isBuiltin ? (
                      <span title="Beépített"><Lock className="w-4 h-4 text-gray-600" /></span>
                    ) : (
                      <>
                        <button onClick={() => openEdit(unit)} className="p-1 hover:bg-gray-700 rounded" title="Szerkesztés">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleDelete(unit)} className="p-1 hover:bg-gray-700 rounded" title="Törlés">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUnits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <Ruler className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nincs találat
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingUnit ? 'Mértékegység szerkesztése' : 'Új mértékegység'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Kód</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  disabled={!!editingUnit}
                  placeholder="pl. normamin"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Név</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="pl. Normaperc"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Típus</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  disabled={!!editingUnit}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 disabled:opacity-50"
                >
                  {UNIT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Szimbólum</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={e => setFormSymbol(e.target.value)}
                    placeholder="pl. Np"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Tizedesek</label>
                  <input
                    type="number"
                    value={formDecimals}
                    onChange={e => setFormDecimals(parseInt(e.target.value) || 0)}
                    min={0}
                    max={6}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm"
              >
                Mégse
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formCode || !formLabel}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
