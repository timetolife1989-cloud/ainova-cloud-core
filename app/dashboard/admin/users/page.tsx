'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { UserTable } from '@/components/admin/users/UserTable';
import { UserFilters, type UserFilterState } from '@/components/admin/users/UserFilters';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('common.error_loading'));
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
    if (!confirm(t('admin.users.confirm_reset_pw', { username }))) return;
    try {
      const res = await fetchWithCsrf(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      const json = await res.json() as { ok?: boolean; newPassword?: string; error?: string };
      if (json.ok && json.newPassword) {
        alert(t('admin.users.new_pw_message', { password: json.newPassword }));
      } else {
        alert(json.error ?? t('common.error_occurred'));
      }
    } catch {
      alert(t('admin.users.error_reset_pw'));
    }
  };

  const handleDeactivate = async (userId: number, username: string) => {
    if (!confirm(t('admin.users.confirm_deactivate', { username }))) return;
    try {
      const res = await fetchWithCsrf(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        void fetchUsers(filters, page);
      } else {
        alert(json.error ?? t('common.error_occurred'));
      }
    } catch {
      alert(t('admin.users.error_deactivate'));
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
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <UserFilters value={filters} onChange={handleFiltersChange} />
        <Link
          href="/dashboard/admin/users/new"
          className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>➕</span>
          {t('admin.users.new_user')}
        </Link>
      </div>

      {/* Summary */}
      {data && (
        <p className="text-xs text-gray-500 mb-3">
                    {t('admin.users.total_count', { count: String(data.total) })}
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
                            {t('common.retry')}
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
              {t('common.page_of', { current: String(page), total: String(totalPages) })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
              >
                                ← {t('common.prev')}
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-lg transition-colors"
              >
                {t('common.next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
