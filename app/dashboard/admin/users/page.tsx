'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { UserTable } from '@/components/admin/users/UserTable';
import { UserFilters, type UserFilterState } from '@/components/admin/users/UserFilters';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import type { UserRecord } from '@/lib/auth';

// -----------------------------------------------------------------------
// CSRF helper
// -----------------------------------------------------------------------
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function fetchWithCsrf(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

interface ListResult {
  users: UserRecord[];
  total: number;
}

export default function UsersPage() {
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: '',
    isActive: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const pageSize = 20;

  const fetchUsers = useCallback(async (f: UserFilterState, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (f.search)   params.set('search',   f.search);
      if (f.role)     params.set('role',     f.role);
      if (f.isActive) params.set('isActive', f.isActive);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ListResult;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba a betöltéskor');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Load on first render
  if (!initialized && !loading) {
    void fetchUsers(filters, page);
  }

  const handleFiltersChange = (next: UserFilterState) => {
    setFilters(next);
    setPage(1);
    void fetchUsers(next, 1);
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!confirm(`Visszaállítod a(z) "${username}" jelszavát?`)) return;
    try {
      const res = await fetchWithCsrf(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      const json = await res.json() as { ok?: boolean; newPassword?: string; error?: string };
      if (json.ok && json.newPassword) {
        alert(`Új jelszó: ${json.newPassword}\n\nKözöld a felhasználóval!`);
      } else {
        alert(json.error ?? 'Hiba történt');
      }
    } catch {
      alert('Hiba a jelszó visszaállításakor');
    }
  };

  const handleDeactivate = async (userId: number, username: string) => {
    if (!confirm(`Biztosan deaktiválod a(z) "${username}" felhasználót?`)) return;
    try {
      const res = await fetchWithCsrf(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        void fetchUsers(filters, page);
      } else {
        alert(json.error ?? 'Hiba történt');
      }
    } catch {
      alert('Hiba a deaktiválásnál');
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const goToPage = (p: number) => {
    setPage(p);
    void fetchUsers(filters, p);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Felhasználók"
        subtitle="Fiókok kezelése, szerepkörök, jelszó visszaállítás"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <UserFilters value={filters} onChange={handleFiltersChange} />
        <Link
          href="/dashboard/admin/users/new"
          className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>➕</span>
          Új felhasználó
        </Link>
      </div>

      {/* Summary */}
      {data && (
        <p className="text-xs text-gray-500 mb-3">
          Összesen: <span className="text-gray-300 font-medium">{data.total}</span> felhasználó
        </p>
      )}

      {/* Table card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">
            <p className="mb-2">❌ {error}</p>
            <button
              onClick={() => void fetchUsers(filters, page)}
              className="text-indigo-400 hover:underline text-sm"
            >
              Újrapróbálás
            </button>
          </div>
        ) : (
          <UserTable
            users={data?.users ?? []}
            onResetPassword={handleResetPassword}
            onDeactivate={handleDeactivate}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/60">
            <span className="text-xs text-gray-500">
              Oldal {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
              >
                ← Előző
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
              >
                Következő →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
