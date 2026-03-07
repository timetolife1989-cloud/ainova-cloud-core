'use client';

import Link from 'next/link';
import { ROLE_COLORS, ROLE_LABELS, ROLES, type Role } from '@/lib/validators/user';
import type { UserRecord } from '@/lib/auth';

interface UserTableProps {
  users: UserRecord[];
  onResetPassword: (userId: number, username: string) => void;
  onDeactivate: (userId: number, username: string) => void;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function RoleBadge({ role }: { role: string }) {
  const colorClass = isRole(role) ? ROLE_COLORS[role] : 'bg-gray-700 text-gray-300';
  const label = isRole(role) ? ROLE_LABELS[role] : role;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

export function UserTable({ users, onResetPassword, onDeactivate }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">📭 Nincs találat</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Felhasználónév</th>
            <th className="px-4 py-3 font-medium">Teljes név</th>
            <th className="px-4 py-3 font-medium">Szerepkör</th>
            <th className="px-4 py-3 font-medium">Státusz</th>
            <th className="px-4 py-3 font-medium text-right">Műveletek</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {users.map((user) => (
            <tr
              key={user.id}
              className={`hover:bg-gray-800/40 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}
            >
              <td className="px-4 py-3 font-semibold text-gray-100 font-mono">
                {user.username}
              </td>
              <td className="px-4 py-3 text-gray-300">
                {user.fullName ?? <span className="text-gray-600 italic">—</span>}
              </td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3">
                {user.isActive ? (
                  <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Aktív
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Inaktív
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/admin/users/${user.id}/edit`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/30 transition-colors"
                    title="Szerkesztés"
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={() => onResetPassword(user.id, user.username)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/30 transition-colors"
                    title="Jelszó visszaállítása"
                  >
                    🔑
                  </button>
                  <button
                    onClick={() => onDeactivate(user.id, user.username)}
                    disabled={!user.isActive}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Deaktiválás"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
