import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { UserForm } from '@/components/admin/users/UserForm';

export default function NewUserPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Új felhasználó"
        subtitle="Fiók létrehozása és szerepkör hozzárendelése"
      />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <UserForm />
      </div>
    </div>
  );
}
