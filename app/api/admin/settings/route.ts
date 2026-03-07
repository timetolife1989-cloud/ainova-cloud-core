import { type NextRequest } from 'next/server';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { getAllSettings, setSetting } from '@/lib/settings';
import { z } from 'zod';

// GET /api/admin/settings — returns all settings as key-value object
export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await getAllSettings();
  return Response.json(settings);
}

// PUT /api/admin/settings — updates one or more settings
// Body: { key: string, value: string } or { updates: Array<{ key, value }> }
export async function PUT(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csrf = await checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;

  const SingleSchema = z.object({ key: z.string(), value: z.string() });
  const BatchSchema  = z.object({ updates: z.array(SingleSchema) });

  const batchParsed = BatchSchema.safeParse(body);
  const singleParsed = SingleSchema.safeParse(body);

  if (batchParsed.success) {
    for (const { key, value } of batchParsed.data.updates) {
      await setSetting(key, value, session.username);
    }
  } else if (singleParsed.success) {
    await setSetting(singleParsed.data.key, singleParsed.data.value, session.username);
  } else {
    return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 });
  }

  return Response.json({ ok: true });
}
