import { getAllSettings } from '@/lib/settings';
import { BrandingForm } from '@/components/admin/settings/BrandingForm';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { t } from '@/lib/i18n';

export default async function SettingsPage() {
  let settings: Record<string, string> = {};
  try {
    settings = await getAllSettings();
  } catch {
    // DB unreachable, use empty defaults
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={await t('admin.settings')}
        subtitle={await t('admin.settings_desc')}
      />
      <BrandingForm initialSettings={settings} />
    </div>
  );
}
