import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const SapRecordSchema = z.object({
  matnr: z.string().max(50),
  maktx: z.string().max(200).optional(),
  werks: z.string().max(10).optional(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  menge: z.number(),
  meins: z.string().max(10).optional(),
  percido: z.number().optional(),
  euro: z.number().optional(),
});

const SapBatchSchema = z.object({
  source: z.enum(['idoc', 'webhook', 'manual']).optional(),
  records: z.array(SapRecordSchema).min(1).max(5000),
});

// POST /api/modules/lac-napi-perces/sap-receive — batch import SAP production data
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'lac-napi-perces.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json() as unknown;
  const parsed = SapBatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { source, records } = parsed.data;

  try {
    const db = getDb();
    let insertedCount = 0;
    let skippedCount = 0;

    for (const rec of records) {
      // Check duplicate (same material + date)
      const existing = await db.query<{ id: number }>(
        `SELECT TOP 1 id FROM sap_visszajelentes
         WHERE Matnr = @p0 AND Datum = @p1`,
        [
          { name: 'p0', type: 'nvarchar', value: rec.matnr },
          { name: 'p1', type: 'nvarchar', value: rec.datum },
        ]
      );

      if (existing.length > 0) {
        // Update existing
        await db.execute(
          `UPDATE sap_visszajelentes SET Menge = @p0, PercIdo = @p1, Euro = @p2
           WHERE Matnr = @p3 AND Datum = @p4`,
          [
            { name: 'p0', type: 'nvarchar', value: rec.menge },
            { name: 'p1', type: 'nvarchar', value: rec.percido ?? null },
            { name: 'p2', type: 'nvarchar', value: rec.euro ?? null },
            { name: 'p3', type: 'nvarchar', value: rec.matnr },
            { name: 'p4', type: 'nvarchar', value: rec.datum },
          ]
        );
        skippedCount++;
      } else {
        await db.execute(
          `INSERT INTO sap_visszajelentes (Matnr, Maktx, Werks, Datum, Menge, Meins, PercIdo, Euro)
           VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)`,
          [
            { name: 'p0', type: 'nvarchar', value: rec.matnr },
            { name: 'p1', type: 'nvarchar', value: rec.maktx ?? null },
            { name: 'p2', type: 'nvarchar', value: rec.werks ?? null },
            { name: 'p3', type: 'nvarchar', value: rec.datum },
            { name: 'p4', type: 'nvarchar', value: rec.menge },
            { name: 'p5', type: 'nvarchar', value: rec.meins ?? 'ST' },
            { name: 'p6', type: 'nvarchar', value: rec.percido ?? null },
            { name: 'p7', type: 'nvarchar', value: rec.euro ?? null },
          ]
        );
        insertedCount++;
      }
    }

    console.log(`[SAP Receive] source=${source ?? 'unknown'}, inserted=${insertedCount}, updated=${skippedCount}`);

    return Response.json({
      ok: true,
      source: source ?? 'unknown',
      total: records.length,
      inserted: insertedCount,
      updated: skippedCount,
    }, { status: 201 });
  } catch (err) {
    console.error('[SAP Receive] POST error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
