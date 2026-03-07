// =====================================================
// AINOVA - Munkaterv és Visszajelentés feldolgozás
// =====================================================
// ExcelJS streaming reader + mssql UPSERT/BULK
// Támogatott importok:
// 1. Visszajelentés (próba.XLSX formátum) -> sap_visszajelentes
// 2. Norma Friss (norma frissXX.XX.xlsx) -> norma_friss
// 3. Routing (routing.XLSX) -> sap_munkaterv
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db/getPool';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const PROGRESS_FILE = path.join(os.tmpdir(), 'ainova-munkaterv-progress.json');
const UPLOADS_DIR = path.join(os.tmpdir(), 'ainova-uploads');

function cleanupOldTempFiles() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;
    const files = fs.readdirSync(UPLOADS_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 3600000) { // 1 óra
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('[Takarítás] Hiba:', err);
  }
}

function writeProgress(data: Record<string, unknown>) {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ ...data, updatedAt: Date.now() })); } catch { /* ok */ }
}
function clearProgress() {
  try { fs.unlinkSync(PROGRESS_FILE); } catch { /* ok */ }
}

export const runtime = 'nodejs';
export const maxDuration = 300;

// =====================================================
// Oszlop definíciók
// =====================================================

// Routing (sap_munkaterv)
const ROUTING_COLS = {
  ANYAG: 0,           // Anyag
  TERVCSOP: 1,        // Tervcsop
  TCS: 2,             // TCS
  TKD_TOROLT: 4,      // TKd (X = törölt)
  TKD_2: 5,           // TKd
  STATUS: 6,          // Státus
  MUVELETSZAM: 9,     // Műv.
  MUVELET_SZOVEG: 10, // Művelet rövid szövege
  GYAR: 21,           // Gy.üt (néha itt van, néha máshol, de a fejlécből detektáljuk)
  MUNKAHELY: 23,      // Munkah.
};

// Visszajelentés (próba.XLSX formátum)
const VJ_COLS = {
  RENDELES: 0,
  ANYAG: 1,
  MUVELET_SZOVEG: 2,
  MUNKAHELY: 3,
  GYARTASUTEMEZO: 4,
  GYAR: 5,
  TORZSSZAM: 6,
  HIBATLAN_MENNY: 9,
  STO: 11,
  STOVISSZ: 12,
  ROGZITVE: 13, // Dátum
  IDOPONT: 14,  // Idő
  MNE: 15,      // Mozgásnem
  MNE_MENNYISEG: 16, // MNE Mennyiség
  SARZS: 18     // Sarzs
};

// Fejléc minták típusfelismeréshez
const HEADER_PATTERNS: Record<string, string[]> = {
  visszajelentes: ['rendelés', 'anyag', 'művelet rövid szövege', 'munkah.', 'gy.üt', 'rögzítve', 'időpont'],
  routing: ['anyag', 'tervcsop', 'műv.', 'művelet rövid szövege', 'munkah.'],
  norma_friss: ['termék_nev', 'norma_ido_db', 'eur_per_perc', 'lac_megjegyzes'], // Vagy hasonló
};

const BULK_BATCH_SIZE = 2500;

// =====================================================
// Helper functions
// =====================================================

function parseDateValue(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + Math.floor(val));
    return d;
  }
  return null;
}

function parseTimeValue(val: unknown): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    // Excel time fraction (0.5 = 12:00)
    const totalSeconds = Math.round(val * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return new Date(Date.UTC(1970, 0, 1, h, m, s));
  }
  return null;
}

// 05:45 shift logic
function applyShift(date: Date, time: Date): Date {
  const cutoff = 5 * 3600 + 45 * 60; // 05:45 in seconds
  const timeSeconds = time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds();
  
  const newDate = new Date(date);
  if (timeSeconds < cutoff) {
    newDate.setUTCDate(newDate.getUTCDate() - 1);
  }
  return newDate;
}

// =====================================================
// UPSERT Visszajelentés (MERGE)
// =====================================================
async function upsertVissza(pool: sql.ConnectionPool, rows: unknown[][]) {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  let totalInserted = 0;
  let totalUpdated = 0;

  // Deduplicate in memory first
  const uniqueMap = new Map<string, unknown[]>();
  for (const row of rows) {
    const r = row as any[];
    // Key: rendeles + muvelet_szoveg + torzsszam + vegrehajtas_datum + vegrehajtas_ido
    // Note: muveletszam is empty in new format, so use muvelet_szoveg for uniqueness
    const key = `${r[0]}|${r[4]}|${r[9]}|${r[10].toISOString()}|${r[11].toISOString()}`;
    uniqueMap.set(key, row);
  }
  const uniqueRows = Array.from(uniqueMap.values());

  const SUB_BATCH = 120; // 120 * 15 = 1800 parameters (< 2100 limit)
  for (let i = 0; i < uniqueRows.length; i += SUB_BATCH) {
    const batch = uniqueRows.slice(i, i + SUB_BATCH);
    const request = pool.request();
    const params: string[] = [];

    batch.forEach((row: any, idx) => {
      request.input(`r${idx}`, sql.NVarChar(50), row[0]); // rendeles
      request.input(`a${idx}`, sql.NVarChar(100), row[1]); // anyag
      request.input(`g${idx}`, sql.Int, row[2]); // gyartasutemezo
      request.input(`ms${idx}`, sql.NVarChar(200), row[4]); // muvelet_szoveg
      request.input(`hm${idx}`, sql.Int, row[7]); // hibatlan_menny
      request.input(`st${idx}`, sql.NVarChar(50), row[8]); // sztorno
      request.input(`ts${idx}`, sql.NVarChar(50), row[9]); // torzsszam
      request.input(`vd${idx}`, sql.Date, row[10]); // vegrehajtas_datum
      request.input(`vi${idx}`, sql.Time, row[11]); // vegrehajtas_ido
      request.input(`mh${idx}`, sql.NVarChar(20), row[12]); // munkahely
      request.input(`gyr${idx}`, sql.NVarChar(20), row[5]); // gyar
      request.input(`val${idx}`, sql.Date, row[13]); // valos_datum (pre-calculated shift)
      request.input(`mne${idx}`, sql.VarChar(10), row[14]); // mozgasnem
      request.input(`mneq${idx}`, sql.Decimal(18, 2), row[15]); // mne_mennyiseg
      request.input(`sarzs${idx}`, sql.NVarChar(50), row[16]); // sarzs

      params.push(`(@r${idx}, @a${idx}, @g${idx}, '', @ms${idx}, @gyr${idx}, 0, @hm${idx}, @st${idx}, @ts${idx}, @vd${idx}, @vi${idx}, @mh${idx}, @val${idx}, @mne${idx}, @mneq${idx}, @sarzs${idx})`);
    });

    if (params.length > 0) {
      try {
        const query = `
          MERGE INTO sap_visszajelentes AS Target
          USING (VALUES ${params.join(',')})
          AS Source(rendeles, anyag, gyartasutemezo, muveletszam, muvelet_szoveg, gyar, visszajel_perc, hibatlan_menny, sztorno, torzsszam, vegrehajtas_datum, vegrehajtas_ido, munkahely, valos_datum, mozgasnem, mne_mennyiseg, sarzs)
          ON (
            Target.rendeles = Source.rendeles AND
            Target.muvelet_szoveg = Source.muvelet_szoveg AND
            Target.torzsszam = Source.torzsszam AND
            Target.vegrehajtas_datum = Source.vegrehajtas_datum AND
            Target.vegrehajtas_ido = Source.vegrehajtas_ido
          )
          WHEN MATCHED THEN
            UPDATE SET
              Target.hibatlan_menny = Source.hibatlan_menny,
              Target.sztorno = Source.sztorno,
              Target.valos_datum = Source.valos_datum,
              Target.gyartasutemezo = Source.gyartasutemezo,
              Target.munkahely = Source.munkahely,
              Target.mozgasnem = Source.mozgasnem,
              Target.mne_mennyiseg = Source.mne_mennyiseg,
              Target.sarzs = Source.sarzs
          WHEN NOT MATCHED THEN
            INSERT (rendeles, anyag, gyartasutemezo, muveletszam, muvelet_szoveg, gyar, visszajel_perc, hibatlan_menny, sztorno, torzsszam, vegrehajtas_datum, vegrehajtas_ido, munkahely, valos_datum, imported_at, mozgasnem, mne_mennyiseg, sarzs)
            VALUES (Source.rendeles, Source.anyag, Source.gyartasutemezo, Source.muveletszam, Source.muvelet_szoveg, Source.gyar, Source.visszajel_perc, Source.hibatlan_menny, Source.sztorno, Source.torzsszam, Source.vegrehajtas_datum, Source.vegrehajtas_ido, Source.munkahely, Source.valos_datum, GETDATE(), Source.mozgasnem, Source.mne_mennyiseg, Source.sarzs);
        `;
        await request.query(query);
        totalInserted += 1; // Simplification, not exact count from MERGE output but roughly okay for progress
      } catch (err) {
        console.error('Batch error:', err);
      }
    }
  }
  return { inserted: totalInserted, updated: totalUpdated };
}

// =====================================================
// Handlers
// =====================================================

async function handleVisszajelentesImport(filePath: string) {
  const pool = await getPool();
  writeProgress({ phase: 'reading', message: 'Visszajelentés olvasása...', percent: 10 });

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
  let batch: any[] = [];
  let processed = 0;

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {
      if (processed === 0) { // Header check or skip
        processed++;
        continue; 
      }
      
      // Fixed column indices based on próba.XLSX structure
      const rendeles = row.getCell(VJ_COLS.RENDELES + 1).text?.trim();
      const anyag = row.getCell(VJ_COLS.ANYAG + 1).text?.trim();
      const muvelet = row.getCell(VJ_COLS.MUVELET_SZOVEG + 1).text?.trim();
      
      if (!rendeles || !anyag) continue;

      const gyut = parseInt(row.getCell(VJ_COLS.GYARTASUTEMEZO + 1).text || '0');
      const gyar = row.getCell(VJ_COLS.GYAR + 1).text?.trim();
      const sztsz = row.getCell(VJ_COLS.TORZSSZAM + 1).text?.trim();
      const menny = parseFloat(row.getCell(VJ_COLS.HIBATLAN_MENNY + 1).text || '0');
      const sto = row.getCell(VJ_COLS.STO + 1).text?.trim();
      const stovissz = row.getCell(VJ_COLS.STOVISSZ + 1).text?.trim();
      const sztorno = (sto === 'X' || stovissz === 'X') ? 'X' : '0';
      const munkah = row.getCell(VJ_COLS.MUNKAHELY + 1).text?.trim();
      
      const mne = row.getCell(VJ_COLS.MNE + 1).text?.trim() || null;
      const mne_mennyiseg = parseFloat(row.getCell(VJ_COLS.MNE_MENNYISEG + 1).text || '0');
      const sarzs = row.getCell(VJ_COLS.SARZS + 1).text?.trim() || null;

      const rDate = parseDateValue(row.getCell(VJ_COLS.ROGZITVE + 1).value);
      const rTime = parseTimeValue(row.getCell(VJ_COLS.IDOPONT + 1).value);

      if (rDate && rTime) {
        const valosDatum = applyShift(rDate, rTime); // 05:45 shift applied here!
        
        batch.push([
          rendeles, anyag, gyut, '', muvelet, gyar, 0, menny, sztorno, sztsz, rDate, rTime, munkah, valosDatum, mne, mne_mennyiseg, sarzs
        ]);
      }

      if (batch.length >= 2000) {
        await upsertVissza(pool, batch);
        processed += batch.length;
        writeProgress({ phase: 'importing', message: `Feldolgozva: ${processed}`, percent: 50 });
        batch = [];
      }
    }
  }
  await upsertVissza(pool, batch);
  
  // Post-processing: Update is_lac
  await pool.request().query(`
    UPDATE sap_visszajelentes SET is_lac = 1 
    WHERE munkahely LIKE '64L%' OR munkahely LIKE '64H%' OR munkahely IN ('6403','6404','6465')
  `);

  writeProgress({ phase: 'done', message: 'Kész', percent: 100 });
  return NextResponse.json({ success: true, message: 'Sikeres import' });
}

async function upsertAnyagmozgas(pool: sql.ConnectionPool, rows: any[]) {
    if (rows.length === 0) return;
    
    // Deduplicate
    const uniqueMap = new Map();
    for (const r of rows) {
        // bizonylat + anyag + sarzs + mozgasnem + konyveles_datum
        const key = `${r[0]}|${r[1]}|${r[2] || ''}|${r[4]}|${r[8].toISOString()}`;
        uniqueMap.set(key, r);
    }
    const uniqueRows = Array.from(uniqueMap.values());

    const SUB_BATCH = 150;
    for (let i = 0; i < uniqueRows.length; i += SUB_BATCH) {
        const batch = uniqueRows.slice(i, i + SUB_BATCH);
        const request = pool.request();
        const params: string[] = [];

        batch.forEach((row, idx) => {
            request.input(`b${idx}`, sql.NVarChar(50), row[0]);
            request.input(`a${idx}`, sql.NVarChar(40), row[1]);
            request.input(`s${idx}`, sql.NVarChar(50), row[2]);
            request.input(`r${idx}`, sql.NVarChar(20), row[3]);
            request.input(`mne${idx}`, sql.NVarChar(10), row[4]);
            request.input(`menny${idx}`, sql.Decimal(12, 3), row[5]);
            request.input(`gyut${idx}`, sql.Int, row[6]);
            request.input(`ert${idx}`, sql.Decimal(12, 2), row[7]);
            request.input(`kd${idx}`, sql.Date, row[8]);
            request.input(`islac${idx}`, sql.Bit, row[9]);

            params.push(`(@b${idx}, @a${idx}, @s${idx}, @r${idx}, @mne${idx}, @menny${idx}, @gyut${idx}, @ert${idx}, @kd${idx}, '', @islac${idx})`);
        });

        if (params.length > 0) {
            try {
                const query = `
                    MERGE INTO sap_anyagmozgas AS Target
                    USING (VALUES ${params.join(',')})
                    AS Source(bizonylat_szam, anyag, sarzs, rendeles, mozgasnem, mennyiseg, gyartasutemezo, ertek_penznem, konyveles_datum, raktar, is_lac)
                    ON (
                        Target.bizonylat_szam = Source.bizonylat_szam AND
                        Target.anyag = Source.anyag AND
                        ISNULL(Target.sarzs, '') = ISNULL(Source.sarzs, '') AND
                        Target.mozgasnem = Source.mozgasnem AND
                        Target.konyveles_datum = Source.konyveles_datum
                    )
                    WHEN MATCHED THEN
                        UPDATE SET
                            Target.mennyiseg = Source.mennyiseg,
                            Target.ertek_penznem = Source.ertek_penznem,
                            Target.gyartasutemezo = Source.gyartasutemezo,
                            Target.rendeles = Source.rendeles
                    WHEN NOT MATCHED THEN
                        INSERT (bizonylat_szam, anyag, sarzs, rendeles, mozgasnem, mennyiseg, gyartasutemezo, ertek_penznem, konyveles_datum, raktar, is_lac)
                        VALUES (Source.bizonylat_szam, Source.anyag, Source.sarzs, Source.rendeles, Source.mozgasnem, Source.mennyiseg, Source.gyartasutemezo, Source.ertek_penznem, Source.konyveles_datum, Source.raktar, Source.is_lac);
                `;
                await request.query(query);
            } catch (err) {
                console.error('Anyagmozgas Batch error:', err);
            }
        }
    }
}

async function handleAnyagmozgasImport(filePath: string) {
  const pool = await getPool();
  writeProgress({ phase: 'reading', message: 'MB51 Anyagmozgas olvasasa...', percent: 10 });

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
  let batch: any[] = [];
  let processed = 0;
  
  let headerMap = new Map<string, number>();

  for await (const worksheet of workbook) {
    let rowNum = 0;
    for await (const row of worksheet) {
      rowNum++;
      const values = row.values as any[] || [];
      
      if (headerMap.size === 0) {
        let foundAny = false;
        for (let i = 1; i < values.length; i++) {
          const val = String(values[i] || '').trim().toLowerCase();
          if (val) {
            headerMap.set(val, i);
            if (val === 'mne' || val.includes('mozgasnem') || val.includes('mozgásnem')) foundAny = true;
          }
        }
        if (foundAny) continue; 
      }
      
      if (headerMap.size === 0) continue; 

      const getVal = (names: string[]) => {
        for (const name of names) {
          for (const [header, idx] of headerMap.entries()) {
            if (header.includes(name) || header === name) {
               return values[idx];
            }
          }
        }
        return null;
      };

      const mne = String(getVal(['mne', 'mozgásnem', 'mozgasnem']) || '').trim();
      if (!mne) continue; 

      const anyag = String(getVal(['anyag']) || '').trim();
      const sarzs = String(getVal(['sarzs', 'batch']) || '').trim() || null;
      
      let mennyiseg = 0;
      const rawMenny = getVal(['mennyiség', 'mennyiseg']);
      if (typeof rawMenny === 'number') mennyiseg = rawMenny;
      else if (rawMenny) mennyiseg = parseFloat(String(rawMenny).replace(',', '.').replace(/\s/g, '')) || 0;
      
      const rendeles = String(getVal(['rendelés', 'rendeles']) || '').trim() || null;
      const gyut = parseInt(String(getVal(['gy.üt', 'gyartasutemezo', 'gyüt']) || '0')) || 0;
      
      const rawDate = getVal(['könyv.dát.', 'konyv.dat', 'dátum', 'datum']);
      const konyvDatum = parseDateValue(rawDate);
      
      if (!anyag || !konyvDatum) continue;
      
      const rawTime = getVal(['időpont', 'idopont', 'idő', 'ido']);
      const ido = parseTimeValue(rawTime);
      
      let ertek = 0;
      const rawEur = getVal(['eur', 'sp-összeg', 'ertek']);
      if (typeof rawEur === 'number') ertek = rawEur;
      else if (rawEur) ertek = parseFloat(String(rawEur).replace(',', '.').replace(/\s/g, '')) || 0;

      const idStr = `${anyag}|${mne}|${mennyiseg}|${konyvDatum.toISOString()}|${ido ? ido.toISOString() : ''}|${rendeles}`;
      const pseudoBizonylat = crypto.createHash('md5').update(idStr).digest('hex').substring(0, 20);

      const bizonylat = String(getVal(['bizonylat_szam', 'bizonylat']) || pseudoBizonylat).trim();
      
      let isLac = 1; 
      
      batch.push([
        bizonylat, anyag, sarzs, rendeles, mne, mennyiseg, gyut, ertek, konyvDatum, isLac
      ]);

      if (batch.length >= 2000) {
        await upsertAnyagmozgas(pool, batch);
        processed += batch.length;
        writeProgress({ phase: 'importing', message: `Feldolgozva: ${processed}`, percent: 50 });
        batch = [];
      }
    }
  }
  
  if (batch.length > 0) {
    await upsertAnyagmozgas(pool, batch);
    processed += batch.length;
  }
  
  writeProgress({ phase: 'done', message: 'Kész', percent: 100 });
  return NextResponse.json({ success: true, message: `Anyagmozgás import kész (${processed} sor)` });
}

async function handleRoutingImport(filePath: string) {
  const pool = await getPool();
  writeProgress({ phase: 'reading', message: 'Routing olvasása...', percent: 10 });

  await pool.request().query('TRUNCATE TABLE sap_munkaterv');

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
  let batch: any[] = [];
  let processed = 0;

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {
      if (processed === 0) { processed++; continue; }

      const anyag = row.getCell(ROUTING_COLS.ANYAG + 1).text?.trim();
      const muv = row.getCell(ROUTING_COLS.MUVELETSZAM + 1).text?.trim();
      const szoveg = row.getCell(ROUTING_COLS.MUVELET_SZOVEG + 1).text?.trim();
      const mh = row.getCell(ROUTING_COLS.MUNKAHELY + 1).text?.trim();
      
      if (anyag) {
        batch.push([anyag, muv, szoveg, mh]);
      }

      if (batch.length >= 150) {
        const request = pool.request();
        const params: string[] = [];
        batch.forEach((r, idx) => {
          request.input(`a${idx}`, sql.NVarChar(40), r[0]);
          request.input(`m${idx}`, sql.NVarChar(10), r[1]);
          request.input(`s${idx}`, sql.NVarChar(100), r[2]);
          request.input(`mh${idx}`, sql.NVarChar(20), r[3]);
          params.push(`(@a${idx}, @m${idx}, @s${idx}, @mh${idx})`);
        });
        await request.query(`INSERT INTO sap_munkaterv (anyag, muveletszam, muvelet_szoveg, munkahely) VALUES ${params.join(',')}`);
        processed += batch.length;
        writeProgress({ phase: 'importing', message: `Feldolgozva: ${processed}`, percent: 50 });
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    const request = pool.request();
    const params: string[] = [];
    batch.forEach((r, idx) => {
      request.input(`a${idx}`, sql.NVarChar(40), r[0]);
      request.input(`m${idx}`, sql.NVarChar(10), r[1]);
      request.input(`s${idx}`, sql.NVarChar(100), r[2]);
      request.input(`mh${idx}`, sql.NVarChar(20), r[3]);
      params.push(`(@a${idx}, @m${idx}, @s${idx}, @mh${idx})`);
    });
    await request.query(`INSERT INTO sap_munkaterv (anyag, muveletszam, muvelet_szoveg, munkahely) VALUES ${params.join(',')}`);
  }

  writeProgress({ phase: 'done', message: 'Kész', percent: 100 });
  return NextResponse.json({ success: true, message: 'Routing import kész' });
}

// Norma Friss import (existing logic kept but cleaned up)
async function handleNormaFrissImport(filePath: string) {
    const pool = await getPool();
    writeProgress({ phase: 'reading', message: 'Norma Friss olvasása...', percent: 10 });

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
    const rowMap = new Map<string, [string, number, number, string | null]>();

    function getNum(val: any): number {
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null && 'result' in val) return typeof val.result === 'number' ? val.result : 0;
        const s = String(val || '0').replace(',', '.').replace(/\s/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    let processedCount = 0;
    for await (const worksheet of workbookReader) {
        // Csak a Munka3 sheet-et dolgozzuk fel, vagy ha nincs olyan, akkor az elsĹ't
        if ((worksheet as any).name !== 'Munka3' && processedCount > 0) continue;

        let rowNum = 1;
        for await (const row of worksheet) {
            if (rowNum < 4) {
                rowNum++;
                continue;
            }
            const termek = row.getCell(1).text?.trim() || String(row.getCell(1).value || '').trim();
            if (!termek) {
                rowNum++;
                continue;
            }
            const norma = getNum(row.getCell(2).value);
            const eur = getNum(row.getCell(3).value);
            const lac = String(row.getCell(4).value || '').trim() === 'LAC' ? 'LAC' : null;
            rowMap.set(termek, [termek, norma, eur, lac]);
            rowNum++;
        }
        processedCount++;
        if ((worksheet as any).name === 'Munka3') break; // MegtalĂˇltuk amit kerestĂĽnk
    }

    const rows = Array.from(rowMap.values());

    await pool.request().query('TRUNCATE TABLE norma_friss');

    // Bulk insert norma_friss
    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const table = new sql.Table('norma_friss');
        table.create = false;
        table.columns.add('termek_nev', sql.NVarChar(100), { nullable: false });
        table.columns.add('norma_ido_db', sql.Decimal(10, 4), { nullable: true });
        table.columns.add('eur_per_perc', sql.Decimal(10, 6), { nullable: true });
        table.columns.add('lac_megjegyzes', sql.NVarChar(20), { nullable: true });
        batch.forEach(r => table.rows.add(...r));
        await pool.request().bulk(table);
        writeProgress({ phase: 'importing', message: `Feltöltve: ${i + batch.length}`, percent: 50 + Math.floor((i / rows.length) * 50) });
    }

    writeProgress({ phase: 'done', message: 'Kész', percent: 100 });
    return NextResponse.json({ success: true, message: 'Norma Friss import kész' });
}

export async function POST(request: NextRequest) {
  try {
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const body = await request.json();
    const { filePath, action, type } = body;

    if (action === 'detect') {
        try {
            const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
            let detected = 'visszajelentes';
            let mainDetectionDone = false;
            let isFirstSheet = true;

            for await (const worksheet of workbookReader) {
                if ((worksheet as any).name === 'Munka3') {
                    detected = 'norma_friss';
                    mainDetectionDone = true;
                    break;
                }

                if (isFirstSheet && !mainDetectionDone) {
                    isFirstSheet = false;
                    let rowCount = 0;
                    for await (const row of worksheet) {
                        if (rowCount >= 5) break;
                        
                        const values = (row.values as any[] || [])
                            .map(v => String(v || '').trim().toLowerCase());
                        
                        const isRouting = values.some(v => v.includes('tervcsop') || v.includes('műv.') || v.includes('muv.'));
                        const isVisszajelentes = values.some(v => v.includes('rendelés') || v.includes('rögzítve'));
                        const isAnyagmozgas = values.some(v => v === 'mne' || v.includes('mozgasnem') || v.includes('mozgásnem'));

                        if (isAnyagmozgas) {
                            detected = 'anyagmozgas';
                            mainDetectionDone = true;
                            break;
                        }
                        if (isRouting) {
                            detected = 'routing';
                            mainDetectionDone = true;
                            break;
                        }
                        if (isVisszajelentes) {
                            detected = 'visszajelentes';
                            mainDetectionDone = true;
                            break;
                        }
                        rowCount++;
                    }
                }
                if (mainDetectionDone) break;
            }

            console.log(`[Detect] File: ${path.basename(filePath)} -> Type: ${detected}`);
            return NextResponse.json({ success: true, detectedType: detected, confidence: 100 });
        } catch (err) {
            console.error('[Detect] Streaming error:', err);
            // Fallback to minimal detection if streaming fails or just return default
            return NextResponse.json({ success: true, detectedType: 'visszajelentes', confidence: 50 });
        }
    }

    if (type === 'anyagmozgas') return await handleAnyagmozgasImport(filePath);
    if (type === 'visszajelentes') return await handleVisszajelentesImport(filePath);
    if (type === 'norma_friss') return await handleNormaFrissImport(filePath);
    if (type === 'routing') return await handleRoutingImport(filePath);

    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
