import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RecipeRow {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  yield_qty: number;
  yield_unit: string;
  cost_per_unit: number | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  allergens: string | null;
  haccp_notes: string | null;
  is_active: boolean;
  created_at: string;
}

// GET /api/modules/recipes/recipes — list recipes
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'recipes.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const category = request.nextUrl.searchParams.get('category');

  let sql = 'SELECT * FROM recipes_recipes';
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: string | number }> = [];

  if (category) {
    sql += ' WHERE category = @p0';
    params.push({ name: 'p0', type: 'nvarchar', value: category });
  }

  sql += ' ORDER BY name';
  const rows = await db.query<RecipeRow>(sql, params);

  return Response.json({
    recipes: rows.map(r => ({
      ...r,
      allergens: r.allergens ? JSON.parse(r.allergens) : [],
    })),
  });
}

const RecipeSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  yieldQty: z.number().positive(),
  yieldUnit: z.string().max(20).optional(),
  prepTimeMin: z.number().int().nonnegative().optional(),
  cookTimeMin: z.number().int().nonnegative().optional(),
  allergens: z.array(z.string()).optional(),
  haccpNotes: z.string().max(2000).optional(),
});

// POST /api/modules/recipes/recipes — create recipe
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'recipes.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = RecipeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const result = await db.query<{ id: number }>(
    `INSERT INTO recipes_recipes (name, category, description, yield_qty, yield_unit, prep_time_min, cook_time_min, allergens, haccp_notes)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.name },
      { name: 'p1', type: 'nvarchar', value: d.category ?? '' },
      { name: 'p2', type: 'nvarchar', value: d.description ?? '' },
      { name: 'p3', type: 'float', value: d.yieldQty },
      { name: 'p4', type: 'nvarchar', value: d.yieldUnit ?? 'db' },
      { name: 'p5', type: 'int', value: d.prepTimeMin ?? 0 },
      { name: 'p6', type: 'int', value: d.cookTimeMin ?? 0 },
      { name: 'p7', type: 'nvarchar', value: JSON.stringify(d.allergens ?? []) },
      { name: 'p8', type: 'nvarchar', value: d.haccpNotes ?? '' },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
