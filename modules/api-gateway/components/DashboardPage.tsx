'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Plus, Trash2, Copy, CheckCircle, X, Shield, Clock } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';

interface ApiKey {
  id: number;
  name: string;
  apiKeyMasked: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const AVAILABLE_PERMISSIONS = [
  'inventory.read', 'inventory.write',
  'tracking.read', 'tracking.write',
  'fleet.read', 'fleet.write',
  'workforce.read', 'workforce.write',
  'reports.read',
  '*',
];

export default function ApiGatewayDashboardPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // New key form
  const [kName, setKName] = useState('');
  const [kPermissions, setKPermissions] = useState<string[]>([]);
  const [kRateLimit, setKRateLimit] = useState('1000');
  const [kExpiresAt, setKExpiresAt] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  }), [csrfToken]);

  const loadKeys = useCallback(async () => {
    const res = await fetch('/api/modules/api-gateway/keys');
    if (res.ok) {
      const data = await res.json() as { keys: ApiKey[] };
      setKeys(data.keys ?? []);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async () => {
    const res = await fetch('/api/modules/api-gateway/keys', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: kName,
        permissions: kPermissions,
        rateLimit: parseInt(kRateLimit, 10) || 1000,
        expiresAt: kExpiresAt || null,
      }),
    });
    if (res.ok) {
      const data = await res.json() as { ok: boolean; apiKey: string };
      setNewKeyResult(data.apiKey);
      setKName('');
      setKPermissions([]);
      setKRateLimit('1000');
      setKExpiresAt('');
      await loadKeys();
    }
  };

  const toggleKey = async (key: ApiKey) => {
    await fetch('/api/modules/api-gateway/keys', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id: key.id, isActive: !key.isActive }),
    });
    await loadKeys();
  };

  const deleteKey = async (id: number) => {
    await fetch(`/api/modules/api-gateway/keys?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    await loadKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePerm = (perm: string) => {
    setKPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-6">
      <DashboardSectionHeader title={t('api_gateway.title')} subtitle={t('api_gateway.subtitle')} />

      {/* New key result banner */}
      {newKeyResult && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-300 text-sm font-medium">{t('api_gateway.key_created')}</p>
            <button onClick={() => setNewKeyResult(null)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 bg-black/30 rounded px-3 py-2">
            <code className="text-green-200 text-sm font-mono flex-1 select-all">{newKeyResult}</code>
            <button onClick={() => copyKey(newKeyResult)} className="text-green-300 hover:text-green-200">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-yellow-300/70 text-xs mt-2">{t('api_gateway.key_warning')}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{keys.length} {t('api_gateway.keys_count')}</p>
        <button onClick={() => { setShowNew(true); setNewKeyResult(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> {t('api_gateway.new_key')}
        </button>
      </div>

      {/* Keys table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-white/50 border-b border-white/10">
            <tr>
              <th className="py-2 px-3">{t('api_gateway.name')}</th>
              <th className="py-2 px-3">{t('api_gateway.key')}</th>
              <th className="py-2 px-3">{t('api_gateway.permissions')}</th>
              <th className="py-2 px-3">{t('api_gateway.rate_limit')}</th>
              <th className="py-2 px-3">{t('api_gateway.last_used')}</th>
              <th className="py-2 px-3">{t('api_gateway.status')}</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-white/5 text-white/70">
                <td className="py-2 px-3 font-medium">{k.name}</td>
                <td className="py-2 px-3 font-mono text-xs">{k.apiKeyMasked}</td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {k.permissions.map((p) => (
                      <span key={p} className="text-xs bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3 text-xs">{k.rateLimit}/h</td>
                <td className="py-2 px-3 text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</td>
                <td className="py-2 px-3">
                  <button onClick={() => toggleKey(k)}
                    className={`text-xs px-2 py-1 rounded ${k.isActive ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}
                  >
                    {k.isActive ? t('api_gateway.active') : t('api_gateway.disabled')}
                  </button>
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => deleteKey(k.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <div className="text-center text-white/30 py-8">
            <KeyRound className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('api_gateway.no_keys')}</p>
          </div>
        )}
      </div>

      {/* ──── New Key Modal ──── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{t('api_gateway.create_key')}</h3>
              <button onClick={() => setShowNew(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('api_gateway.key_name')}</label>
                <input value={kName} onChange={(e) => setKName(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm"
                  placeholder="Production API" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('api_gateway.select_permissions')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AVAILABLE_PERMISSIONS.map((p) => (
                    <button key={p} onClick={() => togglePerm(p)}
                      className={`text-xs px-2 py-1 rounded border transition ${
                        kPermissions.includes(p)
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/20 text-white/50 hover:text-white'
                      }`}
                    >
                      <Shield className="inline w-3 h-3 mr-1" /> {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">{t('api_gateway.rate_limit')}</label>
                  <input value={kRateLimit} onChange={(e) => setKRateLimit(e.target.value)} type="number"
                    className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">{t('api_gateway.expires')}</label>
                  <input value={kExpiresAt} onChange={(e) => setKExpiresAt(e.target.value)} type="date"
                    className="w-full bg-white/10 text-white border border-white/20 rounded px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">{t('common.cancel')}</button>
              <button onClick={createKey} disabled={!kName}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-30"
              >{t('api_gateway.generate')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
