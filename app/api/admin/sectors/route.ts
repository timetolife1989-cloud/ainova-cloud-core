import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface SectorPreset {
  id: number;
  sector_id: string;
  name_hu: string;
  name_en: string;
  name_de: string;
  icon: string;
  modules: string;
  optional_modules: string | null;
  settings: string;
  recommended_tier: string;
  created_at: string;
}

// GET /api/admin/sectors — list all sector presets (public for setup wizard)
export async function GET(request: NextRequest) {
  const isSetup = request.nextUrl.searchParams.get('setup') === '1';

  if (!isSetup) {
    const auth = await checkAuth(request, 'admin');
    if (!auth.valid) return auth.response;
  }

  const db = getDb();

  let sectors: Array<Record<string, unknown>> = [];
  try {
    const rows = await db.query<SectorPreset>(
      'SELECT * FROM core_sector_presets ORDER BY sector_id'
    );

    sectors = rows.map(r => ({
      id: r.id,
      sectorId: r.sector_id,
      nameHu: r.name_hu,
      nameEn: r.name_en,
      nameDe: r.name_de,
      icon: r.icon,
      modules: JSON.parse(r.modules),
      optionalModules: r.optional_modules ? JSON.parse(r.optional_modules) : [],
      settings: JSON.parse(r.settings),
      recommendedTier: r.recommended_tier,
    }));
  } catch {
    // Table may not exist yet — return empty list for setup wizard
  }

  return Response.json({ sectors });
}

const SectorSchema = z.object({
  sectorId: z.string().min(2).max(30).regex(/^[a-z][a-z0-9-]*$/),
  nameHu: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  nameDe: z.string().min(1).max(100),
  icon: z.string().min(1).max(50),
  modules: z.array(z.string()),
  optionalModules: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.string()),
  recommendedTier: z.enum(['basic', 'professional', 'enterprise']),
});

// POST /api/admin/sectors — create sector preset
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'admin');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = SectorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  await db.query(
    `INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.sectorId },
      { name: 'p1', type: 'nvarchar', value: d.nameHu },
      { name: 'p2', type: 'nvarchar', value: d.nameEn },
      { name: 'p3', type: 'nvarchar', value: d.nameDe },
      { name: 'p4', type: 'nvarchar', value: d.icon },
      { name: 'p5', type: 'nvarchar', value: JSON.stringify(d.modules) },
      { name: 'p6', type: 'nvarchar', value: JSON.stringify(d.optionalModules ?? []) },
      { name: 'p7', type: 'nvarchar', value: JSON.stringify(d.settings) },
      { name: 'p8', type: 'nvarchar', value: d.recommendedTier },
    ]
  );

  return Response.json({ ok: true }, { status: 201 });
}

// PUT /api/admin/sectors — update sector preset
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'admin');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const id = (body as { id?: number }).id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const parsed = SectorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  await db.query(
    `UPDATE core_sector_presets
     SET sector_id = @p0, name_hu = @p1, name_en = @p2, name_de = @p3,
         icon = @p4, modules = @p5, optional_modules = @p6, settings = @p7, recommended_tier = @p8
     WHERE id = @p9`,
    [
      { name: 'p0', type: 'nvarchar', value: d.sectorId },
      { name: 'p1', type: 'nvarchar', value: d.nameHu },
      { name: 'p2', type: 'nvarchar', value: d.nameEn },
      { name: 'p3', type: 'nvarchar', value: d.nameDe },
      { name: 'p4', type: 'nvarchar', value: d.icon },
      { name: 'p5', type: 'nvarchar', value: JSON.stringify(d.modules) },
      { name: 'p6', type: 'nvarchar', value: JSON.stringify(d.optionalModules ?? []) },
      { name: 'p7', type: 'nvarchar', value: JSON.stringify(d.settings) },
      { name: 'p8', type: 'nvarchar', value: d.recommendedTier },
      { name: 'p9', type: 'int', value: id },
    ]
  );

  return Response.json({ ok: true });
}
