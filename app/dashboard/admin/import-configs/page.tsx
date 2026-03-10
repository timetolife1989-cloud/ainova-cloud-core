'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Plus, Pencil, Trash2, X, FileSpreadsheet, AlertTriangle, Check } from 'lucide-react';

interface ColumnMapping {
  source: string;
  target: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'float';
  required?: boolean;
  transform?: string;
}

interface ImportFilter {
  column: string;
  operator: '=' | '!=' | 'contains' | 'starts_with' | 'in';
  value: string;
}

interface ImportConfig {
  id: number;
  configName: string;
  moduleId: string | null;
  fileType: 'excel' | 'csv' | 'json';
  targetTable: string;
  columnMapping: ColumnMapping[];
  filters: ImportFilter[];
  isActive: boolean;
  createdAt: string;
}

const COLUMN_TYPES = ['string', 'number', 'date', 'boolean', 'float'] as const;
const FILE_TYPES = ['excel', 'csv'] as const;
const OPERATORS = ['=', '!=', 'contains', 'starts_with', 'in'] as const;

export default function ImportConfigsPage() {
  const [configs, setConfigs] = useState<ImportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ImportConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formFileType, setFormFileType] = useState<'excel' | 'csv'>('excel');
  const [formTargetTable, setFormTargetTable] = useState('');
  const [formMappings, setFormMappings] = useState<ColumnMapping[]>([]);
  const [formFilters, setFormFilters] = useState<ImportFilter[]>([]);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import-configs');
      if (res.ok) {
        const json = await res.json() as { configs: ImportConfig[] };
        setConfigs(json.configs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  const openCreate = () => {
    setEditingConfig(null);
    setFormName('');
    setFormFileType('excel');
    setFormTargetTable('');
    setFormMappings([{ source: '', target: '', type: 'string' }]);
    setFormFilters([]);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (config: ImportConfig) => {
    setEditingConfig(config);
    setFormName(config.configName);
    setFormFileType(config.fileType === 'json' ? 'excel' : config.fileType);
    setFormTargetTable(config.targetTable);
    setFormMappings(config.columnMapping.length > 0 ? config.columnMapping : [{ source: '', target: '', type: 'string' }]);
    setFormFilters(config.filters);
    setError(null);
    setModalOpen(true);
  };

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!formName || !formTargetTable) {
      setError('Név és cél tábla kötelező');
      return;
    }

    const validMappings = formMappings.filter(m => m.source && m.target);
    if (validMappings.length === 0) {
      setError('Legalább egy oszlop mapping szükséges');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() };
      const payload = {
        configName: formName,
        fileType: formFileType,
        targetTable: formTargetTable,
        columnMapping: validMappings,
        filters: formFilters.filter(f => f.column && f.value),
      };

      if (editingConfig) {
        const res = await fetch('/api/admin/import-configs', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ id: editingConfig.id, ...payload }),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Hiba');
      } else {
        const res = await fetch('/api/admin/import-configs', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Hiba');
      }

      setModalOpen(false);
      await fetchConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (config: ImportConfig) => {
    if (!confirm(`Biztosan törölni szeretnéd a "${config.configName}" konfigurációt?`)) return;

    try {
      const res = await fetch('/api/admin/import-configs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ id: config.id }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      await fetchConfigs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Hiba történt');
    }
  };

  const addMapping = () => {
    setFormMappings([...formMappings, { source: '', target: '', type: 'string' }]);
  };

  const removeMapping = (idx: number) => {
    setFormMappings(formMappings.filter((_, i) => i !== idx));
  };

  const updateMapping = (idx: number, field: keyof ColumnMapping, value: string) => {
    const updated = [...formMappings];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormMappings(updated);
  };

  const addFilter = () => {
    setFormFilters([...formFilters, { column: '', operator: '=', value: '' }]);
  };

  const removeFilter = (idx: number) => {
    setFormFilters(formFilters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, field: keyof ImportFilter, value: string) => {
    const updated = [...formFilters];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormFilters(updated);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Import konfigurációk" subtitle="Fájl import beállítások" />
        <div className="animate-pulse space-y-3 mt-6">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title="Import konfigurációk" subtitle="Fájl import beállítások és oszlop mapping" />

      <div className="mt-6 flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Új konfiguráció
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {configs.map(config => (
          <div key={config.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-800 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">{config.configName}</h3>
                <p className="text-xs text-gray-500">
                  {config.fileType.toUpperCase()} → {config.targetTable} • {config.columnMapping.length} oszlop
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config.isActive && (
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">Aktív</span>
              )}
              <button onClick={() => openEdit(config)} className="p-2 hover:bg-gray-800 rounded-lg" title="Szerkesztés">
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => handleDelete(config)} className="p-2 hover:bg-gray-800 rounded-lg" title="Törlés">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nincs import konfiguráció</p>
            <p className="text-gray-500 text-sm mt-1">Hozz létre egyet az Excel/CSV fájlok importálásához</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingConfig ? 'Konfiguráció szerkesztése' : 'Új import konfiguráció'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Konfiguráció neve</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="pl. SAP Visszajelentés"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Fájl típus</label>
                  <select
                    value={formFileType}
                    onChange={e => setFormFileType(e.target.value as 'excel' | 'csv')}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  >
                    {FILE_TYPES.map(t => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cél tábla</label>
                <input
                  type="text"
                  value={formTargetTable}
                  onChange={e => setFormTargetTable(e.target.value)}
                  placeholder="pl. sap_visszajelentes"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>

              {/* Column mappings */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Oszlop mapping</label>
                <div className="space-y-2">
                  {formMappings.map((mapping, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mapping.source}
                        onChange={e => updateMapping(idx, 'source', e.target.value)}
                        placeholder="Excel oszlop"
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                      />
                      <span className="text-gray-500">→</span>
                      <input
                        type="text"
                        value={mapping.target}
                        onChange={e => updateMapping(idx, 'target', e.target.value)}
                        placeholder="DB oszlop"
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                      />
                      <select
                        value={mapping.type}
                        onChange={e => updateMapping(idx, 'type', e.target.value)}
                        className="w-24 bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100"
                      >
                        {COLUMN_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMapping(idx)}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addMapping}
                  className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  + Új oszlop hozzáadása
                </button>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Szűrők (opcionális)</label>
                <div className="space-y-2">
                  {formFilters.map((filter, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={filter.column}
                        onChange={e => updateFilter(idx, 'column', e.target.value)}
                        placeholder="Oszlop"
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                      />
                      <select
                        value={filter.operator}
                        onChange={e => updateFilter(idx, 'operator', e.target.value)}
                        className="w-28 bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100"
                      >
                        {OPERATORS.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={e => updateFilter(idx, 'value', e.target.value)}
                        placeholder="Érték"
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                      />
                      <button
                        onClick={() => removeFilter(idx)}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addFilter}
                  className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  + Új szűrő hozzáadása
                </button>
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
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
