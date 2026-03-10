/**
 * Futtatja az összes core migrációt sorban.
 * Biztonságos: minden migráció idempotens (IF NOT EXISTS).
 * Használat: npx tsx scripts/migrate-all.ts
 * 
 * Támogatott adapterek: mssql, sqlite
 */
import sql from 'mssql';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const DB_ADAPTER = process.env.DB_ADAPTER ?? 'mssql';

// ============================================================================
// MSSQL Implementation
// ============================================================================
async function runMssqlMigrations(): Promise<void> {
  const cfg: sql.config = {
    server:   process.env.DB_SERVER!,
    database: process.env.DB_DATABASE!,
    user:     process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    port:     parseInt(process.env.DB_PORT ?? '1433', 10),
    options: {
      encrypt:                true,
      trustServerCertificate: true,
      enableArithAbort:       true,
    },
    connectionTimeout: 30000,
    requestTimeout:    120000,
  };

  async function waitForDb(retries = 20, delayMs = 3000): Promise<sql.ConnectionPool> {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[migrate] MSSQL kapcsolódás... (${i}/${retries})`);
        const pool = await sql.connect(cfg);
        console.log('[migrate] MSSQL kapcsolódva.');
        return pool;
      } catch (e: unknown) {
        const msg = (e as Error).message;
        if (i === retries) throw e;
        console.log(`[migrate] Még nem elérhető: ${msg} — várok ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw new Error('DB nem érhető el');
  }

  async function runFile(pool: sql.ConnectionPool, filePath: string): Promise<void> {
    console.log(`[migrate] ▶ ${path.basename(filePath)}`);
    const sqlText = fs.readFileSync(filePath, 'utf8');
    const batches = sqlText
      .split(/^\s*GO\s*$/im)
      .map((b: string) => b.trim())
      .filter((b: string) => b && !b.split('\n').every(
        (l: string) => l.trim() === '' || l.trim().startsWith('--')
      ));

    for (let i = 0; i < batches.length; i++) {
      try {
        await pool.request().query(batches[i]);
      } catch (e: unknown) {
        const err = e as Error & { number?: number };
        console.error(`[migrate] ❌ ${path.basename(filePath)} batch ${i + 1}: ${err.message}`);
        throw err;
      }
    }
    console.log(`[migrate] ✅ ${path.basename(filePath)}`);
  }

  const folders = ['core'];
  const pool = await waitForDb();

  // Core migrációk
  for (const folder of folders) {
    const dir = path.join(process.cwd(), 'database', folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(dir, f));

    console.log(`[migrate] ${folder}: ${files.length} migráció`);
    for (const f of files) {
      await runFile(pool, f);
    }
  }

  // Modul migrációk
  const modulesDir = path.join(process.cwd(), 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleDirs = fs.readdirSync(modulesDir)
      .filter((f: string) => !f.startsWith('_') && fs.statSync(path.join(modulesDir, f)).isDirectory());

    for (const moduleId of moduleDirs) {
      const migDir = path.join(modulesDir, moduleId, 'migrations');
      if (!fs.existsSync(migDir)) continue;

      const files = fs.readdirSync(migDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort()
        .map((f: string) => path.join(migDir, f));

      if (files.length > 0) {
        console.log(`[migrate] module/${moduleId}: ${files.length} migráció`);
        for (const f of files) {
          await runFile(pool, f);
        }
      }
    }
  }

  await pool.close();
}

// ============================================================================
// SQLite Implementation
// ============================================================================
async function runSqliteMigrations(): Promise<void> {
  const { getDb } = await import('../lib/db/index.js');
  
  // Ensure data directory exists
  const dbPath = process.env.DB_SQLITE_PATH ?? './data/ainova.db';
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`[migrate] SQLite adatmappa létrehozása: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[migrate] SQLite kapcsolódás: ${dbPath}`);
  const db = getDb();

  // Warm-up: force the lazy SQLite connection to open
  try {
    await db.query(`SELECT 1 AS ping`);
  } catch (e) {
    throw new Error(`SQLite kapcsolat sikertelen: ${(e as Error).message}`);
  }
  console.log('[migrate] SQLite kapcsolódva.');

  async function runFile(filePath: string): Promise<void> {
    console.log(`[migrate] ▶ ${path.basename(filePath)}`);
    const sqlText = fs.readFileSync(filePath, 'utf8');
    
    // Split by GO or semicolons
    const batches = sqlText
      .split(/^\s*GO\s*$/im)
      .flatMap((batch: string) => 
        batch.split(';').map((s: string) => s.trim())
      )
      .filter((b: string) => b && !b.split('\n').every(
        (l: string) => l.trim() === '' || l.trim().startsWith('--')
      ));

    for (let i = 0; i < batches.length; i++) {
      try {
        await db.execute(batches[i]);
      } catch (e: unknown) {
        const err = e as Error;
        // SQLite adapter already handles syntax conversion warnings
        if (!err.message.includes('Skipping incompatible')) {
          console.error(`[migrate] ❌ ${path.basename(filePath)} batch ${i + 1}: ${err.message}`);
          throw err;
        }
      }
    }
    console.log(`[migrate] ✅ ${path.basename(filePath)}`);
  }

  const folders = ['core'];

  // Core migrációk
  for (const folder of folders) {
    const dir = path.join(process.cwd(), 'database', folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(dir, f));

    console.log(`[migrate] ${folder}: ${files.length} migráció`);
    for (const f of files) {
      await runFile(f);
    }
  }

  // Modul migrációk
  const modulesDir = path.join(process.cwd(), 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleDirs = fs.readdirSync(modulesDir)
      .filter((f: string) => !f.startsWith('_') && fs.statSync(path.join(modulesDir, f)).isDirectory());

    for (const moduleId of moduleDirs) {
      const migDir = path.join(modulesDir, moduleId, 'migrations');
      if (!fs.existsSync(migDir)) continue;

      const files = fs.readdirSync(migDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort()
        .map((f: string) => path.join(migDir, f));

      if (files.length > 0) {
        console.log(`[migrate] module/${moduleId}: ${files.length} migráció`);
        for (const f of files) {
          await runFile(f);
        }
      }
    }
  }

  await db.close();
}

// ============================================================================
// Main Entry Point
// ============================================================================
async function main(): Promise<void> {
  console.log(`[migrate] Adapter: ${DB_ADAPTER}`);
  
  if (DB_ADAPTER === 'sqlite') {
    await runSqliteMigrations();
  } else if (DB_ADAPTER === 'mssql') {
    await runMssqlMigrations();
  } else {
    throw new Error(`Unsupported DB_ADAPTER: ${DB_ADAPTER}. Use 'mssql' or 'sqlite'.`);
  }
  
  console.log('[migrate] Minden migráció kész. ✅');
}

main().catch((e: unknown) => {
  console.error('[migrate] HIBA:', (e as Error).message);
  process.exit(1);
});
