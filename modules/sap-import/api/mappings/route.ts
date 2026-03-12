/**
 * SAP Mező-mapping szabályok CRUD
 * GET /api/modules/sap-import/mappings?connectionId=X
 * POST /api/modules/sap-import/mappings
 * PUT /api/modules/sap-import/mappings?id=X
 * DELETE /api/modules/sap-import/mappings?id=X
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import type { QueryParam } from '@/lib/db/IDatabase';
import { z } from 'zod';

const MappingSchema = z.object({
  connectionId: z.number().int().positive(),
  mappingName: z.string().min(1).max(200),
  sapObject: z.string().min(1).max(100),
  sapField: z.string().min(1).max(100),
  aciTable: z.string().min(1).max(100),
  aciField: z.string().min(1).max(100),
  transformType: z.enum(['direct', 'trim', 'upper', 'lower', 'number', 'date', 'lookup', 'formula']).default('direct'),
  transformRule: z.string().max(500).optional().default(''),
  defaultValue: z.string().max(200).optional().default(''),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  const params: QueryParam[] = [];
  let where = '';
  if (connectionId) {
    where = 'WHERE m.connection_id = @p0';
    params.push({ name: 'p0', type: 'int' as const, value: parseInt(connectionId, 10) });
  }

  const rows = await getDb().query(
    `SELECT m.id, m.connection_id, c.name AS connection_name,
            m.mapping_name, m.sap_object, m.sap_field,
            m.aci_table, m.aci_field,
            m.transform_type, m.transform_rule, m.default_value,
            m.is_active, m.created_at
     FROM mod_sap_field_mappings m
     LEFT JOIN mod_sap_connections c ON c.id = m.connection_id
     ${where}
     ORDER BY m.sap_object, m.sap_field`,
    params
  );

  return Response.json({
    items: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      connectionId: r.connection_id,
      connectionName: r.connection_name,
      mappingName: r.mapping_name,
      sapObject: r.sap_object,
      sapField: r.sap_field,
      aciTable: r.aci_table,
      aciField: r.aci_field,
      transformType: r.transform_type,
      transformRule: r.transform_rule,
      defaultValue: r.default_value,
      isActive: !!r.is_active,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = MappingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Érvénytelen adat', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const result = await getDb().query(
    `INSERT INTO mod_sap_field_mappings
       (connection_id, mapping_name, sap_object, sap_field, aci_table, aci_field,
        transform_type, transform_rule, default_value, is_active)
     OUTPUT INSERTED.id
     VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9)`,
    [
      { name: 'p0', type: 'int', value: d.connectionId },
      { name: 'p1', type: 'nvarchar', value: d.mappingName },
      { name: 'p2', type: 'nvarchar', value: d.sapObject },
      { name: 'p3', type: 'nvarchar', value: d.sapField },
      { name: 'p4', type: 'nvarchar', value: d.aciTable },
      { name: 'p5', type: 'nvarchar', value: d.aciField },
      { name: 'p6', type: 'nvarchar', value: d.transformType },
      { name: 'p7', type: 'nvarchar', value: d.transformRule },
      { name: 'p8', type: 'nvarchar', value: d.defaultValue },
      { name: 'p9', type: 'bit', value: d.isActive },
    ]
  );

  return Response.json({ id: result[0]?.id }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const id = parseInt(new URL(request.url).searchParams.get('id') ?? '0', 10);
  if (!id) return Response.json({ error: 'Hiányzó id' }, { status: 400 });

  const body = await request.json();
  const parsed = MappingSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Érvénytelen adat', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  await getDb().query(
    `UPDATE mod_sap_field_mappings SET
       mapping_name = COALESCE(@p0, mapping_name),
       sap_object = COALESCE(@p1, sap_object),
       sap_field = COALESCE(@p2, sap_field),
       aci_table = COALESCE(@p3, aci_table),
       aci_field = COALESCE(@p4, aci_field),
       transform_type = COALESCE(@p5, transform_type),
       is_active = COALESCE(@p6, is_active)
     WHERE id = @p7`,
    [
      { name: 'p0', type: 'nvarchar', value: d.mappingName ?? null },
      { name: 'p1', type: 'nvarchar', value: d.sapObject ?? null },
      { name: 'p2', type: 'nvarchar', value: d.sapField ?? null },
      { name: 'p3', type: 'nvarchar', value: d.aciTable ?? null },
      { name: 'p4', type: 'nvarchar', value: d.aciField ?? null },
      { name: 'p5', type: 'nvarchar', value: d.transformType ?? null },
      { name: 'p6', type: 'bit', value: d.isActive ?? null },
      { name: 'p7', type: 'int', value: id },
    ]
  );

  return Response.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const id = parseInt(new URL(request.url).searchParams.get('id') ?? '0', 10);
  if (!id) return Response.json({ error: 'Hiányzó id' }, { status: 400 });

  await getDb().query(
    'DELETE FROM mod_sap_field_mappings WHERE id = @p0',
    [{ name: 'p0', type: 'int', value: id }]
  );

  return Response.json({ deleted: true });
}
