import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { clearTranslationCache } from '@/lib/i18n';
import { z } from 'zod';

interface TranslationRow {
  id: number;
  locale: string;
  translation_key: string;
  translation_value: string;
}

const SaveTranslationSchema = z.object({
  locale: z.string().min(2).max(5),
  key: z.string().min(1).max(200),
  value: z.string(),
});

const BulkImportSchema = z.object({
  locale: z.string().min(2).max(5),
  translations: z.record(z.string(), z.string()),
});

/**
 * GET /api/admin/translations?locale=hu
 * List all DB translation overrides for a locale.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') ?? 'hu';

  const rows = await getDb().query<TranslationRow>(
    'SELECT id, locale, translation_key, translation_value FROM core_translations WHERE locale = @p0 ORDER BY translation_key',
    [{ name: 'p0', type: 'nvarchar', value: locale }]
  );

  return Response.json({
    locale,
    items: rows.map(r => ({
      id: r.id,
      key: r.translation_key,
      value: r.translation_value,
    })),
  });
}

/**
 * POST /api/admin/translations
 * Save or bulk-import translations.
 */
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();

  // Bulk import mode
  if (body.translations && typeof body.translations === 'object') {
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { locale, translations } = parsed.data;
    let count = 0;

    for (const [key, value] of Object.entries(translations)) {
      await getDb().execute(
        `MERGE core_translations AS t
         USING (SELECT @p0 AS locale, @p1 AS translation_key) AS s
         ON t.locale = s.locale AND t.translation_key = s.translation_key
         WHEN MATCHED THEN UPDATE SET translation_value = @p2
         WHEN NOT MATCHED THEN INSERT (locale, translation_key, translation_value) VALUES (@p0, @p1, @p2);`,
        [
          { name: 'p0', type: 'nvarchar', value: locale },
          { name: 'p1', type: 'nvarchar', value: key },
          { name: 'p2', type: 'nvarchar', value: value },
        ]
      );
      count++;
    }

    clearTranslationCache();
    return Response.json({ ok: true, count }, { status: 201 });
  }

  // Single translation mode
  const parsed = SaveTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data' }, { status: 400 });
  }

  const { locale, key, value } = parsed.data;

  await getDb().execute(
    `MERGE core_translations AS t
     USING (SELECT @p0 AS locale, @p1 AS translation_key) AS s
     ON t.locale = s.locale AND t.translation_key = s.translation_key
     WHEN MATCHED THEN UPDATE SET translation_value = @p2
     WHEN NOT MATCHED THEN INSERT (locale, translation_key, translation_value) VALUES (@p0, @p1, @p2);`,
    [
      { name: 'p0', type: 'nvarchar', value: locale },
      { name: 'p1', type: 'nvarchar', value: key },
      { name: 'p2', type: 'nvarchar', value: value },
    ]
  );

  clearTranslationCache();
  return Response.json({ ok: true }, { status: 201 });
}
