import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAllModuleSettings, setModuleSetting } from '@/lib/modules/settings';
import { z } from 'zod';

// GET /api/admin/module-settings?moduleId=...
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get('moduleId');

  if (!moduleId) {
    return Response.json({ error: 'api.error.module_id_required' }, { status: 400 });
  }

  const settings = await getAllModuleSettings(moduleId);
  return Response.json({ moduleId, settings });
}

const UpdateSchema = z.object({
  moduleId: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
});

// PUT /api/admin/module-settings
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { moduleId, key, value } = parsed.data;

  try {
    await setModuleSetting(moduleId, key, value, auth.username);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ModuleSettings API] Update error:', err);
    return Response.json({ error: 'api.error.setting_save' }, { status: 500 });
  }
}
