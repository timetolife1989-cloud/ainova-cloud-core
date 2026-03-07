'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS } from '@/lib/validators/user';
import type { UserRecord } from '@/lib/auth';

// -----------------------------------------------------------------------
// CSRF helper — reads the csrf-token cookie and adds the header
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
// Props
// -----------------------------------------------------------------------

interface UserFormProps {
  /** When provided, the form is in edit mode */
  user?: UserRecord;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const isEdit = !!user;

  const [username, setUsername] = useState(user?.username ?? '');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [role, setRole]         = useState(user?.role ?? 'user');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res: Response;

      if (isEdit) {
        res = await fetchWithCsrf(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            fullName: fullName || undefined,
            email:    email    || undefined,
            role,
            isActive,
          }),
        });
      } else {
        res = await fetchWithCsrf('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            username,
            fullName: fullName || undefined,
            email:    email    || undefined,
            role,
            password,
          }),
        });
      }

      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Ismeretlen hiba');
      }

      router.push('/dashboard/admin/users');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Username — only for create */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Felhasználónév <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
            placeholder="pl. jkovacs"
          />
        </div>
      )}

      {/* Full name */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Teljes név</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={200}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
          placeholder="pl. Kovács János"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
          placeholder="pl. kovacs@ceg.hu"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Szerepkör <span className="text-red-400">*</span>
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Password — only for create */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Jelszó <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={100}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
            placeholder="Min. 8 karakter"
          />
        </div>
      )}

      {/* isActive — only for edit */}
      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-600/50"
          />
          <label htmlFor="isActive" className="text-sm text-gray-300 cursor-pointer">
            Aktív fiók
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Mentés...' : isEdit ? 'Mentés' : 'Létrehozás'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors"
        >
          Mégse
        </button>
      </div>
    </form>
  );
}
