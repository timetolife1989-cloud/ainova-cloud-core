import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getActiveModules } from '@/lib/modules/registry';
import { MenuTile } from '@/components/core/MenuTile';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { t } from '@/lib/i18n';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  if (!sessionId) redirect('/login');

  const session = await getAuth().validateSession(sessionId);
  if (!session) redirect('/login');

  const modules = await getActiveModules(session.role);

  // Pre-resolve module titles/subtitles
  const moduleTitles: Record<string, string> = {};
  const moduleSubtitles: Record<string, string> = {};
  for (const mod of modules) {
    moduleTitles[mod.id] = await t(mod.id + '.title');
    moduleSubtitles[mod.id] = await t(mod.id + '.subtitle');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title={await t('dashboard.title')}
        subtitle={await t('dashboard.welcome', { name: session.fullName || session.username })}
      />

      {modules.length === 0 && session.role !== 'admin' ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">
            {await t('dashboard.no_modules_user')}
          </p>
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-xl border border-yellow-800 bg-yellow-950/20 p-8 text-center">
          <p className="text-yellow-400 font-medium mb-2">{await t('dashboard.no_modules')}</p>
          <p className="text-gray-400 text-sm">
            {await t('dashboard.no_modules_admin')}
          </p>
          <a
            href="/dashboard/admin"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            {await t('admin.title')}
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <MenuTile
              key={mod.id}
              title={moduleTitles[mod.id]}
              description={moduleSubtitles[mod.id]}
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
