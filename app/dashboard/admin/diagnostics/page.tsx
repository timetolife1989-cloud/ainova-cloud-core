'use client';

import { DiagnosticsPanel } from '@/components/admin/diagnostics/DiagnosticsPanel';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

export default function DiagnosticsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={t('cmd.diagnostics')}
        subtitle={t('admin.diag.subtitle')}
      />
      <DiagnosticsPanel />
    </div>
  );
}
