'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { ModuleDefinition } from '@/lib/modules/registry';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';

interface ModuleToggleCardProps {
  module: ModuleDefinition;
  isActive: boolean;
  activeIds: string[];
  allModules: ModuleDefinition[];
  onToggle: (moduleId: string, enable: boolean) => Promise<void>;
  licensedModules?: string[];
}

export function ModuleToggleCard({
  module,
  isActive,
  activeIds,
  allModules,
  onToggle,
  licensedModules,
}: ModuleToggleCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = (LucideIcons[module.icon as keyof typeof LucideIcons] ?? LucideIcons.Package) as React.ComponentType<{ className?: string }>;

  // Check if this toggle is currently blocked (pre-flight, same logic as server)
  const missingDeps = (module.dependsOn ?? []).filter(dep => !activeIds.includes(dep));
  const dependents  = allModules.filter(
    m => activeIds.includes(m.id) && m.dependsOn?.includes(module.id)
  );

  const isLicenseLocked = licensedModules
    ? !licensedModules.includes('*') && !licensedModules.includes(module.id)
    : false;

  const canEnable  = !isActive && missingDeps.length === 0 && !isLicenseLocked;
  const canDisable = isActive  && dependents.length === 0;
  const isBlocked  = isActive ? !canDisable : !canEnable;

  const blockReason = isLicenseLocked
    ? t('admin.modules.license_required')
    : isActive && dependents.length > 0
      ? t('admin.modules.active_dependents', { deps: dependents.map(m => t(m.id + '.title')).join(', ') })
      : !isActive && missingDeps.length > 0
        ? t('admin.modules.required_modules', { deps: missingDeps.map(id => allModules.find(m => m.id === id) ? t(id + '.title') : id).join(', ') })
        : null;

  const handleToggle = async () => {
    if (isBlocked || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onToggle(module.id, !isActive);
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isActive
        ? 'bg-gray-900 border-indigo-700'
        : 'bg-gray-950 border-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            isActive ? 'bg-indigo-900/50' : 'bg-gray-800'
          }`}>
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-100">{t(module.id + '.title')}</span>
              {module.version && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                  v{module.version}
                </span>
              )}
              {isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">
                  {t('admin.modules.active_badge')}
                </span>
              )}
              {isLicenseLocked && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 flex items-center gap-1">
                  <LucideIcons.Lock className="w-3 h-3" /> {t('admin.modules.license_needed')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{t(module.id + '.subtitle')}</p>

            {/* Dependencies info */}
            {(module.dependsOn ?? []).length > 0 && (
              <p className="text-[10px] text-gray-600 mt-1">
                {t('admin.modules.depends_on')}: {(module.dependsOn ?? [])
                  .map(id => allModules.find(m => m.id === id) ? t(id + '.title') : id)
                  .join(', ')}
              </p>
            )}

            {/* Block reason */}
            {blockReason && (
              <p className="text-[10px] text-yellow-600 mt-1">{blockReason}</p>
            )}

            {/* Error */}
            {error && (
              <p className="text-[10px] text-red-400 mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* Right: toggle switch */}
        <button
          onClick={() => void handleToggle()}
          disabled={isBlocked || loading}
          title={blockReason ?? (isActive ? t('admin.modules.disable') : t('admin.modules.enable'))}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            loading
              ? 'opacity-50 cursor-wait'
              : isBlocked
                ? 'opacity-30 cursor-not-allowed'
                : 'cursor-pointer'
          } ${isActive ? 'bg-indigo-600' : 'bg-gray-700'}`}
          aria-checked={isActive}
          role="switch"
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            isActive ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  );
}
