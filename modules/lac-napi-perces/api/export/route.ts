// =====================================================
// AINOVA - Napi Perces Excel Export API
// =====================================================
// Purpose: Teljes Napi Perces kimutatás export (3 fül: Napi, Heti, Havi)
// Tartalmazza: célok, műszak bontás, lehívás, leszállítás, teljesítmény
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db/getPool';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import * as ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// =====================================================
// Stílusok
// =====================================================
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' }
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11
};

const SUM_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2D5A3D' }
};

const ERROR_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFF6B6B' }
};

const WARNING_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFD93D' }
};

// =====================================================
// GET - Excel letöltés
// =====================================================
export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  try {
    const pool = await getPool();
    
    // Adatok lekérése
    const [napiData, hetiData, haviData] = await Promise.all([
      getNapiData(pool),
      getHetiData(pool),
      getHaviData(pool)
    ]);

    // Excel létrehozása
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AINOVA';
    workbook.created = new Date();

    // Fülek létrehozása
    createNapiSheet(workbook, napiData);
    createHetiSheet(workbook, hetiData);
    createHaviSheet(workbook, haviData);

    // Buffer generálás
    const buffer = await workbook.xlsx.writeBuffer();

    // Fájlnév dátummal
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `napi-perces-kimutatas-${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[Export] Error:', error);
    return ApiErrors.internal(error, 'Export');
  }
}

// =====================================================
// Napi adatok lekérése
// =====================================================
async function getNapiData(pool: sql.ConnectionPool) {
  const result = await pool.request().query(`
    SET DATEFIRST 1;
    
    WITH NapiAggr AS (
      SELECT 
        p.datum,
        MAX(p.leadott_ossz) AS leadott_ossz,
        MAX(p.lehivott_ossz) AS lehivott_ossz,
        0 AS a_muszak,
        0 AS b_muszak,
        0 AS c_muszak
      FROM v_napi_perces p
      WHERE p.datum >= DATEADD(MONTH, -3, GETDATE())
      GROUP BY p.datum
    ),
    WarRoomSum AS (
      SELECT 
        CONVERT(DATE, Datum) AS datum,
        SUM(ISNULL(ElmeletiLetszam, 0)) AS lejelentett_fo
      FROM WarRoomLetszam
      GROUP BY CONVERT(DATE, Datum)
    )
    SELECT 
    FORMAT(n.datum, 'yyyy-MM-dd') AS datum,
    DATENAME(WEEKDAY, n.datum) AS nap_nev,
    DATEPART(ISO_WEEK, n.datum) AS het_szam,
    FORMAT(n.datum, 'yyyy-MM') AS honap,
    
    -- Célok
    28500 AS excel_cel,
    ISNULL(t.perc_cel, 0) AS admin_cel,
    ISNULL(w.lejelentett_fo, 0) * 480 AS letszam_cel,
    CASE 
        WHEN t.perc_cel IS NOT NULL AND t.perc_cel > 0 THEN t.perc_cel
        ELSE 28500
    END AS eff_cel,
    CASE 
        WHEN t.perc_cel IS NOT NULL AND t.perc_cel > 0 THEN 'Admin'
        ELSE 'Default'
    END AS cel_forras,
    
    -- Műszak bontás
    ISNULL(n.a_muszak, 0) AS a_muszak,
    ISNULL(n.b_muszak, 0) AS b_muszak,
    ISNULL(n.c_muszak, 0) AS c_muszak,
    ISNULL(n.a_muszak, 0) + ISNULL(n.b_muszak, 0) + ISNULL(n.c_muszak, 0) AS abc_osszeg,
    
    -- Leadott összesen
    ISNULL(n.leadott_ossz, 0) AS excel_ossz,
    
    -- Eltérés (műszak összeg vs leadott összeg)
    (ISNULL(n.a_muszak, 0) + ISNULL(n.b_muszak, 0) + ISNULL(n.c_muszak, 0)) - ISNULL(n.leadott_ossz, 0) AS elteres,
    
    -- Lehívás
    ISNULL(n.lehivott_ossz, 0) AS lehivott_ossz,
    
    -- Létszám
    ISNULL(w.lejelentett_fo, 0) AS lejelentett_fo
    
    FROM NapiAggr n
    LEFT JOIN WarRoomSum w ON n.datum = w.datum
    LEFT JOIN ainova_targets_daily t ON n.datum = t.datum
    ORDER BY n.datum DESC
  `);
  
  return result.recordset;
}

// =====================================================
// Heti adatok lekérése (aggregált)
// =====================================================
async function getHetiData(pool: sql.ConnectionPool) {
  const result = await pool.request().query(`
    SET DATEFIRST 1;
    
    WITH NapiAggr AS (
      SELECT 
        p.datum,
        MAX(p.leadott_ossz) AS leadott_ossz,
        MAX(p.lehivott_ossz) AS lehivott_ossz,
        0 AS a_muszak,
        0 AS b_muszak,
        0 AS c_muszak
      FROM v_napi_perces p
      WHERE p.datum >= DATEADD(MONTH, -3, GETDATE())
      GROUP BY p.datum
    ),
    WarRoomSum AS (
      SELECT 
        CONVERT(DATE, Datum) AS datum,
        SUM(ISNULL(ElmeletiLetszam, 0)) AS lejelentett_fo
      FROM WarRoomLetszam
      GROUP BY CONVERT(DATE, Datum)
    ),
    NapiAdatok AS (
    SELECT 
        CAST(DATEPART(YEAR, DATEADD(DAY, 3 - (DATEPART(dw, n.datum) + @@DATEFIRST - 2) % 7, n.datum)) AS VARCHAR) + '/KW' + 
        RIGHT('0' + CAST(DATEPART(ISO_WEEK, n.datum) AS VARCHAR), 2) AS het_kulcs,
        n.datum,
        28500 AS excel_cel,
        ISNULL(t.perc_cel, 0) AS admin_cel,
        ISNULL(w.lejelentett_fo, 0) * 480 AS letszam_cel,
        CASE 
        WHEN t.perc_cel IS NOT NULL AND t.perc_cel > 0 THEN t.perc_cel
        ELSE 28500
        END AS eff_cel,
        ISNULL(n.a_muszak, 0) AS a_muszak,
        ISNULL(n.b_muszak, 0) AS b_muszak,
        ISNULL(n.c_muszak, 0) AS c_muszak,
        ISNULL(n.leadott_ossz, 0) AS excel_ossz,
        ISNULL(n.lehivott_ossz, 0) AS lehivott_ossz,
        ISNULL(w.lejelentett_fo, 0) AS lejelentett_fo
    FROM NapiAggr n
    LEFT JOIN WarRoomSum w ON n.datum = w.datum
    LEFT JOIN ainova_targets_daily t ON n.datum = t.datum
    )
    SELECT 
    het_kulcs,
    MIN(datum) AS het_eleje,
    MAX(datum) AS het_vege,
    COUNT(*) AS munkanapok,
    
    SUM(excel_cel) AS excel_cel_sum,
    SUM(admin_cel) AS admin_cel_sum,
    SUM(letszam_cel) AS letszam_cel_sum,
    SUM(eff_cel) AS eff_cel_sum,
    
    SUM(a_muszak) AS a_muszak_sum,
    SUM(b_muszak) AS b_muszak_sum,
    SUM(c_muszak) AS c_muszak_sum,
    SUM(a_muszak) + SUM(b_muszak) + SUM(c_muszak) AS abc_osszeg_sum,
    
    SUM(excel_ossz) AS excel_ossz_sum,
    
    (SUM(a_muszak) + SUM(b_muszak) + SUM(c_muszak)) - SUM(excel_ossz) AS elteres_sum,
    
    SUM(lehivott_ossz) AS lehivott_sum,
    SUM(lejelentett_fo) AS lejelentett_fo_sum
    
    FROM NapiAdatok
    GROUP BY het_kulcs
    ORDER BY het_kulcs DESC
  `);
  
  return result.recordset;
}

// =====================================================
// Havi adatok lekérése (aggregált)
// =====================================================
async function getHaviData(pool: sql.ConnectionPool) {
  const result = await pool.request().query(`
    SET DATEFIRST 1;
    
    WITH NapiAggr AS (
      SELECT 
        p.datum,
        MAX(p.leadott_ossz) AS leadott_ossz,
        MAX(p.lehivott_ossz) AS lehivott_ossz,
        0 AS a_muszak,
        0 AS b_muszak,
        0 AS c_muszak
      FROM v_napi_perces p
      WHERE p.datum >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY p.datum
    ),
    WarRoomSum AS (
      SELECT 
        CONVERT(DATE, Datum) AS datum,
        SUM(ISNULL(ElmeletiLetszam, 0)) AS lejelentett_fo
      FROM WarRoomLetszam
      GROUP BY CONVERT(DATE, Datum)
    ),
    NapiAdatok AS (
    SELECT 
        FORMAT(n.datum, 'yyyy-MM') AS honap_kulcs,
        n.datum,
        28500 AS excel_cel,
        ISNULL(t.perc_cel, 0) AS admin_cel,
        ISNULL(w.lejelentett_fo, 0) * 480 AS letszam_cel,
        CASE 
        WHEN t.perc_cel IS NOT NULL AND t.perc_cel > 0 THEN t.perc_cel
        ELSE 28500
        END AS eff_cel,
        ISNULL(n.a_muszak, 0) AS a_muszak,
        ISNULL(n.b_muszak, 0) AS b_muszak,
        ISNULL(n.c_muszak, 0) AS c_muszak,
        ISNULL(n.leadott_ossz, 0) AS excel_ossz,
        ISNULL(n.lehivott_ossz, 0) AS lehivott_ossz,
        ISNULL(w.lejelentett_fo, 0) AS lejelentett_fo
    FROM NapiAggr n
    LEFT JOIN WarRoomSum w ON n.datum = w.datum
    LEFT JOIN ainova_targets_daily t ON n.datum = t.datum
    )
    SELECT 
    honap_kulcs,
    MIN(datum) AS honap_eleje,
    MAX(datum) AS honap_vege,
    COUNT(*) AS munkanapok,
    
    SUM(excel_cel) AS excel_cel_sum,
    SUM(admin_cel) AS admin_cel_sum,
    SUM(letszam_cel) AS letszam_cel_sum,
    SUM(eff_cel) AS eff_cel_sum,
    
    SUM(a_muszak) AS a_muszak_sum,
    SUM(b_muszak) AS b_muszak_sum,
    SUM(c_muszak) AS c_muszak_sum,
    SUM(a_muszak) + SUM(b_muszak) + SUM(c_muszak) AS abc_osszeg_sum,
    
    SUM(excel_ossz) AS excel_ossz_sum,
    
    (SUM(a_muszak) + SUM(b_muszak) + SUM(c_muszak)) - SUM(excel_ossz) AS elteres_sum,
    
    SUM(lehivott_ossz) AS lehivott_sum,
    SUM(lejelentett_fo) AS lejelentett_fo_sum
    
    FROM NapiAdatok
    GROUP BY honap_kulcs
    ORDER BY honap_kulcs DESC
  `);
  
  return result.recordset;
}

// Típus a napi adatokhoz
interface NapiExportRow {
  datum: string;
  nap_nev: string;
  het_szam: number;
  honap: string;
  excel_cel: number;
  admin_cel: number;
  letszam_cel: number;
  eff_cel: number;
  cel_forras: string;
  a_muszak: number;
  b_muszak: number;
  c_muszak: number;
  abc_osszeg: number;
  excel_ossz: number;
  elteres: number;
  lehivott_ossz: number;
  lejelentett_fo: number;
}

interface HetiExportRow {
  het_kulcs: string;
  het_eleje: Date;
  het_vege: Date;
  munkanapok: number;
  excel_cel_sum: number;
  admin_cel_sum: number;
  letszam_cel_sum: number;
  eff_cel_sum: number;
  a_muszak_sum: number;
  b_muszak_sum: number;
  c_muszak_sum: number;
  abc_osszeg_sum: number;
  excel_ossz_sum: number;
  elteres_sum: number;
  lehivott_sum: number;
  lejelentett_fo_sum: number;
}

interface HaviExportRow {
  honap_kulcs: string;
  honap_eleje: Date;
  honap_vege: Date;
  munkanapok: number;
  excel_cel_sum: number;
  admin_cel_sum: number;
  letszam_cel_sum: number;
  eff_cel_sum: number;
  a_muszak_sum: number;
  b_muszak_sum: number;
  c_muszak_sum: number;
  abc_osszeg_sum: number;
  excel_ossz_sum: number;
  elteres_sum: number;
  lehivott_sum: number;
  lejelentett_fo_sum: number;
}

// =====================================================
// NAPI fül létrehozása
// =====================================================
function createNapiSheet(workbook: ExcelJS.Workbook, data: NapiExportRow[]) {
  const sheet = workbook.addWorksheet('Napi', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }]
  });

  // Stílusok a forrás megkülönböztetésére
  const WAR_ROOM_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2387' } }; // Lila - War Room
  const NAPI_PERCES_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }; // Kék - Napi Perces Excel

  // Első sor - Forrás csoportok
  const sourceRow = sheet.getRow(1);
  sourceRow.height = 20;
  
  // Merge cells for source headers
  sheet.mergeCells('A1:D1'); // Alap
  sheet.mergeCells('E1:I1'); // Célok
  sheet.mergeCells('J1:M1'); // War Room
  sheet.mergeCells('N1:O1'); // Napi Perces
  sheet.mergeCells('P1:Q1'); // Egyéb
  
  sourceRow.getCell('A').value = 'ALAP ADATOK';
  sourceRow.getCell('E').value = 'CÉLOK';
  sourceRow.getCell('J').value = '🟣 WAR ROOM EXCEL (Műszak leadás)';
  sourceRow.getCell('N').value = '🔵 NAPI PERCES EXCEL';
  sourceRow.getCell('P').value = 'EGYÉB';
  
  sourceRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sourceRow.getCell('A').fill = HEADER_FILL;
  sourceRow.getCell('E').fill = HEADER_FILL;
  sourceRow.getCell('J').fill = WAR_ROOM_FILL;
  sourceRow.getCell('N').fill = NAPI_PERCES_FILL;
  sourceRow.getCell('P').fill = HEADER_FILL;

  // Oszlopok
  sheet.columns = [
    { header: 'Dátum', key: 'datum', width: 12 },
    { header: 'Nap', key: 'nap_nev', width: 12 },
    { header: 'Hét', key: 'het_szam', width: 6 },
    { header: 'Hónap', key: 'honap', width: 10 },
    { header: 'Excel Cél', key: 'excel_cel', width: 12 },
    { header: 'Admin Cél', key: 'admin_cel', width: 12 },
    { header: 'Létszám Cél', key: 'letszam_cel', width: 12 },
    { header: 'Eff. Cél', key: 'eff_cel', width: 12 },
    { header: 'Cél Forrás', key: 'cel_forras', width: 10 },
    { header: 'A műszak', key: 'a_muszak', width: 12 },
    { header: 'B műszak', key: 'b_muszak', width: 12 },
    { header: 'C műszak', key: 'c_muszak', width: 12 },
    { header: 'A+B+C Σ', key: 'abc_osszeg', width: 12 },
    { header: 'Leadott Össz.', key: 'excel_ossz', width: 14 },
    { header: 'ELTÉRÉS', key: 'elteres', width: 12 },
    { header: 'Lehívott', key: 'lehivott_ossz', width: 12 },
    { header: 'Lej. Fő', key: 'lejelentett_fo', width: 10 }
  ];

  // Második sor - Oszlop fejlécek
  const headerRow = sheet.getRow(2);
  headerRow.values = ['Dátum', 'Nap', 'Hét', 'Hónap', 'Excel Cél', 'Admin Cél', 'Létszám Cél', 'Eff. Cél', 'Cél Forrás', 
                      'A műszak', 'B műszak', 'C műszak', 'A+B+C Σ', 
                      'Leadott Össz.', 'ELTÉRÉS', 
                      'Lehívott', 'Lej. Fő'];
  headerRow.eachCell((cell, colNumber) => {
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    // Színezés forrás szerint
    if (colNumber >= 10 && colNumber <= 13) {
      cell.fill = WAR_ROOM_FILL; // War Room oszlopok
    } else if (colNumber >= 14 && colNumber <= 15) {
      cell.fill = NAPI_PERCES_FILL; // Napi Perces Excel oszlopok
    } else {
      cell.fill = HEADER_FILL;
    }
  });
  headerRow.height = 25;

  // Adatok
  data.forEach((row, idx) => {
    const excelRow = sheet.addRow(row);
    
    // Eltérés színezés
    const elteresCell = excelRow.getCell('elteres');
    const elteres = Math.abs(row.elteres || 0);
    if (elteres > 1000) {
      elteresCell.fill = ERROR_FILL;
      elteresCell.font = { bold: true, color: { argb: 'FF800000' } };
    } else if (elteres > 100) {
      elteresCell.fill = WARNING_FILL;
      elteresCell.font = { bold: true };
    }
    
    // Szám formázás
    ['excel_cel', 'admin_cel', 'letszam_cel', 'eff_cel', 'a_muszak', 'b_muszak', 'c_muszak', 'abc_osszeg', 'excel_ossz', 'elteres', 'lehivott_ossz'].forEach(key => {
      const cell = excelRow.getCell(key);
      cell.numFmt = '#,##0';
    });
    
    // Váltakozó sorszín
    if (idx % 2 === 1) {
      excelRow.eachCell(cell => {
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== 'FFFF6B6B') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' }
          };
        }
      });
    }
  });

  // SUMM sor
  const sumRow = sheet.addRow({});
  sumRow.getCell(1).value = 'ÖSSZESEN';
  sumRow.getCell(1).font = { bold: true };
  
  const lastDataRow = data.length + 2; // +2 mert 2 fejléc sor van
  const sumFormulas: { [key: string]: number } = {
    'excel_cel': 5, 'admin_cel': 6, 'letszam_cel': 7, 'eff_cel': 8,
    'a_muszak': 10, 'b_muszak': 11, 'c_muszak': 12, 'abc_osszeg': 13,
    'excel_ossz': 14, 'elteres': 15, 'lehivott_ossz': 16, 'lejelentett_fo': 17
  };
  
  Object.entries(sumFormulas).forEach(([_key, col]) => {
    const cell = sumRow.getCell(col);
    const colLetter = String.fromCharCode(64 + col);
    cell.value = { formula: `SUM(${colLetter}3:${colLetter}${lastDataRow})` }; // 3-tól indul mert 2 fejléc sor
    cell.numFmt = '#,##0';
  });
  
  sumRow.eachCell(cell => {
    cell.fill = SUM_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  // Auto-filter (2. sortól, mert az az oszlop fejléc)
  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: data.length + 2, column: 17 }
  };
}

// =====================================================
// HETI fül létrehozása
// =====================================================
function createHetiSheet(workbook: ExcelJS.Workbook, data: HetiExportRow[]) {
  const sheet = workbook.addWorksheet('Heti', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
  });

  // Stílusok a forrás megkülönböztetésére
  const WAR_ROOM_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2387' } }; // Lila - War Room
  const NAPI_PERCES_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }; // Kék - Napi Perces Excel

  // Első sor - Forrás csoportok
  const sourceRow = sheet.getRow(1);
  sourceRow.height = 20;
  
  sheet.mergeCells('A1:D1'); // Alap
  sheet.mergeCells('E1:H1'); // Célok
  sheet.mergeCells('I1:L1'); // War Room
  sheet.mergeCells('M1:N1'); // Napi Perces
  sheet.mergeCells('O1:P1'); // Egyéb
  
  sourceRow.getCell('A').value = 'ALAP ADATOK';
  sourceRow.getCell('E').value = 'CÉLOK';
  sourceRow.getCell('I').value = '🟣 WAR ROOM EXCEL';
  sourceRow.getCell('M').value = '🔵 NAPI PERCES EXCEL';
  sourceRow.getCell('O').value = 'EGYÉB';
  
  sourceRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sourceRow.getCell('A').fill = HEADER_FILL;
  sourceRow.getCell('E').fill = HEADER_FILL;
  sourceRow.getCell('I').fill = WAR_ROOM_FILL;
  sourceRow.getCell('M').fill = NAPI_PERCES_FILL;
  sourceRow.getCell('O').fill = HEADER_FILL;

  sheet.columns = [
    { header: 'Hét', key: 'het_kulcs', width: 12 },
    { header: 'Kezdő dátum', key: 'het_eleje', width: 12 },
    { header: 'Záró dátum', key: 'het_vege', width: 12 },
    { header: 'Munkanapok', key: 'munkanapok', width: 12 },
    { header: 'Excel Cél Σ', key: 'excel_cel_sum', width: 14 },
    { header: 'Admin Cél Σ', key: 'admin_cel_sum', width: 14 },
    { header: 'Létszám Cél Σ', key: 'letszam_cel_sum', width: 14 },
    { header: 'Eff. Cél Σ', key: 'eff_cel_sum', width: 14 },
    { header: 'A műszak Σ', key: 'a_muszak_sum', width: 12 },
    { header: 'B műszak Σ', key: 'b_muszak_sum', width: 12 },
    { header: 'C műszak Σ', key: 'c_muszak_sum', width: 12 },
    { header: 'A+B+C Σ', key: 'abc_osszeg_sum', width: 14 },
    { header: 'Leadott Össz. Σ', key: 'excel_ossz_sum', width: 14 },
    { header: 'ELTÉRÉS Σ', key: 'elteres_sum', width: 14 },
    { header: 'Lehívott Σ', key: 'lehivott_sum', width: 14 },
    { header: 'Lej. Fő Σ', key: 'lejelentett_fo_sum', width: 12 }
  ];

  // Második sor - Oszlop fejlécek
  const headerRow = sheet.getRow(2);
  headerRow.values = ['Hét', 'Kezdő dátum', 'Záró dátum', 'Munkanapok', 
                      'Excel Cél Σ', 'Admin Cél Σ', 'Létszám Cél Σ', 'Eff. Cél Σ',
                      'A műszak Σ', 'B műszak Σ', 'C műszak Σ', 'A+B+C Σ', 
                      'Leadott Össz. Σ', 'ELTÉRÉS Σ',
                      'Lehívott Σ', 'Lej. Fő Σ'];
  headerRow.eachCell((cell, colNumber) => {
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (colNumber >= 9 && colNumber <= 12) {
      cell.fill = WAR_ROOM_FILL;
    } else if (colNumber >= 13 && colNumber <= 14) {
      cell.fill = NAPI_PERCES_FILL;
    } else {
      cell.fill = HEADER_FILL;
    }
  });
  headerRow.height = 25;

  data.forEach((row, idx) => {
    // Dátumokat formázni
    const formattedRow = {
      ...row,
      het_eleje: row.het_eleje ? new Date(row.het_eleje).toISOString().split('T')[0] : '',
      het_vege: row.het_vege ? new Date(row.het_vege).toISOString().split('T')[0] : ''
    };
    
    const excelRow = sheet.addRow(formattedRow);
    
    // Eltérés színezés
    const elteresCell = excelRow.getCell('elteres_sum');
    const elteres = Math.abs(row.elteres_sum || 0);
    if (elteres > 5000) {
      elteresCell.fill = ERROR_FILL;
      elteresCell.font = { bold: true, color: { argb: 'FF800000' } };
    } else if (elteres > 500) {
      elteresCell.fill = WARNING_FILL;
      elteresCell.font = { bold: true };
    }
    
    // Szám formázás
    ['excel_cel_sum', 'admin_cel_sum', 'letszam_cel_sum', 'eff_cel_sum', 'a_muszak_sum', 'b_muszak_sum', 'c_muszak_sum', 'abc_osszeg_sum', 'excel_ossz_sum', 'elteres_sum', 'lehivott_sum', 'lejelentett_fo_sum'].forEach(key => {
      excelRow.getCell(key).numFmt = '#,##0';
    });
    
    if (idx % 2 === 1) {
      excelRow.eachCell(cell => {
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== 'FFFF6B6B') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
    }
  });

  // SUMM sor
  const sumRow = sheet.addRow({});
  sumRow.getCell(1).value = 'ÖSSZESEN';
  sumRow.getCell(1).font = { bold: true };
  
  const lastDataRow = data.length + 2;
  [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach(col => {
    const cell = sumRow.getCell(col);
    const colLetter = String.fromCharCode(64 + col);
    cell.value = { formula: `SUM(${colLetter}3:${colLetter}${lastDataRow})` };
    cell.numFmt = '#,##0';
  });
  
  sumRow.eachCell(cell => {
    cell.fill = SUM_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: data.length + 2, column: 16 } };
}

// =====================================================
// HAVI fül létrehozása
// =====================================================
function createHaviSheet(workbook: ExcelJS.Workbook, data: HaviExportRow[]) {
  const sheet = workbook.addWorksheet('Havi', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
  });

  // Stílusok a forrás megkülönböztetésére
  const WAR_ROOM_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2387' } }; // Lila - War Room
  const NAPI_PERCES_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }; // Kék - Napi Perces Excel

  // Első sor - Forrás csoportok
  const sourceRow = sheet.getRow(1);
  sourceRow.height = 20;
  
  sheet.mergeCells('A1:D1'); // Alap
  sheet.mergeCells('E1:H1'); // Célok
  sheet.mergeCells('I1:L1'); // War Room
  sheet.mergeCells('M1:N1'); // Napi Perces
  sheet.mergeCells('O1:P1'); // Egyéb
  
  sourceRow.getCell('A').value = 'ALAP ADATOK';
  sourceRow.getCell('E').value = 'CÉLOK';
  sourceRow.getCell('I').value = '🟣 WAR ROOM EXCEL';
  sourceRow.getCell('M').value = '🔵 NAPI PERCES EXCEL';
  sourceRow.getCell('O').value = 'EGYÉB';
  
  sourceRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sourceRow.getCell('A').fill = HEADER_FILL;
  sourceRow.getCell('E').fill = HEADER_FILL;
  sourceRow.getCell('I').fill = WAR_ROOM_FILL;
  sourceRow.getCell('M').fill = NAPI_PERCES_FILL;
  sourceRow.getCell('O').fill = HEADER_FILL;

  sheet.columns = [
    { header: 'Hónap', key: 'honap_kulcs', width: 12 },
    { header: 'Kezdő dátum', key: 'honap_eleje', width: 12 },
    { header: 'Záró dátum', key: 'honap_vege', width: 12 },
    { header: 'Munkanapok', key: 'munkanapok', width: 12 },
    { header: 'Excel Cél Σ', key: 'excel_cel_sum', width: 14 },
    { header: 'Admin Cél Σ', key: 'admin_cel_sum', width: 14 },
    { header: 'Létszám Cél Σ', key: 'letszam_cel_sum', width: 14 },
    { header: 'Eff. Cél Σ', key: 'eff_cel_sum', width: 14 },
    { header: 'A műszak Σ', key: 'a_muszak_sum', width: 12 },
    { header: 'B műszak Σ', key: 'b_muszak_sum', width: 12 },
    { header: 'C műszak Σ', key: 'c_muszak_sum', width: 12 },
    { header: 'A+B+C Σ', key: 'abc_osszeg_sum', width: 14 },
    { header: 'Leadott Össz. Σ', key: 'excel_ossz_sum', width: 14 },
    { header: 'ELTÉRÉS Σ', key: 'elteres_sum', width: 14 },
    { header: 'Lehívott Σ', key: 'lehivott_sum', width: 14 },
    { header: 'Lej. Fő Σ', key: 'lejelentett_fo_sum', width: 12 }
  ];

  // Második sor - Oszlop fejlécek
  const headerRow = sheet.getRow(2);
  headerRow.values = ['Hónap', 'Kezdő dátum', 'Záró dátum', 'Munkanapok', 
                      'Excel Cél Σ', 'Admin Cél Σ', 'Létszám Cél Σ', 'Eff. Cél Σ',
                      'A műszak Σ', 'B műszak Σ', 'C műszak Σ', 'A+B+C Σ', 
                      'Leadott Össz. Σ', 'ELTÉRÉS Σ',
                      'Lehívott Σ', 'Lej. Fő Σ'];
  headerRow.eachCell((cell, colNumber) => {
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (colNumber >= 9 && colNumber <= 12) {
      cell.fill = WAR_ROOM_FILL;
    } else if (colNumber >= 13 && colNumber <= 14) {
      cell.fill = NAPI_PERCES_FILL;
    } else {
      cell.fill = HEADER_FILL;
    }
  });
  headerRow.height = 25;

  data.forEach((row, idx) => {
    const formattedRow = {
      ...row,
      honap_eleje: row.honap_eleje ? new Date(row.honap_eleje).toISOString().split('T')[0] : '',
      honap_vege: row.honap_vege ? new Date(row.honap_vege).toISOString().split('T')[0] : ''
    };
    
    const excelRow = sheet.addRow(formattedRow);
    
    // Eltérés színezés - havi szinten nagyobb tolerancia
    const elteresCell = excelRow.getCell('elteres_sum');
    const elteres = Math.abs(row.elteres_sum || 0);
    if (elteres > 20000) {
      elteresCell.fill = ERROR_FILL;
      elteresCell.font = { bold: true, color: { argb: 'FF800000' } };
    } else if (elteres > 2000) {
      elteresCell.fill = WARNING_FILL;
      elteresCell.font = { bold: true };
    }
    
    ['excel_cel_sum', 'admin_cel_sum', 'letszam_cel_sum', 'eff_cel_sum', 'a_muszak_sum', 'b_muszak_sum', 'c_muszak_sum', 'abc_osszeg_sum', 'excel_ossz_sum', 'elteres_sum', 'lehivott_sum', 'lejelentett_fo_sum'].forEach(key => {
      excelRow.getCell(key).numFmt = '#,##0';
    });
    
    if (idx % 2 === 1) {
      excelRow.eachCell(cell => {
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== 'FFFF6B6B') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
    }
  });

  // SUMM sor
  const sumRow = sheet.addRow({});
  sumRow.getCell(1).value = 'ÖSSZESEN';
  sumRow.getCell(1).font = { bold: true };
  
  const lastDataRow = data.length + 2;
  [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach(col => {
    const cell = sumRow.getCell(col);
    const colLetter = String.fromCharCode(64 + col);
    cell.value = { formula: `SUM(${colLetter}3:${colLetter}${lastDataRow})` };
    cell.numFmt = '#,##0';
  });
  
  sumRow.eachCell(cell => {
    cell.fill = SUM_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: data.length + 2, column: 16 } };
}
