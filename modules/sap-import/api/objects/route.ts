/**
 * SAP Objektum katalógus API
 * GET /api/modules/sap-import/objects?category=MM&search=MAR
 *
 * Az ACI beépített SAP tudástár — MARA, VBAK, AUFK stb. lekérése.
 * Szűrés kategóriára (MM/SD/PP/PM/HR/FI), típusra (TABLE/BAPI) és keresőszóra.
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import type { QueryParam } from '@/lib/db/IDatabase';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'sap-import.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? '';
  const objectType = searchParams.get('type') ?? '';
  const search = (searchParams.get('search') ?? '').trim();
  const aciModule = searchParams.get('module') ?? '';

  const conditions: string[] = [];
  const params: QueryParam[] = [];
  let pi = 0;

  if (category) {
    conditions.push(`category = @p${pi}`);
    params.push({ name: `p${pi++}`, type: 'nvarchar' as const, value: category });
  }
  if (objectType) {
    conditions.push(`object_type = @p${pi}`);
    params.push({ name: `p${pi++}`, type: 'nvarchar' as const, value: objectType });
  }
  if (aciModule) {
    conditions.push(`aci_module = @p${pi}`);
    params.push({ name: `p${pi++}`, type: 'nvarchar' as const, value: aciModule });
  }
  if (search) {
    conditions.push(`(sap_name LIKE @p${pi} OR description_hu LIKE @p${pi} OR description_en LIKE @p${pi})`);
    params.push({ name: `p${pi++}`, type: 'nvarchar' as const, value: `%${search}%` });
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await getDb().query(
    `SELECT id, category, object_type, sap_name, description_hu, description_en, description_de,
            key_fields, typical_join, aci_module, notes, is_builtin
     FROM mod_sap_objects ${where}
     ORDER BY category, object_type DESC, sap_name`,
    params
  );

  // Kategória összefoglaló számlálók
  const countRows = await getDb().query(
    'SELECT category, COUNT(*) AS cnt FROM mod_sap_objects GROUP BY category',
    []
  );

  return Response.json({
    items: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      category: r.category,
      objectType: r.object_type,
      sapName: r.sap_name,
      descriptionHu: r.description_hu,
      descriptionEn: r.description_en,
      descriptionDe: r.description_de,
      keyFields: r.key_fields ? String(r.key_fields).split(',').map((f: string) => f.trim()) : [],
      typicalJoin: r.typical_join,
      aciModule: r.aci_module,
      notes: r.notes,
      isBuiltin: !!r.is_builtin,
    })),
    categoryCounts: Object.fromEntries(
      (countRows as Record<string, unknown>[]).map(r => [r.category, r.cnt])
    ),
  });
}
