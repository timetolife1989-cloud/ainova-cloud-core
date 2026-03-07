'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';

interface SyncStatusSummary {
  health: 'ok' | 'warning' | 'error' | 'unknown';
  lastEventAt: string | null;
  lastError: string | null;
  errorCount24h: number;
  successCount24h: number;
  modules: Array<{
    moduleId: string;
    lastEventAt: string | null;
    lastStatus: string | null;
    lastMessage: string | null;
    errorCount24h: number;
  }>;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Soha';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Most';
  if (diffMins < 60) return `${diffMins} perce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} órája`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} napja`;
}

export function SyncStatusWidget() {
  const [status, setStatus] = useState<SyncStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sync-status');
      if (res.ok) {
        const data = await res.json() as SyncStatusSummary;
        setStatus(data);
        setLastChecked(new Date());
      }
    } catch {
      // Network error — keep showing last known state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-gray-600" />
        <div className="w-48 h-4 rounded bg-gray-600" />
      </div>
    );
  }

  const health = status?.health ?? 'unknown';

  const config = {
    ok: {
      bg: 'bg-emerald-950/60 border-emerald-700',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
      title: 'Adatfolyam rendben',
      titleClass: 'text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse',
    },
    warning: {
      bg: 'bg-yellow-950/60 border-yellow-700',
      icon: <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />,
      title: 'Figyelem — Nincs friss adat',
      titleClass: 'text-yellow-300',
      dot: 'bg-yellow-400 animate-pulse',
    },
    error: {
      bg: 'bg-red-950/60 border-red-700',
      icon: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
      title: `⚠ Adatszinkronizációs hiba — ${status?.errorCount24h ?? 0} hiba az elmúlt 24 órában`,
      titleClass: 'text-red-300 font-semibold',
      dot: 'bg-red-500 animate-ping',
    },
    unknown: {
      bg: 'bg-gray-800 border-gray-700',
      icon: <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />,
      title: 'Szinkronizáció állapota ismeretlen',
      titleClass: 'text-gray-300',
      dot: 'bg-gray-500',
    },
  }[health];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${config.bg} mb-6`}>
      {/* Pulsing dot */}
      <div className="flex items-center pt-0.5">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
      </div>

      {config.icon}

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.titleClass}`}>{config.title}</p>

        {health === 'error' && status?.lastError && (
          <p className="text-xs text-red-400/80 mt-1 truncate">{status.lastError}</p>
        )}

        <p className="text-xs text-gray-500 mt-1">
          Utolsó szinkron: {formatRelativeTime(status?.lastEventAt ?? null)}
          {lastChecked && (
            <span className="ml-2 text-gray-600">
              (ellenőrzés: {lastChecked.toLocaleTimeString('hu-HU')})
            </span>
          )}
        </p>
      </div>

      {/* Manual refresh */}
      <button
        onClick={() => { setLoading(true); void fetchStatus(); }}
        className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        title="Frissítés"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
