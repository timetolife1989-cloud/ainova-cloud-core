import { SyncStatusWidget } from '@/components/admin/SyncStatusWidget';
import { AdminMenuCard } from '@/components/admin/AdminMenuCard';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { getAllModules, getActiveModuleIds } from '@/lib/modules/registry';
import { t } from '@/lib/i18n';

interface AdminMenuItem {
  title: string;
  description: string;
  icon: string;
  href: string;
  order: number;
}

async function getAdminMenuItems(): Promise<AdminMenuItem[]> {
  return [
    { title: await t('admin.users'),                description: await t('admin.users_desc'),           icon: 'Users',          href: '/dashboard/admin/users',          order: 10 },
    { title: await t('admin.roles'),                description: await t('admin.roles_desc'),           icon: 'Shield',         href: '/dashboard/admin/roles',          order: 20 },
    { title: await t('admin.modules'),              description: await t('admin.modules_desc'),         icon: 'ToggleLeft',     href: '/dashboard/admin/modules',        order: 30 },
    { title: await t('admin.settings'),             description: await t('admin.settings_desc'),        icon: 'Palette',        href: '/dashboard/admin/settings',       order: 40 },
    { title: await t('admin.locale'),               description: await t('admin.locale_desc'),          icon: 'Globe',          href: '/dashboard/admin/locale',         order: 50 },
    { title: await t('admin.units'),                description: await t('admin.units_desc'),           icon: 'Ruler',          href: '/dashboard/admin/units',          order: 60 },
    { title: await t('admin.import.title'),              description: await t('admin.import.desc'), icon: 'FileSpreadsheet', href: '/dashboard/admin/import-configs', order: 70 },
    { title: await t('admin.diagnostics'),          description: await t('admin.diagnostics_desc'),      icon: 'Activity',       href: '/dashboard/admin/diagnostics',    order: 80 },
    { title: await t('admin.audit_log'),            description: await t('admin.audit_log_desc'),       icon: 'FileText',       href: '/dashboard/admin/audit-log',      order: 90 },
    { title: await t('admin.license'),              description: await t('admin.license_desc'),         icon: 'Key',            href: '/dashboard/admin/license',        order: 100 },
  ];
}

export default async function AdminPage() {
  // Get active modules with admin settings
  const allModules = getAllModules();
  const activeIds = await getActiveModuleIds();
  
  const coreAdminMenu = await getAdminMenuItems();
  
  const settingsSuffix = await t('admin.modules.settings_suffix');
  const configSuffix = await t('admin.modules.config_suffix');
  
  const moduleAdminItems: AdminMenuItem[] = allModules
    .filter(m => activeIds.includes(m.id) && m.adminSettings && m.adminSettings.length > 0)
    .map((m, i) => ({
      title: `${m.name} ${settingsSuffix}`,
      description: `${m.name} ${configSuffix}`,
      icon: m.icon,
      href: `/dashboard/admin/modules/${m.id}`,
      order: 200 + i,
    }));

  const allMenuItems = [...coreAdminMenu, ...moduleAdminItems].sort((a, b) => a.order - b.order);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={await t('admin.title')}
        subtitle={await t('admin.subtitle')}
      />

      {/* Sync Status Widget — always at top, most important for non-technical admins */}
      <SyncStatusWidget />

      {/* Admin menu grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allMenuItems.map((item) => (
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
