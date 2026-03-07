'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface BrandingFormProps {
  initialSettings: Record<string, string>;
}

type ToastState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function BrandingForm({ initialSettings }: BrandingFormProps) {
  const [appName, setAppName]             = useState(initialSettings['app_name']            ?? '');
  const [primaryColor, setPrimaryColor]   = useState(initialSettings['app_primary_color']   ?? '#6366f1');
  const [secondaryColor, setSecondaryColor] = useState(initialSettings['app_secondary_color'] ?? '#8b5cf6');
  const [logoPath, setLogoPath]           = useState(initialSettings['app_logo_path']        ?? '');

  const [settingsToast, setSettingsToast] = useState<ToastState>({ type: 'idle' });
  const [logoToast, setLogoToast]         = useState<ToastState>({ type: 'idle' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (setter: (t: ToastState) => void, toast: ToastState) => {
      setter(toast);
      if (toast.type === 'success' || toast.type === 'error') {
        setTimeout(() => setter({ type: 'idle' }), 4000);
      }
    },
    []
  );

  // ── Save branding settings ────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    showToast(setSettingsToast, { type: 'loading' });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          updates: [
            { key: 'app_name',            value: appName },
            { key: 'app_primary_color',   value: primaryColor },
            { key: 'app_secondary_color', value: secondaryColor },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        showToast(setSettingsToast, { type: 'error', message: data.error ?? 'Mentés sikertelen' });
        return;
      }

      showToast(setSettingsToast, { type: 'success', message: 'Beállítások mentve' });
    } catch {
      showToast(setSettingsToast, { type: 'error', message: 'Hálózati hiba' });
    }
  };

  // ── Upload logo ───────────────────────────────────────────────────────────

  const handleLogoUpload = async (file: File) => {
    showToast(setLogoToast, { type: 'loading' });

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
        credentials: 'include',
        body: formData,
      });

      const data = await res.json() as { ok?: boolean; path?: string; error?: string };

      if (!res.ok || !data.ok) {
        showToast(setLogoToast, { type: 'error', message: data.error ?? 'Feltöltés sikertelen' });
        return;
      }

      setLogoPath(data.path ?? '');
      showToast(setLogoToast, { type: 'success', message: 'Logó feltöltve' });
    } catch {
      showToast(setLogoToast, { type: 'error', message: 'Hálózati hiba' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleLogoUpload(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // ── Toast renderer ────────────────────────────────────────────────────────

  const Toast = ({ state }: { state: ToastState }) => {
    if (state.type === 'idle') return null;
    if (state.type === 'loading') {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Mentés…
        </span>
      );
    }
    if (state.type === 'success') {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4" />
          {state.message}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
        <XCircle className="w-4 h-4" />
        {state.message}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Branding fields ── */}
      <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Alkalmazás neve
        </h3>

        {/* App name */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="app-name">
            Alkalmazás neve
          </label>
          <input
            id="app-name"
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Ainova Cloud Core"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Primary color */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Elsődleges szín
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-gray-700 bg-gray-800 p-0.5"
              title="Elsődleges szín"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#6366f1"
              maxLength={7}
              className="w-28 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div
              className="h-9 w-9 rounded-md border border-gray-700 flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
              title="Előnézet"
            />
          </div>
        </div>

        {/* Secondary color */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Másodlagos szín
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-gray-700 bg-gray-800 p-0.5"
              title="Másodlagos szín"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#8b5cf6"
              maxLength={7}
              className="w-28 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div
              className="h-9 w-9 rounded-md border border-gray-700 flex-shrink-0"
              style={{ backgroundColor: secondaryColor }}
              title="Előnézet"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => void handleSaveSettings()}
            disabled={settingsToast.type === 'loading'}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            Mentés
          </button>
          <Toast state={settingsToast} />
        </div>
      </section>

      {/* ── Logo upload ── */}
      <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Logó
        </h3>

        {/* Current logo preview */}
        {logoPath ? (
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-40 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
              <Image
                src={logoPath}
                alt="Jelenlegi logó"
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
            <p className="text-xs text-gray-500 font-mono">{logoPath}</p>
          </div>
        ) : (
          <div className="h-16 w-40 rounded-lg bg-gray-800 border border-dashed border-gray-700 flex items-center justify-center">
            <p className="text-xs text-gray-600">Nincs logó</p>
          </div>
        )}

        {/* Upload control */}
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Logó feltöltése"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={logoToast.type === 'loading'}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Logó feltöltése
          </button>
          <Toast state={logoToast} />
        </div>

        <p className="text-xs text-gray-600">
          JPG, PNG, SVG vagy WebP — max. 2 MB. A fájl neve <code className="text-gray-500">logo.&#123;ext&#125;</code> lesz.
        </p>
      </section>
    </div>
  );
}
