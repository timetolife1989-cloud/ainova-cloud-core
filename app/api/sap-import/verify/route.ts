// =====================================================
// AINOVA - SAP Import Státusz API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/getPool';
import { checkSession, ApiErrors } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const pool = await getPool();

    const counts = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM sap_visszajelentes) as visszajelentes_db,
        (SELECT 0) as anyagmozgas_db,
        (SELECT COUNT(*) FROM termek_normak) as normaido_db,
        (SELECT 0) as csatorna_db,
        (SELECT 0) as heti_igeny_db,
        (SELECT MIN(vegrehajtas_datum) FROM sap_visszajelentes) as visszajel_min_datum,
        (SELECT MAX(vegrehajtas_datum) FROM sap_visszajelentes) as visszajel_max_datum
    `);

    // Import history
    const imports = await pool.request().query(`
      SELECT 
        'visszajelentes' as import_type,
        MAX(imported_at) as utolso_import,
        COUNT(*) as ossz_sor,
        1 as import_db
      FROM sap_visszajelentes
      WHERE imported_at IS NOT NULL
      UNION ALL
      SELECT 
        'munkaterv' as import_type,
        MAX(imported_at) as utolso_import,
        COUNT(*) as ossz_sor,
        1 as import_db
      FROM sap_munkaterv
      WHERE imported_at IS NOT NULL
    `);

    return NextResponse.json({
      success: true,
      data: {
        counts: counts.recordset[0],
        imports: imports.recordset.filter(r => r.ossz_sor > 0),
      },
    });

  } catch (error) {
    return ApiErrors.internal(error, 'SAP Import Verify');
  }
}
