// NOTE: In production, set UPLOAD_DIR to a publicly accessible path (e.g. a mounted volume).
// In development, this defaults to `public/uploads/` so Next.js serves files at /uploads/*.
// In Docker (Phase 4), mount a volume to UPLOAD_DIR and configure a static file server or
// Next.js rewrites to expose it publicly.

import { type NextRequest } from 'next/server';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { setSetting } from '@/lib/settings';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/constants';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg':    'jpg',
  'image/png':     'png',
  'image/svg+xml': 'svg',
  'image/webp':    'webp',
};

export async function POST(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csrf = await checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const formData = await request.formData();
  const file = formData.get('logo');

  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'Nincs fájl csatolva' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Csak JPG, PNG, SVG és WebP fájlok engedélyezettek' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json({ error: 'A fájl mérete nem haladhatja meg a 2 MB-ot' }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const ext = EXT_MAP[file.type] ?? 'jpg';
  const filename = `logo.${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  // Store the public path (relative to public/ when using the default public/uploads dir)
  const publicPath = `/uploads/${filename}`;
  await setSetting('app_logo_path', publicPath, session.username);

  return Response.json({ ok: true, path: publicPath });
}
