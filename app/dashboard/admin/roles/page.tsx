'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Shield, Lock, Plus, Save, Trash2, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface RoleInfo {
  id: number;
  roleCode: string;
  roleLabel: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  isBuiltin: boolean;
  isActive: boolean;
  permissions: string[];
}

interface PermissionInfo {
  id: number;
  permissionCode: string;
  description: string | null;
  moduleId: string | null;
  isBuiltin: boolean;
}

interface RolesResponse {
  roles: RoleInfo[];
  allPermissions: PermissionInfo[];
}

export default function RolesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editPriority, setEditPriority] = useState(10);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState('');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const json = await res.json() as RolesResponse;
        setData(json);
        if (!selectedRole && json.roles.length > 0) {
          selectRole(json.roles[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const selectRole = (role: RoleInfo) => {
    setSelectedRole(role);
    setEditLabel(role.roleLabel);
    setEditDescription(role.description ?? '');
    setEditColor(role.color);
    setEditIcon(role.icon);
    setEditPriority(role.priority);
    setEditPermissions([...role.permissions]);
    setIsCreating(false);
    setError(null);
  };

  const startCreate = () => {
    setSelectedRole(null);
    setIsCreating(true);
    setNewRoleCode('');
    setEditLabel('');
    setEditDescription('');
    setEditColor('bg-gray-700 text-gray-300');
    setEditIcon('User');
    setEditPriority(10);
    setEditPermissions([]);
    setError(null);
  };

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() };

      if (isCreating) {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            roleCode: newRoleCode,
            roleLabel: editLabel,
            description: editDescription || undefined,
            color: editColor,
            icon: editIcon,
            priority: editPriority,
            permissions: editPermissions,
          }),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Hiba');
      } else if (selectedRole) {
        const res = await fetch('/api/admin/roles', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id: selectedRole.id,
            roleLabel: editLabel,
            description: editDescription || undefined,
            color: editColor,
            icon: editIcon,
            priority: editPriority,
            permissions: editPermissions,
          }),
        });
        const body = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'error.server');
      }
      await fetchRoles();
      setIsCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error.server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.isBuiltin) return;
    if (!confirm(t('admin.roles.confirm_delete', { role: selectedRole.roleLabel }))) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ id: selectedRole.id }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'error.server');
      setSelectedRole(null);
      await fetchRoles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error.server');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permCode: string) => {
    if (selectedRole?.roleCode === 'admin') return; // admin always has all
    setEditPermissions(prev =>
      prev.includes(permCode) ? prev.filter(p => p !== permCode) : [...prev, permCode]
    );
  };

  // Group permissions by module
  const groupedPermissions = data?.allPermissions.reduce((acc, p) => {
    const group = p.moduleId ?? 'Core';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {} as Record<string, PermissionInfo[]>) ?? {};

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('admin.roles.title')} subtitle={t('admin.roles.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title={t('admin.roles.title')} subtitle={t('admin.roles.subtitle')} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Role list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('admin.roles.roles_heading')}</h3>
          <div className="space-y-2">
            {data?.roles.map(role => {
              const IconComp = (LucideIcons[role.icon as keyof typeof LucideIcons] ?? LucideIcons.User) as React.ComponentType<{ className?: string }>;
              return (
                <button
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRole?.id === role.id && !isCreating
                      ? 'border-indigo-600 bg-indigo-900/20'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${role.color.split(' ')[0]}`}>
                      <IconComp className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100">{role.roleLabel}</span>
                        {role.isBuiltin && <Lock className="w-3 h-3 text-gray-500" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{role.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={startCreate}
            className={`w-full mt-3 p-3 rounded-lg border border-dashed transition-all flex items-center justify-center gap-2 ${
              isCreating ? 'border-indigo-600 bg-indigo-900/20 text-indigo-300' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">{t('admin.roles.new_role')}</span>
          </button>
        </div>

        {/* Right: Permission matrix */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          {(selectedRole || isCreating) ? (
            <>
              <div className="space-y-4 mb-6">
                {isCreating && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('admin.roles.code_label')}</label>
                    <input
                      type="text"
                      value={newRoleCode}
                      onChange={e => setNewRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="pl. operator"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('admin.roles.name_label')}</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('admin.roles.priority_label')}</label>
                    <input
                      type="number"
                      value={editPriority}
                      onChange={e => setEditPriority(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('admin.roles.description_label')}</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              </div>

              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t('admin.roles.permissions_heading')}
              </h4>

              {selectedRole?.roleCode === 'admin' && (
                <p className="text-xs text-yellow-500 mb-3">{t('admin.roles.admin_has_all_perms')}</p>
              )}

              <div className="space-y-4 max-h-80 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group}>
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">{group}</h5>
                    <div className="space-y-1">
                      {perms.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer ${
                            selectedRole?.roleCode === 'admin' ? 'opacity-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRole?.roleCode === 'admin' || editPermissions.includes(p.permissionCode)}
                            onChange={() => togglePermission(p.permissionCode)}
                            disabled={selectedRole?.roleCode === 'admin'}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="text-sm text-gray-200">{p.permissionCode}</span>
                            {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t('common.saving') : t('common.save')}
                </button>
                {selectedRole && !selectedRole.isBuiltin && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('admin.roles.select_role')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
