import { notFound } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { UserForm } from '@/components/admin/users/UserForm';
import { t } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) notFound();

  const user = await getAuth().getUserById(userId);
  if (!user) notFound();

  const editSubtitle = await t('admin.users.edit_subtitle');

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={`${user.username}`}
        subtitle={editSubtitle}
      />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <UserForm user={user} />
      </div>
    </div>
  );
}
