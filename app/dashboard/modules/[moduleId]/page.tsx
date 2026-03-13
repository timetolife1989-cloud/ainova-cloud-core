import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getActiveModules } from '@/lib/modules/registry';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ moduleId: string }>;
}

export default async function ModuleDashboardPage({ params }: Props) {
  const { moduleId } = await params;

  // Session check
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  if (!sessionId) notFound();

  const session = await getAuth().validateSession(sessionId);
  if (!session) notFound();

  // Ellenőrzés: modul aktív-e
  const activeModules = await getActiveModules(session.role);
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod) notFound();

  // Dinamikus komponens betöltés
  // A modul dashboard komponensét a modules/<moduleId>/components/DashboardPage.tsx-ből tölti
  try {
    const ModuleComponent = (await import(`@/modules/${moduleId}/components/DashboardPage`)).default;
    return <ModuleComponent />;
  } catch {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">{await t(moduleId + '.title')}</h2>
          <p className="text-gray-400">{await t('modules.dashboard_unavailable')}</p>
        </div>
      </div>
    );
  }
}
