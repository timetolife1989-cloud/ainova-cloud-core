'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Users,
  Clock,
  Settings,
  Layers,
  Server,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagnosticsData {
  db: {
    status:     'connected' | 'error';
    responseMs: number | null;
  };
  users: {
    total:  number;
    active: number;
  };
  sessions: {
    active: number;
  };
  settings: {
    count: number;
  };
  modules: {
    active: string[];
    count:  number;
  };
  node: {
    version:         string;
    uptime:          number;
    uptimeFormatted: string;
  };
  timestamp: string;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:     React.ReactNode;
  label:    string;
  children: React.ReactNode;
}

function StatCard({ icon, label, children }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="p-2 rounded-lg bg-gray-800 flex-shrink-0 text-indigo-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <div className="text-sm text-gray-200">{children}</div>
      </div>
    </div>
  );
}

// ── DB status badge ───────────────────────────────────────────────────────────

function DbStatusBadge({ status, responseMs }: { status: 'connected' | 'error'; responseMs: number | null }) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
        <CheckCircle className="w-4 h-4" />
        Kapcsolódva{responseMs !== null ? ` (${responseMs} ms)` : ''}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-red-400 font-medium">
      <XCircle className="w-4 h-4" />
      Hiba
    </span>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-24 rounded bg-gray-800" />
        <div className="h-4 w-36 rounded bg-gray-700" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiagnosticsPanel() {
  const [data, setData]       = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/diagnostics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as DiagnosticsData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header row: last checked + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          {data
            ? <>Utolsó ellenőrzés: {new Date(data.timestamp).toLocaleTimeString('hu-HU')}</>
            : loading ? 'Betöltés…' : 'Nincs adat'}
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/60 border border-red-700 text-red-300 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          Nem sikerült betölteni a diagnosztikai adatokat: {error}
        </div>
      )}

      {/* Stats grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* DB Connection */}
          <StatCard icon={<Database className="w-5 h-5" />} label="Adatbázis kapcsolat">
            <DbStatusBadge status={data.db.status} responseMs={data.db.responseMs} />
          </StatCard>

          {/* Users */}
          <StatCard icon={<Users className="w-5 h-5" />} label="Felhasználók">
            <span className="font-semibold text-indigo-300">{data.users.active}</span>
            <span className="text-gray-400"> aktív / </span>
            <span>{data.users.total}</span>
            <span className="text-gray-400"> összes</span>
          </StatCard>

          {/* Active sessions */}
          <StatCard icon={<Clock className="w-5 h-5" />} label="Aktív munkamenetek">
            <span className="font-semibold">{data.sessions.active}</span>
            <span className="text-gray-400 ml-1">munkamenet</span>
          </StatCard>

          {/* Settings */}
          <StatCard icon={<Settings className="w-5 h-5" />} label="Beállítások">
            <span className="font-semibold">{data.settings.count}</span>
            <span className="text-gray-400 ml-1">bejegyzés</span>
          </StatCard>

          {/* Active modules */}
          <StatCard icon={<Layers className="w-5 h-5" />} label="Aktív modulok">
            {data.modules.count === 0 ? (
              <span className="text-gray-500">Nincs aktív modul</span>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {data.modules.active.map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/60 text-indigo-300 border border-indigo-700"
                  >
                    {id}
                  </span>
                ))}
              </div>
            )}
          </StatCard>

          {/* Node.js */}
          <StatCard icon={<Server className="w-5 h-5" />} label="Node.js">
            <div className="space-y-0.5">
              <div>
                <span className="text-gray-400">Verzió: </span>
                <span className="font-mono">{data.node.version}</span>
              </div>
              <div>
                <span className="text-gray-400">Uptime: </span>
                <span>{data.node.uptimeFormatted}</span>
              </div>
            </div>
          </StatCard>
        </div>
      ) : null}
    </div>
  );
}
