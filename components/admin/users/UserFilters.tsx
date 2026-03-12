'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FALLBACK_ROLES, ROLE_LABELS } from '@/lib/validators/user';

export interface UserFilterState {
  search: string;
  role: string;
  isActive: string; // '' | 'true' | 'false'
}

interface UserFiltersProps {
  value: UserFilterState;
  onChange: (filters: UserFilterState) => void;
}

export function UserFilters({ value, onChange }: UserFiltersProps) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(value.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external search changes (e.g. reset)
  useEffect(() => {
    setLocalSearch(value.search);
  }, [value.search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalSearch(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...value, search: next });
    }, 300);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, role: e.target.value });
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, isActive: e.target.value });
  };

  const hasFilters = value.search || value.role || value.isActive;

  const reset = () => {
    setLocalSearch('');
    onChange({ search: '', role: '', isActive: '' });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder={t('admin.search_placeholder')}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 pr-9 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 w-56"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
      </div>

      {/* Role filter */}
      <select
        value={value.role}
        onChange={handleRoleChange}
        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
      >
        <option value="">{t('admin.all_roles')}</option>
        {FALLBACK_ROLES.map((r: string) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      {/* Active filter */}
      <select
        value={value.isActive}
        onChange={handleActiveChange}
        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
      >
        <option value="">{t('admin.all_statuses')}</option>
        <option value="true">{t('admin.active')}</option>
        <option value="false">{t('admin.inactive')}</option>
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={reset}
          className="text-xs text-gray-500 hover:text-gray-200 transition-colors"
        >
          ✕ {t('admin.clear_filters')}
        </button>
      )}
    </div>
  );
}
