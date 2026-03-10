import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAllSettings, setSetting } from '@/lib/settings';
import { clearTranslationCache } from '@/lib/i18n';
import { z } from 'zod';

// GET /api/admin/settings — returns all settings as key-value object
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.view');
  if (!auth.valid) return auth.response;

  const settings = await getAllSettings();
  return Response.json(settings);
}

// PUT /api/admin/settings — updates one or more settings
// Body: { key: string, value: string } or { updates: Array<{ key, value }> }
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;

  const SingleSchema = z.object({ key: z.string(), value: z.string() });
  const BatchSchema  = z.object({ updates: z.array(SingleSchema) });

  const batchParsed = BatchSchema.safeParse(body);
  const singleParsed = SingleSchema.safeParse(body);

  let localeChanged = false;

  if (batchParsed.success) {
    for (const { key, value } of batchParsed.data.updates) {
      await setSetting(key, value, auth.username);
      if (key === 'app_locale') localeChanged = true;
    }
  } else if (singleParsed.success) {
    await setSetting(singleParsed.data.key, singleParsed.data.value, auth.username);
    if (singleParsed.data.key === 'app_locale') localeChanged = true;
  } else {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (localeChanged) {
    clearTranslationCache();
  }

  return Response.json({ ok: true });
}
