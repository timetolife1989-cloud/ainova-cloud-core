import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/auth/cached-session';
import { getActiveModules } from '@/lib/modules/registry';
import { MenuTile } from '@/components/core/MenuTile';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  if (!sessionId) redirect('/login');

  const session = await getCachedSession(sessionId);
  if (!session) redirect('/login');

  const modules = await getActiveModules(session.role);

  // Pre-resolve module titles/subtitles in parallel
  const moduleTitles: Record<string, string> = {};
  const moduleSubtitles: Record<string, string> = {};
  await Promise.all(
    modules.map(async (mod) => {
      const [title, subtitle] = await Promise.all([
        t(mod.id + '.title'),
        t(mod.id + '.subtitle'),
      ]);
      moduleTitles[mod.id] = title;
      moduleSubtitles[mod.id] = subtitle;
    })
  );

  // Pre-resolve all translations in parallel
  const [dashboardTitle, dashboardWelcome, noModulesUser, noModules, noModulesAdmin, adminTitle, adminSubtitle] = await Promise.all([
    t('dashboard.title'),
    t('dashboard.welcome', { name: session.fullName || session.username }),
    t('dashboard.no_modules_user'),
    t('dashboard.no_modules'),
    t('dashboard.no_modules_admin'),
    t('admin.title'),
    t('admin.subtitle'),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={dashboardTitle}
        subtitle={dashboardWelcome}
      />

      {modules.length === 0 && session.role !== 'admin' ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">
            {noModulesUser}
          </p>
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-8 text-center">
          <p className="text-yellow-400 font-medium mb-2">{noModules}</p>
          <p className="text-gray-400 text-sm">
            {noModulesAdmin}
          </p>
          <a
            href="/dashboard/admin"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            {adminTitle}
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <MenuTile
              key={mod.id}
              title={mod.id === 'admin' ? adminTitle : moduleTitles[mod.id]}
              description={mod.id === 'admin' ? adminSubtitle : moduleSubtitles[mod.id]}
              icon={mod.icon}
              href={mod.href}
              color={mod.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
