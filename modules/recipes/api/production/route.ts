import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface IngredientRow {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit: string;
}

// GET /api/modules/recipes/production?recipeId=X — list production log
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'recipes.view');
  if (!auth.valid) return auth.response;

  const recipeId = request.nextUrl.searchParams.get('recipeId');
  if (!recipeId) return Response.json({ error: 'recipeId required' }, { status: 400 });

  const db = getDb();
  const rows = await db.query<{ id: number; batch_qty: number; produced_qty: number; production_date: string; notes: string | null }>(
    'SELECT id, batch_qty, produced_qty, production_date, notes FROM recipes_production WHERE recipe_id = @p0 ORDER BY production_date DESC',
    [{ name: 'p0', type: 'int', value: parseInt(recipeId, 10) }]
  );

  return Response.json({ productions: rows });
}

const ProductionSchema = z.object({
  recipeId: z.number().int().positive(),
  batchQty: z.number().positive(),
  producedQty: z.number().positive(),
  notes: z.string().max(1000).optional(),
});

// POST /api/modules/recipes/production — record production batch → deduct inventory
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'recipes.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = ProductionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  // Get recipe ingredients
  const ingredients = await db.query<IngredientRow>(
    'SELECT product_id, product_name, quantity, unit FROM recipes_ingredients WHERE recipe_id = @p0',
    [{ name: 'p0', type: 'int', value: d.recipeId }]
  );

  // Generate production reference
  const year = new Date().getFullYear();
  const countRows = await db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM recipes_production WHERE YEAR(production_date) = @p0`,
    [{ name: 'p0', type: 'int', value: year }]
  );
  const seq = (countRows[0]?.cnt ?? 0) + 1;
  const reference = `PROD-${year}-${String(seq).padStart(4, '0')}`;

  // Deduct inventory for each ingredient with a product_id
  const ingredientsUsed: Array<{ productName: string; used: number; unit: string }> = [];

  for (const ing of ingredients) {
    const usedQty = ing.quantity * d.batchQty;
    ingredientsUsed.push({ productName: ing.product_name, used: usedQty, unit: ing.unit });

    if (ing.product_id && ing.product_id > 0) {
      // Deduct from inventory
      await db.query(
        `UPDATE inventory_items SET current_stock = current_stock - @p0 WHERE id = @p1`,
        [
          { name: 'p0', type: 'float', value: usedQty },
          { name: 'p1', type: 'int', value: ing.product_id },
        ]
      );

      // Record inventory movement
      await db.query(
        `INSERT INTO inventory_movements (item_id, movement_type, quantity, reference, notes, created_by)
         VALUES (@p0, 'out', @p1, @p2, @p3, @p4)`,
        [
          { name: 'p0', type: 'int', value: ing.product_id },
          { name: 'p1', type: 'float', value: usedQty },
          { name: 'p2', type: 'nvarchar', value: reference },
          { name: 'p3', type: 'nvarchar', value: `Recipe production: ${ing.product_name}` },
          { name: 'p4', type: 'int', value: auth.userId ?? 0 },
        ]
      );
    }
  }

  // Record production
  await db.query(
    `INSERT INTO recipes_production (recipe_id, batch_qty, produced_qty, produced_by, notes)
     VALUES (@p0, @p1, @p2, @p3, @p4)`,
    [
      { name: 'p0', type: 'int', value: d.recipeId },
      { name: 'p1', type: 'float', value: d.batchQty },
      { name: 'p2', type: 'float', value: d.producedQty },
      { name: 'p3', type: 'int', value: auth.userId ?? 0 },
      { name: 'p4', type: 'nvarchar', value: d.notes ?? '' },
    ]
  );

  return Response.json({
    ok: true,
    reference,
    produced: d.producedQty,
    ingredientsUsed,
  }, { status: 201 });
}
