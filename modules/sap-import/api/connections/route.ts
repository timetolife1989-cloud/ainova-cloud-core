/**
 * SAP Kapcsolat konfigurációk CRUD
 * GET /api/modules/sap-import/connections
 * POST /api/modules/sap-import/connections
 * DELETE /api/modules/sap-import/connections?id=X
 * POST /api/modules/sap-import/connections?action=test&id=X
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import { createSapConnector } from '@/lib/connectors/sap/interface';

const CreateConnectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().default(''),
  connectionType: z.enum(['rfc', 'odata', 'file']).default('rfc'),
  // RFC params
  host: z.string().max(200).optional().default(''),
  sysnr: z.string().max(5).optional().default('00'),
  client: z.string().max(5).optional().default('100'),
  sapUser: z.string().max(100).optional().default(''),
  passwordRef: z.string().max(200).optional().default(''), // env kulcs hivatkozás, NEM a jelszó
  language: z.string().max(5).optional().default('HU'),
  // OData params
  baseUrl: z.string().max(500).optional().default(''),
  apiPath: z.string().max(200).optional().default(''),
});

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.view');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query(
    `SELECT id, name, description, connection_type, host, sysnr, client, sap_user,
            password_ref, language, base_url, api_path,
            is_active, last_tested_at, last_test_ok, last_error, created_at
     FROM mod_sap_connections ORDER BY name`,
    []
  );

  return Response.json({
    items: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      connectionType: r.connection_type,
      host: r.host,
      sysnr: r.sysnr,
      client: r.client,
      sapUser: r.sap_user,
      passwordRef: r.password_ref,
      language: r.language,
      baseUrl: r.base_url,
      apiPath: r.api_path,
      isActive: !!r.is_active,
      lastTestedAt: r.last_tested_at,
      lastTestOk: !!r.last_test_ok,
      lastError: r.last_error,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Kapcsolat tesztelése
  if (action === 'test') {
    const auth = await checkAuth(request, 'sap-import.edit');
    if (!auth.valid) return auth.response;

    const id = parseInt(searchParams.get('id') ?? '0', 10);
    if (!id) return Response.json({ error: 'api.error.missing_id' }, { status: 400 });

    const rows = await getDb().query(
      'SELECT * FROM mod_sap_connections WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: id }]
    );
    if (!rows.length) return Response.json({ error: 'error.not_found' }, { status: 404 });

    const row = rows[0] as Record<string, unknown>;
    const connector = createSapConnector({
      id: row.id as number,
      name: row.name as string,
      connectionType: row.connection_type as 'rfc' | 'odata' | 'file',
      host: row.host as string,
      sysnr: row.sysnr as string,
      client: row.client as string,
      sapUser: row.sap_user as string,
      passwordRef: row.password_ref as string,
      language: row.language as string,
      baseUrl: row.base_url as string,
      apiPath: row.api_path as string,
    });

    const result = await connector.testConnection();

    // Eredmény mentése
    await getDb().query(
      `UPDATE mod_sap_connections
       SET last_tested_at = SYSDATETIME(), last_test_ok = @p0, last_error = @p1
       WHERE id = @p2`,
      [
        { name: 'p0', type: 'bit', value: result.ok },
        { name: 'p1', type: 'nvarchar', value: result.message },
        { name: 'p2', type: 'int', value: id },
      ]
    );

    return Response.json({ ok: result.ok, message: result.message });
  }

  // Új kapcsolat létrehozása
  const auth = await checkAuth(request, 'sap-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = CreateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'error.validation', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const result = await getDb().query(
    `INSERT INTO mod_sap_connections
       (name, description, connection_type, host, sysnr, client, sap_user, password_ref, language, base_url, api_path)
     OUTPUT INSERTED.id
     VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.name },
      { name: 'p1', type: 'nvarchar', value: d.description },
      { name: 'p2', type: 'nvarchar', value: d.connectionType },
      { name: 'p3', type: 'nvarchar', value: d.host },
      { name: 'p4', type: 'nvarchar', value: d.sysnr },
      { name: 'p5', type: 'nvarchar', value: d.client },
      { name: 'p6', type: 'nvarchar', value: d.sapUser },
      { name: 'p7', type: 'nvarchar', value: d.passwordRef },
      { name: 'p8', type: 'nvarchar', value: d.language },
      { name: 'p9', type: 'nvarchar', value: d.baseUrl },
      { name: 'p10', type: 'nvarchar', value: d.apiPath },
    ]
  );

  return Response.json({ id: result[0]?.id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const id = parseInt(new URL(request.url).searchParams.get('id') ?? '0', 10);
  if (!id) return Response.json({ error: 'api.error.missing_id' }, { status: 400 });

  await getDb().query(
    'DELETE FROM mod_sap_connections WHERE id = @p0',
    [{ name: 'p0', type: 'int', value: id }]
  );

  return Response.json({ deleted: true });
}
