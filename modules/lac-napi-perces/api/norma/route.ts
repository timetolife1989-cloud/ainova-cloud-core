import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface NormaRow {
  id: number;
  termek_nev: string;
  norma_ido_db: number | null;
  eur_per_perc: number | null;
  lac_megjegyzes: string | null;
}

// GET /api/modules/lac-napi-perces/norma?search=optional
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'lac-napi-perces.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  try {
    const db = getDb();
    let sql = 'SELECT id, termek_nev, norma_ido_db, eur_per_perc, lac_megjegyzes FROM norma_friss';
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];

    if (search) {
      sql += ' WHERE termek_nev LIKE @p0';
      params.push({ name: 'p0', type: 'nvarchar', value: `%${search}%` });
    }

    sql += ' ORDER BY termek_nev';
    const rows = await db.query<NormaRow>(sql, params);

    return Response.json({
      norma: rows.map(r => ({
        id: r.id,
        productName: r.termek_nev,
        normaTimePerPc: r.norma_ido_db != null ? Number(r.norma_ido_db) : null,
        eurPerMinute: r.eur_per_perc != null ? Number(r.eur_per_perc) : null,
        lacNote: r.lac_megjegyzes,
      })),
    });
  } catch (err) {
    console.error('[LAC Norma] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const UpdateNormaSchema = z.object({
  id: z.number(),
  normaTimePerPc: z.number().min(0).optional(),
  eurPerMinute: z.number().min(0).optional(),
  lacNote: z.string().max(20).optional(),
});

// PUT /api/modules/lac-napi-perces/norma — update single norma entry
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'lac-napi-perces.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateNormaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { id, normaTimePerPc, eurPerMinute, lacNote } = parsed.data;

  try {
    const db = getDb();
    const setClauses: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (normaTimePerPc !== undefined) { setClauses.push(`norma_ido_db = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: normaTimePerPc }); idx++; }
    if (eurPerMinute !== undefined) { setClauses.push(`eur_per_perc = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: eurPerMinute }); idx++; }
    if (lacNote !== undefined) { setClauses.push(`lac_megjegyzes = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: lacNote || null }); idx++; }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push({ name: 'pid', type: 'nvarchar', value: id });
    await db.execute(
      `UPDATE norma_friss SET ${setClauses.join(', ')} WHERE id = @pid`,
      params
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[LAC Norma] PUT error:', err);
    return Response.json({ error: 'api.error.data_update' }, { status: 500 });
  }
}
