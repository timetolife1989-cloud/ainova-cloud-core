import { SyncStatusWidget } from '@/components/admin/SyncStatusWidget';
import { AdminMenuCard } from '@/components/admin/AdminMenuCard';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';

const ADMIN_MENU = [
  {
    title: 'Felhasználók',
    description: 'Fiókok kezelése, szerepkörök, jelszó visszaállítás',
    icon: 'Users',
    href: '/dashboard/admin/users',
  },
  {
    title: 'Modulok',
    description: 'Modulok be- és kikapcsolása, függőség-ellenőrzés',
    icon: 'ToggleLeft',
    href: '/dashboard/admin/modules',
  },
  {
    title: 'Branding & Beállítások',
    description: 'Cégnév, szín, logó, általános konfiguráció',
    icon: 'Palette',
    href: '/dashboard/admin/settings',
  },
  {
    title: 'Diagnosztika',
    description: 'DB kapcsolat, uptime, aktív munkamenetek',
    icon: 'Activity',
    href: '/dashboard/admin/diagnostics',
  },
  {
    title: 'Audit Napló',
    description: 'Bejelentkezések, admin műveletek, eseménylista',
    icon: 'FileText',
    href: '/dashboard/admin/audit-log',
  },
] as const;

export default function AdminPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Admin Panel"
        subtitle="Rendszergazdai beállítások és felügyelet"
      />

      {/* Sync Status Widget — always at top, most important for non-technical admins */}
      <SyncStatusWidget />

      {/* Admin menu grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_MENU.map((item) => (
          <AdminMenuCard
            key={item.href}
            title={item.title}
            description={item.description}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </div>
    </div>
  );
}
