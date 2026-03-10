'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Globe, Check, RefreshCw } from 'lucide-react';

interface LocaleOption {
  code: string;
  name: string;
  flag: string;
}

const LOCALES: LocaleOption[] = [
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

const PREVIEW_KEYS = [
  'auth.login',
  'dashboard.title',
  'common.save',
  'common.cancel',
  'common.delete',
  'admin.users',
  'error.forbidden',
];

export default function LocalePage() {
  const [currentLocale, setCurrentLocale] = useState<string>('hu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});

  const fetchLocale = useCallback(async () => {
    try {
      const res = await fetch('/api/i18n');
      if (res.ok) {
        const json = await res.json() as { locale: string; translations: Record<string, string> };
        setCurrentLocale(json.locale);
        setPreview(json.translations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocale();
  }, [fetchLocale]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleLocaleChange = async (locale: string) => {
    if (locale === currentLocale || saving) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ key: 'app_locale', value: locale }),
      });

      if (res.ok) {
        setCurrentLocale(locale);
        // Refresh translations
        await fetchLocale();
        // Force page reload to apply new locale globally
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Nyelv & Formátumok" subtitle="Nyelv beállítások" />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="h-32 bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title="Nyelv & Formátumok" subtitle="Nyelv, dátum formátum beállítások" />

      {/* Locale selector */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Rendszer nyelve</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LOCALES.map(locale => (
            <button
              key={locale.code}
              onClick={() => handleLocaleChange(locale.code)}
              disabled={saving}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                currentLocale === locale.code
                  ? 'border-indigo-500 bg-indigo-950/30'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              } ${saving ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className="text-4xl mb-2">{locale.flag}</div>
              <div className="text-lg font-medium text-white">{locale.name}</div>
              <div className="text-xs text-gray-500 uppercase">{locale.code}</div>
              {currentLocale === locale.code && (
                <div className="absolute top-3 right-3">
                  <Check className="w-5 h-5 text-indigo-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview panel */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Előnézet</h3>
          <button
            onClick={fetchLocale}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300"
            title="Frissítés"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Kulcs</th>
                <th className="px-4 py-3 text-left">Fordítás</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {PREVIEW_KEYS.map(key => (
                <tr key={key} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{key}</td>
                  <td className="px-4 py-3 text-gray-100">{preview[key] ?? key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              A nyelv váltása az egész rendszerre vonatkozik. A változtatás után az oldal újratöltődik.
            </p>
            <p>
              Egyedi fordítások hozzáadásához használd a <code className="text-gray-300 bg-gray-800 px-1 rounded">core_translations</code> táblát.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
