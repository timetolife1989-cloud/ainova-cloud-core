import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAllUnitsAdmin, clearUnitCache } from '@/lib/units';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET /api/admin/units — összes unit (aktív + inaktív)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.view');
  if (!auth.valid) return auth.response;

  const units = await getAllUnitsAdmin();
  return Response.json({ units });
}

const CreateUnitSchema = z.object({
  unitCode: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/i),
  unitLabel: z.string().min(1).max(100),
  unitType: z.enum(['time', 'count', 'weight', 'currency', 'ratio', 'length', 'volume', 'distance', 'custom']),
  symbol: z.string().max(20).optional(),
  decimals: z.number().int().min(0).max(6).optional(),
});

// POST /api/admin/units — új unit
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateUnitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { unitCode, unitLabel, unitType, symbol, decimals } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO core_units (unit_code, unit_label, unit_type, symbol, decimals, is_builtin)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, 0)`,
      [
        { name: 'p0', type: 'nvarchar', value: unitCode },
        { name: 'p1', type: 'nvarchar', value: unitLabel },
        { name: 'p2', type: 'nvarchar', value: unitType },
        { name: 'p3', type: 'nvarchar', value: symbol ?? null },
        { name: 'p4', type: 'int', value: decimals ?? 2 },
      ]
    );

    clearUnitCache();
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Units API] Create error:', err);
    return Response.json({ error: 'Hiba a mértékegység létrehozásakor' }, { status: 500 });
  }
}

const UpdateUnitSchema = z.object({
  id: z.number().int().positive(),
  unitLabel: z.string().min(1).max(100).optional(),
  symbol: z.string().max(20).optional(),
  decimals: z.number().int().min(0).max(6).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/units — unit módosítás
export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = UpdateUnitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { id, unitLabel, symbol, decimals, isActive } = parsed.data;

  try {
    const updates: string[] = [];
    const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'bit'; value: unknown }> = [
      { name: 'id', type: 'int', value: id },
    ];
    let paramIdx = 0;

    if (unitLabel !== undefined) {
      updates.push(`unit_label = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: unitLabel });
      paramIdx++;
    }
    if (symbol !== undefined) {
      updates.push(`symbol = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: symbol });
      paramIdx++;
    }
    if (decimals !== undefined) {
      updates.push(`decimals = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'int', value: decimals });
      paramIdx++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'bit', value: isActive ? 1 : 0 });
      paramIdx++;
    }

    if (updates.length > 0) {
      await getDb().query(
        `UPDATE core_units SET ${updates.join(', ')} WHERE id = @id`,
        params
      );
    }

    clearUnitCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Units API] Update error:', err);
    return Response.json({ error: 'Hiba a mértékegység módosításakor' }, { status: 500 });
  }
}

const DeleteUnitSchema = z.object({
  id: z.number().int().positive(),
});

// DELETE /api/admin/units — unit törlés
export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = DeleteUnitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Érvénytelen adatok' }, { status: 400 });
  }

  const { id } = parsed.data;

  try {
    // Check if builtin
    const units = await getDb().query<{ is_builtin: boolean }>(
      'SELECT is_builtin FROM core_units WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );

    if (units.length === 0) {
      return Response.json({ error: 'Mértékegység nem található' }, { status: 404 });
    }

    if (units[0].is_builtin) {
      return Response.json({ error: 'Beépített mértékegység nem törölhető' }, { status: 403 });
    }

    await getDb().query(
      'DELETE FROM core_units WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );

    clearUnitCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Units API] Delete error:', err);
    return Response.json({ error: 'Hiba a mértékegység törlésekor' }, { status: 500 });
  }
}
