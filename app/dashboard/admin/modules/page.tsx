'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { ModuleToggleCard } from '@/components/admin/modules/ModuleToggleCard';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import type { ModuleDefinition } from '@/lib/modules/registry';

interface ModulesResponse {
  modules: ModuleDefinition[];
  activeIds: string[];
  license?: {
    tier: string;
    modulesAllowed: string[];
  };
}

export default function ModulesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ModulesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/modules');
      if (res.ok) {
        const json = await res.json() as ModulesResponse;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchModules();
  }, [fetchModules]);

  const handleToggle = async (moduleId: string, enable: boolean) => {
    // Get CSRF token from cookie
    const csrfToken = document.cookie
      .split('; ')
      .find(c => c.startsWith('csrf-token='))
      ?.split('=')[1] ?? '';

    const res = await fetch('/api/admin/modules', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ moduleId, enable }),
    });

    const body = await res.json() as { ok?: boolean; activeIds?: string[]; error?: string };

    if (!res.ok || body.error) {
      throw new Error(body.error ?? t('admin.modules.error_toggle'));
    }

    // Update local state with server response
    if (body.activeIds) {
      setData(prev => prev ? { ...prev, activeIds: body.activeIds! } : prev);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Modules"
        subtitle="Enable and disable modules. Dependencies are automatically checked."
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : !data || data.modules.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-2">No installed modules</p>
          <p className="text-sm text-gray-600">
            Business modules (workforce, performance, sap-import) will be registered here in Phase 2.
            <br />
            Each module can be independently enabled/disabled with automatic dependency checking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.modules.map(mod => (
            <ModuleToggleCard
              key={mod.id}
              module={mod}
              isActive={data.activeIds.includes(mod.id)}
              activeIds={data.activeIds}
              allModules={data.modules}
              onToggle={handleToggle}
              licensedModules={data.license?.modulesAllowed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
