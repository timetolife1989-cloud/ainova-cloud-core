import { type NextRequest } from 'next/server';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { getAllModules, getActiveModuleIds, validateModuleToggle } from '@/lib/modules/registry';
import { setSetting } from '@/lib/settings';
import { z } from 'zod';

// GET /api/admin/modules — returns all registered modules + which are active
export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [allModules, activeIds] = await Promise.all([
    Promise.resolve(getAllModules()),
    getActiveModuleIds(),
  ]);

  return Response.json({ modules: allModules, activeIds });
}

// PUT /api/admin/modules/toggle — toggle a single module on or off
// Body: { moduleId: string, enable: boolean }
export async function PUT(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csrf = await checkCsrf(request);
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

  await setSetting('active_modules', JSON.stringify(newActiveIds), session.username);

  return Response.json({ ok: true, activeIds: newActiveIds });
}
