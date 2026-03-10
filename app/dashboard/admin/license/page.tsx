'use client';

import { useState, useEffect } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Key, Shield, Users, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface LicenseData {
  tier: string;
  customerName: string | null;
  modulesAllowed: string[];
  featuresAllowed: string[];
  maxUsers: number;
  expiresAt: string | null;
  isExpired: boolean;
  isActive: boolean;
}

const TIER_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  basic:        { label: 'Basic',        color: 'bg-green-600',  border: 'border-green-600' },
  professional: { label: 'Professional', color: 'bg-blue-600',   border: 'border-blue-600' },
  enterprise:   { label: 'Enterprise',   color: 'bg-purple-600', border: 'border-purple-600' },
  dev:          { label: 'Development',  color: 'bg-gray-600',   border: 'border-gray-600' },
};

export default function LicensePage() {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/license')
      .then(res => {
        if (!res.ok) throw new Error('Hiba a licenc adatok betöltésekor');
        return res.json() as Promise<LicenseData>;
      })
      .then(setLicense)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Licenc" subtitle="Csomag szint és engedélyezett modulok" />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="h-32 bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Licenc" subtitle="Csomag szint és engedélyezett modulok" />
        <div className="mt-6 bg-red-900/30 border border-red-800 rounded-xl p-6 text-red-300">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          {error ?? 'Ismeretlen hiba'}
        </div>
      </div>
    );
  }

  const tierCfg = TIER_CONFIG[license.tier] ?? TIER_CONFIG.basic;
  const modulesDisplay = license.modulesAllowed.includes('*')
    ? ['Minden modul engedélyezve']
    : license.modulesAllowed;
  const featuresDisplay = license.featuresAllowed.includes('*')
    ? ['Minden feature engedélyezve']
    : license.featuresAllowed;

  const expiresFormatted = license.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Lifetime';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title="Licenc" subtitle="Csomag szint és engedélyezett modulok" />

      <div className="mt-6 space-y-6">
        {/* Tier + Status kártya */}
        <div className={`bg-gray-900 border ${tierCfg.border} rounded-xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`${tierCfg.color} p-3 rounded-lg`}>
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className={`${tierCfg.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                  {tierCfg.label}
                </span>
                <p className="text-gray-400 text-sm mt-1">
                  {license.customerName ?? 'Nincs megadva'}
                </p>
              </div>
            </div>
            <div className="text-right">
              {license.isActive && !license.isExpired ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Aktív</span>
                </div>
              ) : license.isExpired ? (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Lejárt</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Inaktív</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-medium">Max felhasználó</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {license.maxUsers <= 0 ? 'Korlátlan' : license.maxUsers}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-medium">Lejárat</h3>
            </div>
            <p className="text-2xl font-bold text-white">{expiresFormatted}</p>
          </div>
        </div>

        {/* Engedélyezett modulok */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Engedélyezett modulok</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {modulesDisplay.map((mod) => (
              <span key={mod} className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full border border-gray-700">
                {mod}
              </span>
            ))}
            {modulesDisplay.length === 0 && (
              <p className="text-gray-500 text-sm">Nincs engedélyezett modul</p>
            )}
          </div>
        </div>

        {/* Engedélyezett feature-ök */}
        {featuresDisplay.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-medium">Extra feature-ök</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {featuresDisplay.map((feat) => (
                <span key={feat} className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full border border-gray-700">
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
