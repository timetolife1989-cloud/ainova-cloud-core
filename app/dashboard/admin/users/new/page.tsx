'use client';

import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { UserForm } from '@/components/admin/users/UserForm';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewUserPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={t('admin.users.new_title')}
        subtitle={t('admin.users.new_subtitle')}
      />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <UserForm />
      </div>
    </div>
  );
}
