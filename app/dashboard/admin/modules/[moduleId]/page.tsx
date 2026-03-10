'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface AdminSettingDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'unit_select' | 'color';
  default: string;
  options?: { value: string; label: string }[];
  description?: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  adminSettings?: AdminSettingDef[];
}

export default function ModuleSettingsPage() {
  const params = useParams();
  const moduleId = params.moduleId as string;

  const [module, setModule] = useState<ModuleInfo | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<{ unitCode: string; unitLabel: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch module info
      const modRes = await fetch('/api/admin/modules');
      if (modRes.ok) {
        const modData = await modRes.json() as { modules: ModuleInfo[] };
        const mod = modData.modules.find(m => m.id === moduleId);
        setModule(mod ?? null);
      }

      // Fetch current settings
      const settingsRes = await fetch(`/api/admin/module-settings?moduleId=${moduleId}`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json() as { settings: Record<string, string> };
        setSettings(settingsData.settings);
      }

      // Fetch units for unit_select
      const unitsRes = await fetch('/api/admin/units');
      if (unitsRes.ok) {
        const unitsData = await unitsRes.json() as { units: { unitCode: string; unitLabel: string }[] };
        setUnits(unitsData.units);
      }
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    if (!module?.adminSettings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      for (const setting of module.adminSettings) {
        const value = settings[setting.key] ?? setting.default;
        await fetch('/api/admin/module-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            moduleId,
            key: setting.key,
            value,
          }),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Modul nem található: {moduleId}</p>
          <Link href="/dashboard/admin/modules" className="text-indigo-400 hover:underline mt-4 inline-block">
            Vissza a modulokhoz
          </Link>
        </div>
      </div>
    );
  }

  if (!module.adminSettings || module.adminSettings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={module.name} subtitle="Modul beállítások" />
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Ennek a modulnak nincsenek konfigurálható beállításai.</p>
          <Link href="/dashboard/admin/modules" className="text-indigo-400 hover:underline mt-4 inline-block">
            Vissza a modulokhoz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/admin/modules" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <DashboardSectionHeader title={module.name} subtitle="Modul beállítások" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="space-y-6">
          {module.adminSettings.map(setting => (
            <div key={setting.key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {setting.label}
              </label>
              {setting.description && (
                <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
              )}

              {setting.type === 'string' && (
                <input
                  type="text"
                  value={settings[setting.key] ?? setting.default}
                  onChange={e => updateSetting(setting.key, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              )}

              {setting.type === 'number' && (
                <input
                  type="number"
                  value={settings[setting.key] ?? setting.default}
                  onChange={e => updateSetting(setting.key, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              )}

              {setting.type === 'boolean' && (
                <button
                  onClick={() => updateSetting(setting.key, (settings[setting.key] ?? setting.default) === 'true' ? 'false' : 'true')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    (settings[setting.key] ?? setting.default) === 'true' ? 'bg-indigo-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      (settings[setting.key] ?? setting.default) === 'true' ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              )}

              {setting.type === 'select' && setting.options && (
                <select
                  value={settings[setting.key] ?? setting.default}
                  onChange={e => updateSetting(setting.key, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  {setting.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}

              {setting.type === 'unit_select' && (
                <select
                  value={settings[setting.key] ?? setting.default}
                  onChange={e => updateSetting(setting.key, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  {units.map(unit => (
                    <option key={unit.unitCode} value={unit.unitCode}>{unit.unitLabel}</option>
                  ))}
                </select>
              )}

              {setting.type === 'color' && (
                <input
                  type="color"
                  value={settings[setting.key] ?? setting.default}
                  onChange={e => updateSetting(setting.key, e.target.value)}
                  className="w-16 h-10 bg-gray-950 border border-gray-700 rounded-lg cursor-pointer"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm">
            Beállítások mentve!
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Mentés...' : 'Mentés'}
          </button>
        </div>
      </div>
    </div>
  );
}
