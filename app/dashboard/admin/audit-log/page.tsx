'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { AuditLogTable, type AuditLogEntry } from '@/components/admin/audit-log/AuditLogTable';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLogResponse {
  logs:     AuditLogEntry[];
  total:    number;
  page:     number;
  pageSize: number;
}

interface Filters {
  eventType: string;
  username:  string;
  success:   string;   // '' | 'true' | 'false'
  dateFrom:  string;
  dateTo:    string;
}

const INITIAL_FILTERS: Filters = {
  eventType: '',
  username:  '',
  success:   '',
  dateFrom:  '',
  dateTo:    '',
};

const EVENT_TYPE_OPTIONS = [
  { value: '',              label: 'Minden esemény' },
  { value: 'login_success', label: 'Belépés (sikeres)' },
  { value: 'login_failed',  label: 'Belépés (sikertelen)' },
  { value: 'logout',        label: 'Kilépés' },
  { value: 'user_created',  label: 'Felhasználó létrehozva' },
  { value: 'user_updated',  label: 'Felhasználó módosítva' },
  { value: 'user_deleted',  label: 'Felhasználó törölve' },
  { value: 'password_reset',label: 'Jelszó visszaállítás' },
  { value: 'settings_updated', label: 'Beállítás módosítva' },
];

const SUCCESS_OPTIONS = [
  { value: '',      label: 'Mindkettő' },
  { value: 'true',  label: 'Sikeres' },
  { value: 'false', label: 'Sikertelen' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(filters: Filters, page: number): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.username)  params.set('username',  filters.username);
  if (filters.success)   params.set('success',   filters.success);
  if (filters.dateFrom)  params.set('dateFrom',  filters.dateFrom);
  if (filters.dateTo)    params.set('dateTo',    filters.dateTo);
  return `/api/admin/audit-log?${params.toString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [filters, setFilters]   = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage]         = useState(1);
  const [data, setData]         = useState<AuditLogResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Pending filter state (applied on search button click)
  const [pending, setPending] = useState<Filters>(INITIAL_FILTERS);

  const fetchLogs = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(f, p));
      if (res.ok) {
        const json = await res.json() as AuditLogResponse;
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // keep last known state
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    void fetchLogs(filters, page);
    const interval = setInterval(() => void fetchLogs(filters, page), 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs, filters, page]);

  function applyFilters() {
    setFilters(pending);
    setPage(1);
  }

  function resetFilters() {
    setPending(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Audit Napló"
        subtitle="Bejelentkezések, admin műveletek és rendszeresemények"
      />

      {/* ── Filter bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Event type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Esemény típusa</label>
            <select
              value={pending.eventType}
              onChange={e => setPending(p => ({ ...p, eventType: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            >
              {EVENT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Felhasználónév</label>
            <input
              type="text"
              value={pending.username}
              onChange={e => setPending(p => ({ ...p, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Keresés…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Success */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Eredmény</label>
            <select
              value={pending.success}
              onChange={e => setPending(p => ({ ...p, success: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            >
              {SUCCESS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dátumtól</label>
            <input
              type="date"
              value={pending.dateFrom}
              onChange={e => setPending(p => ({ ...p, dateFrom: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date to */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dátumig</label>
            <input
              type="date"
              value={pending.dateTo}
              onChange={e => setPending(p => ({ ...p, dateTo: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-2" />

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              Szűrés
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors border border-gray-700"
            >
              Törlés
            </button>
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {data
            ? `${data.total} találat — ${page}. oldal / ${totalPages}`
            : 'Betöltés…'}
        </p>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-600">
              Frissítve: {lastRefresh.toLocaleTimeString('hu-HU')}
            </span>
          )}
          <button
            onClick={() => void fetchLogs(filters, page)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading && !data ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 animate-pulse h-64" />
      ) : (
        <AuditLogTable logs={data?.logs ?? []} />
      )}

      {/* ── Pagination ── */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Előző
          </button>

          <span className="px-4 py-2 text-sm text-gray-400">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Következő
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
