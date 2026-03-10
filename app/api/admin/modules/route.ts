import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAllModules, getActiveModuleIds, validateModuleToggle } from '@/lib/modules/registry';
import { setSetting } from '@/lib/settings';
import { getLicense, isModuleAllowed } from '@/lib/license';
import { z } from 'zod';

// GET /api/admin/modules — returns all registered modules + which are active
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const [allModules, activeIds] = await Promise.all([
    Promise.resolve(getAllModules()),
    getActiveModuleIds(),
  ]);

  const license = await getLicense();

  return Response.json({
    modules: allModules,
    activeIds,
    license: {
      tier: license.tier,
      modulesAllowed: license.modulesAllowed,
    },
  });
}

// PUT /api/admin/modules/toggle — toggle a single module on or off
// Body: { moduleId: string, enable: boolean }
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'modules.toggle');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const Schema = z.object({
    moduleId: z.string().min(1),
    enable:   z.boolean(),
  });

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 });
  }

  const { moduleId, enable } = parsed.data;

  // Licenc ellenőrzés
  if (enable) {
    const allowed = await isModuleAllowed(moduleId);
    if (!allowed) {
      return Response.json(
        { error: 'Ez a modul nem elérhető a jelenlegi licenccsomagban. Vegye fel a kapcsolatot a szoftver szállítóval.' },
        { status: 403 }
      );
    }
  }

  const currentlyActive = await getActiveModuleIds();

  // Dependency validation — enforces module dependency graph
  const validationError = validateModuleToggle(moduleId, enable, currentlyActive);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 409 });
  }

  // Apply the toggle
  const newActiveIds = enable
    ? [...new Set([...currentlyActive, moduleId])]
    : currentlyActive.filter(id => id !== moduleId);

  await setSetting('active_modules', JSON.stringify(newActiveIds), auth.username);

  return Response.json({ ok: true, activeIds: newActiveIds });
}
