import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface DailyTargetRow {
  id: number;
  datum: string;
  perc_cel: number;
}

interface WeeklyTargetRow {
  id: number;
  ev: number;
  het: number;
  perc_cel: number;
}

// GET /api/modules/lac-napi-perces/targets?type=daily|weekly&months=3
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'lac-napi-perces.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'daily';
  const months = parseInt(searchParams.get('months') ?? '3', 10);

  try {
    const db = getDb();

    if (type === 'weekly') {
      const rows = await db.query<WeeklyTargetRow>(
        `SELECT id, ev, het, perc_cel FROM ainova_targets_weekly ORDER BY ev DESC, het DESC`
      );
      return Response.json({
        type: 'weekly',
        targets: rows.map(r => ({ id: r.id, year: r.ev, week: r.het, targetMinutes: Number(r.perc_cel) })),
      });
    }

    // daily
    const rows = await db.query<DailyTargetRow>(
      `SELECT id, FORMAT(datum, 'yyyy-MM-dd') AS datum, perc_cel
       FROM ainova_targets_daily
       WHERE datum >= DATEADD(MONTH, @p0, GETDATE())
       ORDER BY datum DESC`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    return Response.json({
      type: 'daily',
      targets: rows.map(r => ({ id: r.id, date: r.datum, targetMinutes: Number(r.perc_cel) })),
    });
  } catch (err) {
    console.error('[LAC Targets] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const DailySchema = z.object({
  type: z.literal('daily'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetMinutes: z.number().min(0),
});

const WeeklySchema = z.object({
  type: z.literal('weekly'),
  year: z.number().min(2020).max(2100),
  week: z.number().min(1).max(53),
  targetMinutes: z.number().min(0),
});

const CreateSchema = z.discriminatedUnion('type', [DailySchema, WeeklySchema]);

// POST /api/modules/lac-napi-perces/targets
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'lac-napi-perces.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  try {
    const db = getDb();

    if (parsed.data.type === 'weekly') {
      const { year, week, targetMinutes } = parsed.data;
      // MERGE (upsert)
      await db.execute(
        `MERGE ainova_targets_weekly AS t
         USING (SELECT @p0 AS ev, @p1 AS het) AS s ON t.ev = s.ev AND t.het = s.het
         WHEN MATCHED THEN UPDATE SET perc_cel = @p2
         WHEN NOT MATCHED THEN INSERT (ev, het, perc_cel) VALUES (@p0, @p1, @p2);`,
        [
          { name: 'p0', type: 'int', value: year },
          { name: 'p1', type: 'int', value: week },
          { name: 'p2', type: 'int', value: targetMinutes },
        ]
      );
      return Response.json({ ok: true }, { status: 201 });
    }

    // daily
    const { date, targetMinutes } = parsed.data;
    await db.execute(
      `MERGE ainova_targets_daily AS t
       USING (SELECT @p0 AS datum) AS s ON t.datum = s.datum
       WHEN MATCHED THEN UPDATE SET perc_cel = @p1
       WHEN NOT MATCHED THEN INSERT (datum, perc_cel) VALUES (@p0, @p1);`,
      [
        { name: 'p0', type: 'nvarchar', value: date },
        { name: 'p1', type: 'int', value: targetMinutes },
      ]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[LAC Targets] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
