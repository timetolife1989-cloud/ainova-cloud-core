/**
 * SAP Szinkronizálás API
 * POST /api/modules/sap-import/sync  — szinkronizálás indítása (stub)
 * GET  /api/modules/sap-import/sync  — szinkronizálás napló lekérése
 *
 * Jelenlegi állapot: ELŐKÉSZÍTVE
 * Az éles szinkronizálóshoz RFC/OData connector aktiválása szükséges.
 * Az API már fogadja a kéréseket, naplózza és visszaküldi az állapotot.
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import type { QueryParam } from '@/lib/db/IDatabase';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  connectionId: z.number().int().positive(),
  sapObject: z.string().min(1).max(100),
  aciTable: z.string().min(1).max(100),
  syncType: z.enum(['full', 'incremental', 'manual']).default('manual'),
  filters: z.record(z.string(), z.string()).optional().default({}),  
  maxRows: z.number().int().min(1).max(100000).optional().default(10000),
});

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const params: QueryParam[] = [
    { name: 'p0', type: 'int' as const, value: limit },
  ];
  let where = '';
  if (connectionId) {
    where = 'WHERE l.connection_id = @p1';
    params.push({ name: 'p1', type: 'int' as const, value: parseInt(connectionId, 10) });
  }

  const rows = await getDb().query(
    `SELECT TOP (@p0) l.id, l.connection_id, c.name AS connection_name,
            l.sync_type, l.sap_object, l.aci_table, l.status,
            l.records_read, l.records_written, l.records_skipped, l.records_error,
            l.error_details, l.started_at, l.finished_at, l.triggered_by,
            DATEDIFF(MILLISECOND, l.started_at, COALESCE(l.finished_at, SYSDATETIME())) AS duration_ms
     FROM mod_sap_sync_log l
     LEFT JOIN mod_sap_connections c ON c.id = l.connection_id
     ${where}
     ORDER BY l.started_at DESC`,
    params
  );

  return Response.json({
    items: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      connectionId: r.connection_id,
      connectionName: r.connection_name,
      syncType: r.sync_type,
      sapObject: r.sap_object,
      aciTable: r.aci_table,
      status: r.status,
      recordsRead: r.records_read,
      recordsWritten: r.records_written,
      recordsSkipped: r.records_skipped,
      recordsError: r.records_error,
      errorDetails: r.error_details,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      durationMs: r.duration_ms,
      triggeredBy: r.triggered_by,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.sync');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = SyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'error.validation', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // Napló bejegyzés létrehozása
  const logResult = await getDb().query(
    `INSERT INTO mod_sap_sync_log
       (connection_id, sync_type, sap_object, aci_table, status, triggered_by)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, 'running', @p4)`,
    [
      { name: 'p0', type: 'int', value: d.connectionId },
      { name: 'p1', type: 'nvarchar', value: d.syncType },
      { name: 'p2', type: 'nvarchar', value: d.sapObject },
      { name: 'p3', type: 'nvarchar', value: d.aciTable },
      { name: 'p4', type: 'nvarchar', value: 'api' },
    ]
  );

  const logId = (logResult[0] as Record<string, number>)?.id;

  // TODO: Éles szinkronizálás
  // 1. Kapcsolat config betöltése: mod_sap_connections WHERE id = connectionId
  // 2. Connector példányosítása: createSapConnector(config)
  // 3. Mező mappingek betöltése: mod_sap_field_mappings WHERE connection_id AND sap_object
  // 4. connector.syncTable({ connectionId, sapObject, aciTable, syncType, filters, maxRows })
  // 5. Napló frissítése eredménnyel

  // Napló lezárása (stub státuszsal)
  await getDb().query(
    `UPDATE mod_sap_sync_log SET
       status = 'error',
       error_details = @p0,
       finished_at = SYSDATETIME()
     WHERE id = @p1`,
    [
      {
        name: 'p0',
        type: 'nvarchar',
        value: 'SAP connector prepared — RFC/OData activation required for live sync',
      },
      { name: 'p1', type: 'int', value: logId },
    ]
  );

  return Response.json(
    {
      logId,
      status: 'prepared',
      message: 'SAP sync prepared. RFC/OData connection configuration required.',
      nextSteps: [
        'RFC: npm install node-rfc + SAP NetWeaver RFC SDK installation',
        'OData: SAP BTP baseUrl and auth credentials setup',
        'Field mapping configuration: /api/modules/sap-import/mappings',
      ],
    },
    { status: 202 }
  );
}
