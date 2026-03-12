'use client';

import { useState, useEffect, useCallback } from 'react';

type Tab = 'connections' | 'catalog' | 'mappings' | 'log';
type ConnectionType = 'rfc' | 'odata' | 'file';

interface SapConnection {
  id: number;
  name: string;
  description: string;
  connectionType: ConnectionType;
  host: string;
  sysnr: string;
  client: string;
  sapUser: string;
  passwordRef: string;
  language: string;
  baseUrl: string;
  apiPath: string;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean;
  lastError: string | null;
  createdAt: string;
}

interface SapObject {
  id: number;
  category: string;
  objectType: string;
  sapName: string;
  descriptionHu: string;
  descriptionEn: string;
  keyFields: string[];
  aciModule: string;
}

interface SapMapping {
  id: number;
  connectionName: string;
  mappingName: string;
  sapObject: string;
  sapField: string;
  aciTable: string;
  aciField: string;
  transformType: string;
  isActive: boolean;
}

interface SyncLog {
  id: number;
  connectionName: string;
  syncType: string;
  sapObject: string;
  aciTable: string;
  status: string;
  recordsRead: number;
  recordsWritten: number;
  recordsError: number;
  errorDetails: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  triggeredBy: string;
}

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  rfc: 'RFC (SAP GUI)',
  odata: 'OData / REST',
  file: 'Fájl import',
};

const CATEGORY_LABELS: Record<string, string> = {
  MM: 'MM — Anyaggazdálkodás',
  SD: 'SD — Értékesítés',
  PP: 'PP — Gyártástervezés',
  PM: 'PM — Karbantartás',
  HR: 'HR — Emberi Erőforrások',
  QM: 'QM — Minőség',
  FI: 'FI — Pénzügy',
  CO: 'CO — Kontrolling',
  BASIS: 'BASIS — Technikai',
};

const STATUS_COLORS: Record<string, string> = {
  running: 'text-blue-400 bg-blue-900/30',
  success: 'text-green-400 bg-green-900/30',
  partial: 'text-yellow-400 bg-yellow-900/30',
  error: 'text-red-400 bg-red-900/30',
};

export default function SapImportDashboardPage() {
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<SapConnection[]>([]);
  const [objects, setObjects] = useState<SapObject[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [mappings, setMappings] = useState<SapMapping[]>([]);
  const [syncLog, setSyncLog] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filterek
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Új kapcsolat form
  const [showConnForm, setShowConnForm] = useState(false);
  const [connForm, setConnForm] = useState({
    name: '', description: '', connectionType: 'rfc' as ConnectionType,
    host: '', sysnr: '00', client: '100', sapUser: '', passwordRef: '', language: 'HU',
    baseUrl: '', apiPath: '',
  });
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<number | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/modules/sap-import/connections');
      if (res.ok) setConnections((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catalogCategory) params.set('category', catalogCategory);
      if (catalogSearch) params.set('search', catalogSearch);
      const res = await fetch(`/api/modules/sap-import/objects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setObjects(data.items ?? []);
        setCategoryCounts(data.categoryCounts ?? {});
      }
    } finally { setLoading(false); }
  }, [catalogCategory, catalogSearch]);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/modules/sap-import/mappings');
      if (res.ok) setMappings((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/modules/sap-import/sync?limit=50');
      if (res.ok) setSyncLog((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'connections') fetchConnections();
    else if (tab === 'catalog') fetchObjects();
    else if (tab === 'mappings') fetchMappings();
    else if (tab === 'log') fetchLog();
  }, [tab, fetchConnections, fetchObjects, fetchMappings, fetchLog]);

  useEffect(() => {
    if (tab === 'catalog') fetchObjects();
  }, [catalogCategory, catalogSearch, tab, fetchObjects]);

  const handleSaveConnection = async () => {
    setError('');
    try {
      const csrfRes = await fetch('/api/csrf');
      const { token } = await csrfRes.json();
      const res = await fetch('/api/modules/sap-import/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(connForm),
      });
      if (res.ok) {
        setShowConnForm(false);
        fetchConnections();
      } else {
        const err = await res.json();
        setError(err.error ?? 'Hiba a mentés során');
      }
    } catch { setError('Hálózati hiba'); }
  };

  const handleDeleteConnection = async (id: number) => {
    if (!confirm('Biztosan törli ezt a kapcsolatot? A hozzá tartozó mappingek is törlődnek.')) return;
    const csrfRes = await fetch('/api/csrf');
    const { token } = await csrfRes.json();
    await fetch(`/api/modules/sap-import/connections?id=${id}`, {
      method: 'DELETE', headers: { 'X-CSRF-Token': token },
    });
    fetchConnections();
  };

  const handleTestConnection = async (id: number) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/modules/sap-import/connections?action=test&id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
    } finally { setTesting(null); }
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'connections', label: 'Kapcsolatok', icon: '🔗' },
    { id: 'catalog', label: 'SAP Katalógus', icon: '📚' },
    { id: 'mappings', label: 'Mező Mappingek', icon: '↔️' },
    { id: 'log', label: 'Szinkron Napló', icon: '📋' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Fejléc */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🔗</span>
          <h1 className="text-2xl font-bold text-white">SAP Integráció</h1>
          <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-xs font-medium rounded-full border border-blue-800">
            ENTERPRISE
          </span>
          <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs font-medium rounded-full border border-yellow-800">
            ELŐKÉSZÍTVE
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          SAP ECC / S/4HANA adatcsere — RFC, OData és fájl alapú szinkronizálás. RFC aktiváláshoz node-rfc csomag szükséges.
        </p>
      </div>

      {/* Info sáv */}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 mb-6 flex gap-3">
        <span className="text-blue-400 text-xl mt-0.5">ℹ️</span>
        <div className="text-sm text-blue-300">
          <strong>Hogyan aktiválható az SAP kapcsolat?</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1 text-blue-400">
            <li>RFC: <code className="bg-blue-900/40 px-1 rounded">npm install node-rfc</code> + SAP NetWeaver RFC SDK (letöltés: support.sap.com)</li>
            <li>OData: SAP BTP API Hub URL és OAuth token megadása a kapcsolat konfigurációban</li>
            <li>Mező mappingek definiálása (SAP mező → ACI tábla/mező)</li>
            <li>Szinkronizálás ütemezése vagy manuális indítása</li>
          </ol>
        </div>
      </div>

      {/* Fül navigáció */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ═══════════ KAPCSOLATOK FÜL ═══════════ */}
      {tab === 'connections' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">SAP rendszer kapcsolatok konfigurálása</p>
            <button
              onClick={() => setShowConnForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Új SAP kapcsolat
            </button>
          </div>

          {/* Új kapcsolat form */}
          {showConnForm && (
            <div className="bg-gray-900 border border-blue-800/40 rounded-xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-4">Új SAP Kapcsolat</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Kapcsolat neve *</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="pl. SAP ECC Produkció"
                    value={connForm.name}
                    onChange={e => setConnForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Kapcsolat típusa</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    value={connForm.connectionType}
                    onChange={e => setConnForm(f => ({ ...f, connectionType: e.target.value as ConnectionType }))}
                  >
                    <option value="rfc">RFC (SAP GUI logon)</option>
                    <option value="odata">OData / REST API (S/4HANA Cloud)</option>
                    <option value="file">Fájl import (Excel/CSV)</option>
                  </select>
                </div>
                {connForm.connectionType === 'rfc' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">SAP host / IP cím</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="192.168.1.100" value={connForm.host} onChange={e => setConnForm(f => ({ ...f, host: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Sysnr</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="00" value={connForm.sysnr} onChange={e => setConnForm(f => ({ ...f, sysnr: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Mandant</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="100" value={connForm.client} onChange={e => setConnForm(f => ({ ...f, client: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">SAP felhasználónév</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="RFC_USER" value={connForm.sapUser} onChange={e => setConnForm(f => ({ ...f, sapUser: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Jelszó env kulcs (nem a jelszó!)</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="SAP_PROD_PASSWORD" value={connForm.passwordRef} onChange={e => setConnForm(f => ({ ...f, passwordRef: e.target.value }))} />
                      <p className="text-gray-600 text-xs mt-1">Pl. ha a jelszó a SAP_PROD_PASSWORD env változóban van, azt add meg itt — NEM a jelszót!</p>
                    </div>
                  </>
                )}
                {connForm.connectionType === 'odata' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="text-gray-400 text-xs mb-1 block">Base URL</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="https://myXXXXXX.s4hana.ondemand.com" value={connForm.baseUrl} onChange={e => setConnForm(f => ({ ...f, baseUrl: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-gray-400 text-xs mb-1 block">API elérési út</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="/sap/opu/odata/sap/API_MATERIAL_SRV" value={connForm.apiPath} onChange={e => setConnForm(f => ({ ...f, apiPath: e.target.value }))} />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nyelv</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={connForm.language} onChange={e => setConnForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="HU">Magyar (HU)</option>
                    <option value="DE">Német (DE)</option>
                    <option value="EN">Angol (EN)</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Megjegyzés</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Opcionális leírás" value={connForm.description} onChange={e => setConnForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveConnection} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">
                  Mentés
                </button>
                <button onClick={() => setShowConnForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  Mégse
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">🔗</p>
              <p className="font-medium">Még nincs SAP kapcsolat konfigurálva</p>
              <p className="text-sm mt-1">Kattints az &quot;Új SAP kapcsolat&quot; gombra a konfiguráláshoz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connections.map(conn => {
                const testResult = testResults[conn.id];
                return (
                  <div key={conn.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{conn.name}</h3>
                        <p className="text-gray-500 text-xs">{CONNECTION_TYPE_LABELS[conn.connectionType]}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${conn.isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        {conn.isActive ? 'Aktív' : 'Inaktív'}
                      </span>
                    </div>

                    {conn.connectionType === 'rfc' && (
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div><span className="text-gray-500">Host:</span> <span className="text-gray-300">{conn.host || '—'}</span></div>
                        <div><span className="text-gray-500">SysNr:</span> <span className="text-gray-300">{conn.sysnr}</span></div>
                        <div><span className="text-gray-500">Mandant:</span> <span className="text-gray-300">{conn.client}</span></div>
                        <div><span className="text-gray-500">User:</span> <span className="text-gray-300">{conn.sapUser || '—'}</span></div>
                        <div><span className="text-gray-500">Lang:</span> <span className="text-gray-300">{conn.language}</span></div>
                        <div><span className="text-gray-500">Pwd ref:</span> <span className="text-gray-300">{conn.passwordRef || '—'}</span></div>
                      </div>
                    )}
                    {conn.connectionType === 'odata' && (
                      <div className="text-xs mb-3 space-y-1">
                        <div><span className="text-gray-500">URL:</span> <span className="text-gray-300 break-all">{conn.baseUrl || '—'}</span></div>
                        <div><span className="text-gray-500">API:</span> <span className="text-gray-300">{conn.apiPath || '—'}</span></div>
                      </div>
                    )}

                    {/* Teszt eredmény */}
                    {testResult && (
                      <div className={`text-xs p-2 rounded mb-3 ${testResult.ok ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {testResult.ok ? '✅' : '❌'} {testResult.message}
                      </div>
                    )}

                    {/* Utolsó teszt */}
                    {conn.lastTestedAt && (
                      <p className="text-gray-600 text-xs mb-2">
                        Utolsó teszt: {new Date(conn.lastTestedAt).toLocaleString('hu-HU')} — {conn.lastTestOk ? '✅ OK' : '❌ Hiba'}
                      </p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleTestConnection(conn.id)}
                        disabled={testing === conn.id}
                        className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/40 text-blue-400 rounded text-xs font-medium disabled:opacity-50"
                      >
                        {testing === conn.id ? 'Tesztelés...' : '🔌 Kapcsolat teszt'}
                      </button>
                      <button
                        onClick={() => handleDeleteConnection(conn.id)}
                        className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded text-xs font-medium"
                      >
                        Törlés
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ KATALÓGUS FÜL ═══════════ */}
      {tab === 'catalog' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
              value={catalogCategory}
              onChange={e => setCatalogCategory(e.target.value)}
            >
              <option value="">Minden kategória</option>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label} ({categoryCounts[val] ?? 0})</option>
              ))}
            </select>
            <input
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Keresés: MARA, megrendelés, BAPI..."
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {objects.map(obj => (
                <div key={obj.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                      obj.objectType === 'BAPI' ? 'bg-purple-900/40 text-purple-300' :
                      obj.objectType === 'FUNCTION' ? 'bg-orange-900/40 text-orange-300' :
                      'bg-blue-900/40 text-blue-300'
                    }`}>
                      {obj.objectType}
                    </span>
                    <span className="text-white font-mono font-semibold text-sm">{obj.sapName}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm">{obj.descriptionHu}</p>
                    {obj.keyFields.length > 0 && (
                      <p className="text-gray-600 text-xs mt-0.5">
                        Kulcsmezők: <span className="font-mono text-gray-500">{obj.keyFields.join(', ')}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center text-xs">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded font-medium">{obj.category}</span>
                    {obj.aciModule && (
                      <span className="px-2 py-0.5 bg-green-900/20 text-green-600 rounded">→ {obj.aciModule}</span>
                    )}
                  </div>
                </div>
              ))}
              {objects.length === 0 && (
                <div className="text-center py-10 text-gray-500">Nincs találat</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MAPPINGEK FÜL ═══════════ */}
      {tab === 'mappings' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">SAP mező → ACI mező konverziós szabályok</p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />)}
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">↔️</p>
              <p>Még nincs mező mapping konfigurálva</p>
              <p className="text-sm mt-1 text-gray-600">
                A mappingek definiálják, hogy egy SAP tábla melyik mezője melyik ACI táblához/mezőhöz kerül.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left pb-2 pr-4">Kapcsolat</th>
                    <th className="text-left pb-2 pr-4">SAP objektum</th>
                    <th className="text-left pb-2 pr-4">SAP mező</th>
                    <th className="text-left pb-2 pr-4">ACI tábla</th>
                    <th className="text-left pb-2 pr-4">ACI mező</th>
                    <th className="text-left pb-2 pr-4">Transzform</th>
                    <th className="text-left pb-2">Aktív</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={m.id} className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors">
                      <td className="py-2 pr-4 text-gray-400">{m.connectionName}</td>
                      <td className="py-2 pr-4"><span className="font-mono text-blue-300">{m.sapObject}</span></td>
                      <td className="py-2 pr-4"><span className="font-mono text-gray-300">{m.sapField}</span></td>
                      <td className="py-2 pr-4 text-gray-400">{m.aciTable}</td>
                      <td className="py-2 pr-4"><span className="font-mono text-gray-300">{m.aciField}</span></td>
                      <td className="py-2 pr-4 text-gray-500">{m.transformType}</td>
                      <td className="py-2">
                        <span className={`text-xs ${m.isActive ? 'text-green-400' : 'text-gray-600'}`}>
                          {m.isActive ? '✓' : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ NAPLÓ FÜL ═══════════ */}
      {tab === 'log' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">Utolsó 50 szinkronizálási esemény</p>
            <button onClick={fetchLog} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-xs">
              ↻ Frissít
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-800 rounded animate-pulse" />)}
            </div>
          ) : syncLog.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📋</p>
              <p>Még nem volt szinkronizálás</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncLog.map(log => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[log.status] ?? 'text-gray-400 bg-gray-800'}`}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-white font-mono text-sm">{log.sapObject}</span>
                      <span className="text-gray-500 text-xs">→ {log.aciTable}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{log.connectionName}</span>
                      <span>{log.syncType}</span>
                      <span>{new Date(log.startedAt).toLocaleString('hu-HU')}</span>
                      {log.durationMs > 0 && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="text-gray-500">Olvasott: <span className="text-gray-300">{log.recordsRead}</span></span>
                    <span className="text-gray-500">Írott: <span className="text-green-400">{log.recordsWritten}</span></span>
                    <span className="text-gray-500">Hiba: <span className={log.recordsError > 0 ? 'text-red-400' : 'text-gray-500'}>{log.recordsError}</span></span>
                    <span className="text-gray-500">Indító: <span className="text-gray-400">{log.triggeredBy}</span></span>
                  </div>
                  {log.errorDetails && (
                    <div className="mt-2 text-xs text-yellow-500 bg-yellow-900/20 rounded p-2">{log.errorDetails}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
