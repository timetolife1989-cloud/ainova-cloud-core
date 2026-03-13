// =====================================================
// AINOVA - Napi Perces Kimutatás API (v5 - SQL View v5)
// =====================================================
// Architektúra: SQL számol, API olvas, Frontend megjelenít.
// A v_napi_perces view napi 1 sort ad (nem műszakonként).
// Minden aggregáció a view-ban történik.
// Cél perc: view-ból jön (ainova_targets_weekly heti/5).
// Műszak: DE/DU/ÉJ idő alapú, csapat annotáció AinovaShiftSchedule-ből.
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db/getPool';
import { checkSession, ApiErrors } from '@/lib/api-utils';

export const runtime = 'nodejs';

// =====================================================
// GET - Adatok lekérése (v_napi_perces view-ból)
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'napi';
    const offset = parseInt(searchParams.get('offset') || '0');

    const pool = await getPool();

    let result;

    switch (type) {
      case 'napi': {
        const napiPageSize = 20;
        result = await pool.request()
          .input('offset', sql.Int, offset)
          .input('pageSize', sql.Int, napiPageSize)
          .query(`
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));

            WITH AllDates AS (
              SELECT DISTINCT datum FROM v_napi_perces WHERE datum <= @Yesterday
            ),
            TotalDays AS (SELECT COUNT(*) AS cnt FROM AllDates),
            DateRange AS (
              SELECT datum FROM AllDates
              ORDER BY datum DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            ),
            WarRoomSum AS (
              SELECT 
                CONVERT(DATE, Datum) AS datum,
                SUM(ISNULL(ElmeletiLetszam, 0)) AS lejelentett_fo
              FROM WarRoomLetszam
              GROUP BY CONVERT(DATE, Datum)
            )
            SELECT 
              FORMAT(p.datum, 'MM.dd', 'hu-HU') AS datum_label, 
              p.datum,
              DATENAME(WEEKDAY, p.datum) AS nap_nev,
              -- Cél (view-ból, ainova_targets_weekly heti/5)
              CAST(ISNULL(p.cel_perc, 0) AS INT) AS cel_perc,
              0 AS cel_szamitott,
              ISNULL(w.lejelentett_fo, 0) AS lejelentett_fo,
              -- Lehívott
              CAST(ISNULL(p.lehivott_siemens, 0) AS FLOAT) AS lehivott_siemens_dc,
              CAST(ISNULL(p.lehivott_no_siemens, 0) AS FLOAT) AS lehivott_no_siemens,
              CAST(ISNULL(p.lehivott_el_tekercses, 0) AS FLOAT) AS lehivott_el_tekercses,
              CAST(ISNULL(p.lehivott_ossz, 0) AS FLOAT) AS lehivott_ossz,
              CAST(ISNULL(p.lehivott_euro, 0) AS FLOAT) AS lehivott_euro,
              -- Leadott
              CAST(ISNULL(p.leadott_siemens, 0) AS FLOAT) AS leadott_siemens_dc,
              CAST(ISNULL(p.leadott_no_siemens, 0) AS FLOAT) AS leadott_no_siemens,
              CAST(ISNULL(p.leadott_el_tekercses, 0) AS FLOAT) AS leadott_el_tekercses,
              CAST(ISNULL(p.leadott_utomunka, 0) AS FLOAT) AS leadott_utomunka,
              CAST(ISNULL(p.leadott_ossz, 0) AS FLOAT) AS leadott_ossz,
              CAST(ISNULL(p.leadott_euro, 0) AS FLOAT) AS leadott_euro,
              -- Műszak bontás (DE/DU/ÉJ idő alapú + csapat annotáció)
              CAST(ISNULL(p.leadott_de, 0) AS FLOAT) AS leadott_de,
              CAST(ISNULL(p.leadott_du, 0) AS FLOAT) AS leadott_du,
              CAST(ISNULL(p.leadott_ej, 0) AS FLOAT) AS leadott_ej,
              p.de_csapat,
              p.du_csapat,
              p.ej_csapat,
              -- Százalékok
              CASE WHEN ISNULL(p.cel_perc, 0) > 0 
                THEN CAST(p.lehivott_ossz AS FLOAT) / p.cel_perc * 100 ELSE 0 
              END AS lehivas_szazalek,
              CASE WHEN ISNULL(p.cel_perc, 0) > 0 
                THEN CAST(p.leadott_ossz AS FLOAT) / p.cel_perc * 100 ELSE 0 
              END AS leadas_szazalek,
              (SELECT cnt FROM TotalDays) AS total_days
            FROM v_napi_perces p
            INNER JOIN DateRange dr ON p.datum = dr.datum
            LEFT JOIN WarRoomSum w ON p.datum = w.datum
            ORDER BY p.datum ASC
          `);
        break;
      }

      case 'heti': {
        const hetiPageSize = 12;
        result = await pool.request()
          .input('offset', sql.Int, offset)
          .input('pageSize', sql.Int, hetiPageSize)
          .query(`
            SET DATEFIRST 1;
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
            
            WITH BaseData AS (
              SELECT 
                p.*,
                CAST(DATEPART(YEAR, DATEADD(DAY, 3 - (DATEPART(dw, p.datum) + @@DATEFIRST - 2) % 7, p.datum)) AS VARCHAR) + '/' + 
                RIGHT('0' + CAST(DATEPART(ISO_WEEK, p.datum) AS VARCHAR), 2) AS week_key
              FROM v_napi_perces p
              WHERE p.datum <= @Yesterday
            ),
            AllWeeks AS (SELECT DISTINCT week_key FROM BaseData),
            TotalWeeks AS (SELECT COUNT(*) AS cnt FROM AllWeeks),
            WeekRange AS (SELECT week_key, ROW_NUMBER() OVER (ORDER BY week_key DESC) AS rn FROM AllWeeks),
            SelectedWeeks AS (SELECT week_key FROM WeekRange WHERE rn > @offset AND rn <= @offset + @pageSize)
            SELECT 
              b.week_key AS datum_label,
              MIN(b.datum) AS het_eleje, MAX(b.datum) AS het_vege,
              COUNT(*) AS munkanapok, 
              CAST(SUM(ISNULL(b.cel_perc, 0)) AS FLOAT) AS cel_perc, 
              -- Lehívott
              CAST(SUM(ISNULL(b.lehivott_siemens, 0)) AS FLOAT) AS lehivott_siemens_dc, 
              CAST(SUM(ISNULL(b.lehivott_no_siemens, 0)) AS FLOAT) AS lehivott_no_siemens, 
              CAST(SUM(ISNULL(b.lehivott_el_tekercses, 0)) AS FLOAT) AS lehivott_el_tekercses,
              CAST(SUM(ISNULL(b.lehivott_ossz, 0)) AS FLOAT) AS lehivott_ossz, 
              CAST(SUM(ISNULL(b.lehivott_euro, 0)) AS FLOAT) AS lehivott_euro,
              -- Leadott
              CAST(SUM(ISNULL(b.leadott_siemens, 0)) AS FLOAT) AS leadott_siemens_dc, 
              CAST(SUM(ISNULL(b.leadott_no_siemens, 0)) AS FLOAT) AS leadott_no_siemens, 
              CAST(SUM(ISNULL(b.leadott_el_tekercses, 0)) AS FLOAT) AS leadott_el_tekercses, 
              CAST(SUM(ISNULL(b.leadott_utomunka, 0)) AS FLOAT) AS leadott_utomunka, 
              CAST(SUM(ISNULL(b.leadott_ossz, 0)) AS FLOAT) AS leadott_ossz, 
              CAST(SUM(ISNULL(b.leadott_euro, 0)) AS FLOAT) AS leadott_euro,
              -- Műszak bontás
              CAST(SUM(ISNULL(b.leadott_de, 0)) AS FLOAT) AS leadott_de,
              CAST(SUM(ISNULL(b.leadott_du, 0)) AS FLOAT) AS leadott_du,
              CAST(SUM(ISNULL(b.leadott_ej, 0)) AS FLOAT) AS leadott_ej,
              -- Százalékok
              CASE WHEN SUM(ISNULL(b.cel_perc, 0)) > 0 THEN CAST(SUM(b.lehivott_ossz) AS FLOAT) / SUM(b.cel_perc) * 100 ELSE 0 END AS lehivas_szazalek,
              CASE WHEN SUM(ISNULL(b.cel_perc, 0)) > 0 THEN CAST(SUM(b.leadott_ossz) AS FLOAT) / SUM(b.cel_perc) * 100 ELSE 0 END AS leadas_szazalek,
              (SELECT cnt FROM TotalWeeks) AS total_weeks
            FROM BaseData b
            INNER JOIN SelectedWeeks sw ON b.week_key = sw.week_key
            GROUP BY b.week_key
            ORDER BY b.week_key ASC
          `);
        break;
      }

      case 'havi': {
        result = await pool.request()
          .query(`
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
            
            WITH BaseData AS (
              SELECT 
                p.*,
                FORMAT(p.datum, 'yyyy/MM') AS month_key,
                FORMAT(p.datum, 'yyyy. MMM', 'hu-HU') AS month_label
              FROM v_napi_perces p
              WHERE p.datum <= @Yesterday
            ),
            MonthRange AS (SELECT DISTINCT month_key, month_label FROM BaseData),
            Last12Months AS (SELECT TOP 12 month_key FROM MonthRange ORDER BY month_key DESC)
            SELECT 
              b.month_label AS datum_label,
              CAST(SUM(ISNULL(b.cel_perc, 0)) AS FLOAT) AS cel_perc, 
              -- Lehívott
              CAST(SUM(ISNULL(b.lehivott_siemens, 0)) AS FLOAT) AS lehivott_siemens_dc, 
              CAST(SUM(ISNULL(b.lehivott_no_siemens, 0)) AS FLOAT) AS lehivott_no_siemens, 
              CAST(SUM(ISNULL(b.lehivott_el_tekercses, 0)) AS FLOAT) AS lehivott_el_tekercses,
              CAST(SUM(ISNULL(b.lehivott_ossz, 0)) AS FLOAT) AS lehivott_ossz, 
              CAST(SUM(ISNULL(b.lehivott_euro, 0)) AS FLOAT) AS lehivott_euro,
              -- Leadott
              CAST(SUM(ISNULL(b.leadott_siemens, 0)) AS FLOAT) AS leadott_siemens_dc, 
              CAST(SUM(ISNULL(b.leadott_no_siemens, 0)) AS FLOAT) AS leadott_no_siemens, 
              CAST(SUM(ISNULL(b.leadott_el_tekercses, 0)) AS FLOAT) AS leadott_el_tekercses, 
              CAST(SUM(ISNULL(b.leadott_utomunka, 0)) AS FLOAT) AS leadott_utomunka, 
              CAST(SUM(ISNULL(b.leadott_ossz, 0)) AS FLOAT) AS leadott_ossz, 
              CAST(SUM(ISNULL(b.leadott_euro, 0)) AS FLOAT) AS leadott_euro,
              -- Műszak bontás
              CAST(SUM(ISNULL(b.leadott_de, 0)) AS FLOAT) AS leadott_de,
              CAST(SUM(ISNULL(b.leadott_du, 0)) AS FLOAT) AS leadott_du,
              CAST(SUM(ISNULL(b.leadott_ej, 0)) AS FLOAT) AS leadott_ej,
              -- Százalékok
              CASE WHEN SUM(ISNULL(b.cel_perc, 0)) > 0 THEN CAST(SUM(b.lehivott_ossz) AS FLOAT) / SUM(b.cel_perc) * 100 ELSE 0 END AS lehivas_szazalek,
              CASE WHEN SUM(ISNULL(b.cel_perc, 0)) > 0 THEN CAST(SUM(b.leadott_ossz) AS FLOAT) / SUM(b.cel_perc) * 100 ELSE 0 END AS leadas_szazalek,
              12 AS total_months
            FROM BaseData b
            INNER JOIN Last12Months lm ON b.month_key = lm.month_key
            GROUP BY b.month_key, b.month_label
            ORDER BY b.month_key ASC
          `);
        break;
      }

      default:
        return ApiErrors.badRequest('api.error.invalid_type');
    }

    return NextResponse.json({ success: true, type, data: result.recordset });

  } catch (error) {
    return ApiErrors.internal(error, 'Napi Perces API');
  }
}
