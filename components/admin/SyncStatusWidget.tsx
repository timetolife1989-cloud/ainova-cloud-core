'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
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

function formatRelativeTime(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return t('sync.never');
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('sync.now');
  if (diffMins < 60) return `${diffMins} ${t('sync.minutes_ago')}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ${t('sync.hours_ago')}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${t('sync.days_ago')}`;
}

export function SyncStatusWidget() {
  const { t } = useTranslation();
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
      title: t('sync.data_ok'),
      titleClass: 'text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse',
    },
    warning: {
      bg: 'bg-yellow-950/60 border-yellow-700',
      icon: <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />,
      title: t('sync.no_fresh_data'),
      titleClass: 'text-yellow-300',
      dot: 'bg-yellow-400 animate-pulse',
    },
    error: {
      bg: 'bg-red-950/60 border-red-700',
      icon: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
      title: `⚠ ${t('sync.sync_error')} — ${status?.errorCount24h ?? 0} ${t('sync.errors_24h')}`,
      titleClass: 'text-red-300 font-semibold',
      dot: 'bg-red-500 animate-ping',
    },
    unknown: {
      bg: 'bg-gray-800 border-gray-700',
      icon: <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />,
      title: t('sync.status_unknown'),
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
          {t('sync.last_sync')}: {formatRelativeTime(status?.lastEventAt ?? null, t)}
          {lastChecked && (
            <span className="ml-2 text-gray-600">
              ({t('sync.check')}: {lastChecked.toLocaleTimeString('hu-HU')})
            </span>
          )}
        </p>
      </div>

      {/* Manual refresh */}
      <button
        onClick={() => { setLoading(true); void fetchStatus(); }}
        className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        title={t('sync.refresh')}
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
