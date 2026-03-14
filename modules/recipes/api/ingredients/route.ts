import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET /api/modules/recipes/ingredients?recipeId=X — list ingredients for a recipe
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'recipes.view');
  if (!auth.valid) return auth.response;

  const recipeId = request.nextUrl.searchParams.get('recipeId');
  if (!recipeId) return Response.json({ error: 'recipeId required' }, { status: 400 });

  const db = getDb();
  const rows = await db.query<{ id: number; product_name: string; quantity: number; unit: string; unit_cost: number | null }>(
    'SELECT id, product_name, quantity, unit, unit_cost FROM recipes_ingredients WHERE recipe_id = @p0 ORDER BY id',
    [{ name: 'p0', type: 'int', value: parseInt(recipeId, 10) }]
  );

  return Response.json({ ingredients: rows });
}

const IngredientSchema = z.object({
  recipeId: z.number().int().positive(),
  productId: z.number().int().positive().optional(),
  productName: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  unitCost: z.number().nonnegative().optional(),
});

// POST /api/modules/recipes/ingredients — add ingredient to recipe
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'recipes.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = IngredientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  await db.query(
    `INSERT INTO recipes_ingredients (recipe_id, product_id, product_name, quantity, unit, unit_cost)
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: d.recipeId },
      { name: 'p1', type: 'int', value: d.productId ?? 0 },
      { name: 'p2', type: 'nvarchar', value: d.productName },
      { name: 'p3', type: 'float', value: d.quantity },
      { name: 'p4', type: 'nvarchar', value: d.unit ?? 'kg' },
      { name: 'p5', type: 'float', value: d.unitCost ?? 0 },
    ]
  );

  // Recalculate recipe cost
  const costs = await db.query<{ total_cost: number }>(
    `SELECT ISNULL(SUM(quantity * unit_cost), 0) AS total_cost FROM recipes_ingredients WHERE recipe_id = @p0`,
    [{ name: 'p0', type: 'int', value: d.recipeId }]
  );
  const yieldRow = await db.query<{ yield_qty: number }>(
    'SELECT yield_qty FROM recipes_recipes WHERE id = @p0',
    [{ name: 'p0', type: 'int', value: d.recipeId }]
  );
  const totalCost = costs[0]?.total_cost ?? 0;
  const yieldQty = yieldRow[0]?.yield_qty ?? 1;
  const costPerUnit = yieldQty > 0 ? totalCost / yieldQty : 0;

  await db.query(
    'UPDATE recipes_recipes SET cost_per_unit = @p0 WHERE id = @p1',
    [
      { name: 'p0', type: 'float', value: costPerUnit },
      { name: 'p1', type: 'int', value: d.recipeId },
    ]
  );

  return Response.json({ ok: true, costPerUnit }, { status: 201 });
}
