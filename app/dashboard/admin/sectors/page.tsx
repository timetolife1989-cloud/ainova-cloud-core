'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';
import Link from 'next/link';

interface SectorPreset {
  id: number;
  sectorId: string;
  nameHu: string;
  nameEn: string;
  nameDe: string;
  icon: string;
  modules: string[];
  optionalModules: string[];
  settings: Record<string, string>;
  recommendedTier: string;
}

const TIER_OPTIONS = ['basic', 'professional', 'enterprise'] as const;

const ICON_OPTIONS = ['Factory', 'ShoppingCart', 'Wrench', 'ChefHat', 'HardHat', 'Truck', 'Building2', 'Briefcase', 'Heart', 'Zap'];

const ALL_MODULE_IDS = [
  'inventory', 'invoicing', 'workforce', 'tracking', 'fleet', 'file-import',
  'reports', 'purchasing', 'pos', 'crm', 'worksheets', 'performance',
  'scheduling', 'delivery', 'sap-import', 'oee', 'plc-connector',
  'shift-management', 'quality', 'maintenance', 'digital-twin',
];

export default function SectorsAdminPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [sectors, setSectors] = useState<SectorPreset[]>([]);
  const [editing, setEditing] = useState<SectorPreset | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadSectors = useCallback(async () => {
    const res = await fetch('/api/admin/sectors');
    const data = await res.json() as { sectors: SectorPreset[] };
    if (data.sectors) setSectors(data.sectors);
  }, []);

  useEffect(() => { loadSectors(); }, [loadSectors]);

  const handleSave = async () => {
    if (!editing) return;
    setLoading(true);
    setMsg('');
    const method = editing.id ? 'PUT' : 'POST';
    const body = {
      ...(editing.id ? { id: editing.id } : {}),
      sectorId: editing.sectorId,
      nameHu: editing.nameHu,
      nameEn: editing.nameEn,
      nameDe: editing.nameDe,
      icon: editing.icon,
      modules: editing.modules,
      optionalModules: editing.optionalModules,
      settings: editing.settings,
      recommendedTier: editing.recommendedTier,
    };

    const res = await fetch('/api/admin/sectors', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken || '' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMsg(t('common.saved'));
      setEditing(null);
      await loadSectors();
    } else {
      const err = await res.json() as { error?: string };
      setMsg(err.error ?? 'Error');
    }
    setLoading(false);
  };

  const startNew = () => {
    setEditing({
      id: 0,
      sectorId: '',
      nameHu: '',
      nameEn: '',
      nameDe: '',
      icon: 'Building2',
      modules: [],
      optionalModules: [],
      settings: {},
      recommendedTier: 'basic',
    });
  };

  const toggleModule = (moduleId: string, list: 'modules' | 'optionalModules') => {
    if (!editing) return;
    const current = editing[list];
    const updated = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId];
    setEditing({ ...editing, [list]: updated });
  };

  if (editing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => setEditing(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>

        <DashboardSectionHeader
          title={editing.id ? t('admin.sectors') : t('admin.sectors')}
          subtitle={editing.sectorId || t('common.new')}
        />

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {/* Sector ID */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sector ID</label>
            <input
              type="text"
              value={editing.sectorId}
              onChange={e => setEditing({ ...editing, sectorId: e.target.value })}
              disabled={editing.id > 0}
              placeholder="e.g. manufacturing"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 disabled:opacity-50"
            />
          </div>

          {/* Names */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name (HU)</label>
              <input type="text" value={editing.nameHu} onChange={e => setEditing({ ...editing, nameHu: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name (EN)</label>
              <input type="text" value={editing.nameEn} onChange={e => setEditing({ ...editing, nameEn: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name (DE)</label>
              <input type="text" value={editing.nameDe} onChange={e => setEditing({ ...editing, nameDe: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
            </div>
          </div>

          {/* Icon & Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Icon</label>
              <select value={editing.icon} onChange={e => setEditing({ ...editing, icon: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100">
                {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Recommended Tier</label>
              <select value={editing.recommendedTier} onChange={e => setEditing({ ...editing, recommendedTier: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100">
                {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Core Modules</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULE_IDS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleModule(m, 'modules')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    editing.modules.includes(m) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Modules */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Optional Modules</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULE_IDS.filter(m => !editing.modules.includes(m)).map(m => (
                <button
                  key={m}
                  onClick={() => toggleModule(m, 'optionalModules')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    editing.optionalModules.includes(m) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-4">
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {t('common.save')}
            </button>
            {msg && <span className="text-sm text-gray-400">{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <DashboardSectionHeader
        title={t('admin.sectors')}
        subtitle={t('admin.sectors_desc')}
      />

      <div className="mb-4">
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> {t('common.new')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map(s => (
          <div
            key={s.id}
            onClick={() => setEditing(s)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{s.nameEn}</h3>
                <p className="text-gray-500 text-xs">{s.sectorId}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {s.modules.slice(0, 4).map(m => (
                <span key={m} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{m}</span>
              ))}
              {s.modules.length > 4 && (
                <span className="text-xs text-gray-500">+{s.modules.length - 4}</span>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              s.recommendedTier === 'professional' ? 'bg-blue-900/50 text-blue-300' :
              s.recommendedTier === 'enterprise' ? 'bg-purple-900/50 text-purple-300' :
              'bg-gray-800 text-gray-400'
            }`}>
              {s.recommendedTier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
