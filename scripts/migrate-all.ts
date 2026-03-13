/**
 * Runs all core migrations in sequence.
 * Safe: all migrations are idempotent (IF NOT EXISTS).
 * Usage: npx tsx scripts/migrate-all.ts
 * 
 * Supported adapters: mssql, sqlite, postgres
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
        console.log(`[migrate] MSSQL connecting... (${i}/${retries})`);
        const pool = await sql.connect(cfg);
        console.log('[migrate] MSSQL connected.');
        return pool;
      } catch (e: unknown) {
        const msg = (e as Error).message;
        if (i === retries) throw e;
        console.log(`[migrate] Not yet available: ${msg} — waiting ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw new Error('DB not reachable');
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

  // Core migrations
  for (const folder of folders) {
    const dir = path.join(process.cwd(), 'database', folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(dir, f));

    console.log(`[migrate] ${folder}: ${files.length} migrations`);
    for (const f of files) {
      await runFile(pool, f);
    }
  }

  // Module migrations
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
        console.log(`[migrate] module/${moduleId}: ${files.length} migrations`);
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
    console.log(`[migrate] SQLite data directory created: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[migrate] SQLite connecting: ${dbPath}`);
  const db = getDb();

  // Warm-up: force the lazy SQLite connection to open
  try {
    await db.query(`SELECT 1 AS ping`);
  } catch (e) {
    throw new Error(`SQLite connection failed: ${(e as Error).message}`);
  }
  console.log('[migrate] SQLite connected.');

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

  // Core migrations
  for (const folder of folders) {
    const dir = path.join(process.cwd(), 'database', folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(dir, f));

    console.log(`[migrate] ${folder}: ${files.length} migrations`);
    for (const f of files) {
      await runFile(f);
    }
  }

  // Module migrations
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
        console.log(`[migrate] module/${moduleId}: ${files.length} migrations`);
        for (const f of files) {
          await runFile(f);
        }
      }
    }
  }

  await db.close();
}

// ============================================================================
// PostgreSQL Implementation
// ============================================================================

/**
 * Convert MSSQL DDL SQL to PostgreSQL-compatible syntax.
 * Handles: types, IF NOT EXISTS, IDENTITY, BIT, NVARCHAR, DATETIME2,
 *          SYSDATETIME, GETDATE, NEWID, ISNULL, DATEPART, PRINT, N'...' strings,
 *          sys.tables/sys.indexes checks, INFORMATION_SCHEMA patterns.
 */
function convertMssqlToPostgres(sqlText: string): string {
  let s = sqlText;

  // ── Phase 0: Remove noise ──────────────────────────────────────────
  // Remove GO batch separators
  s = s.replace(/^\s*GO\s*$/gim, '');

  // Remove PRINT statements (standalone and after ELSE)
  s = s.replace(/\bELSE\s+PRINT\s+'[^']*'\s*;?\s*/gi, '');
  s = s.replace(/^\s*PRINT\s+'[^']*'\s*;?\s*$/gim, '');

  // Remove SELECT COUNT(*) AS x FROM table (diagnostic queries at end of migration)
  s = s.replace(/^\s*SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+\w+\s+FROM\s+\w+\s*;?\s*$/gim, '');

  // Remove dbo. prefix
  s = s.replace(/\bdbo\./gi, '');

  // ── Phase 1: IF NOT EXISTS → PG-native idempotent forms ───────────

  // Pattern A: IF NOT EXISTS (... INFORMATION_SCHEMA.TABLES ...) BEGIN ... END
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+INFORMATION_SCHEMA\.TABLES[^)]*\)\s*\r?\n\s*BEGIN\s*([\s\S]*?)\s*\bEND\b/gi,
    (_match, body: string) => {
      return body.replace(/CREATE\s+TABLE\s+/gi, 'CREATE TABLE IF NOT EXISTS ');
    }
  );

  // Pattern B: IF NOT EXISTS (... INFORMATION_SCHEMA.TABLES ...) CREATE TABLE ... (no BEGIN/END)
  // Match: the CREATE TABLE through its closing );
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+INFORMATION_SCHEMA\.TABLES[^)]*\)\s*\r?\n\s*(CREATE\s+TABLE\s+[\s\S]*?\);)/gi,
    (_match, createStmt: string) => {
      return createStmt.replace(/CREATE\s+TABLE\s+/gi, 'CREATE TABLE IF NOT EXISTS ');
    }
  );

  // Pattern C: IF NOT EXISTS (... sys.tables ...) BEGIN ... END
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+[*1]\s+FROM\s+sys\.tables[^)]*\)\s*\r?\n\s*BEGIN\s*([\s\S]*?)\s*\bEND\b/gi,
    (_match, body: string) => {
      return body.replace(/CREATE\s+TABLE\s+/gi, 'CREATE TABLE IF NOT EXISTS ');
    }
  );

  // Pattern D: IF NOT EXISTS (... sys.tables ...) CREATE TABLE ... (no BEGIN/END)
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+[*1]\s+FROM\s+sys\.tables[^)]*\)\s*\r?\n\s*(CREATE\s+TABLE\s+[\s\S]*?\);)/gi,
    (_match, createStmt: string) => {
      return createStmt.replace(/CREATE\s+TABLE\s+/gi, 'CREATE TABLE IF NOT EXISTS ');
    }
  );

  // Pattern E: IF NOT EXISTS (... sys.indexes ... OBJECT_ID ...) CREATE [UNIQUE] INDEX ...
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+[*1]\s+FROM\s+sys\.indexes[\s\S]*?OBJECT_ID[\s\S]*?\)\s*\r?\n\s*(CREATE\s+(?:UNIQUE\s+)?INDEX\s+[\s\S]*?)(?=\n\s*(?:IF|CREATE|ALTER|INSERT|--|$))/gim,
    (_match, createIndex: string) => {
      return createIndex.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+/gi, 'CREATE $1INDEX IF NOT EXISTS ');
    }
  );

  // Pattern F: IF NOT EXISTS (... sys.indexes ... OBJECT_ID ...) ALTER TABLE ... ADD CONSTRAINT ...
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+[*1]\s+FROM\s+sys\.indexes[\s\S]*?OBJECT_ID[\s\S]*?\)\s*\r?\n\s*(ALTER\s+TABLE\s+\w+\s+ADD\s+CONSTRAINT\s+\w+\s+UNIQUE\s*\([^)]+\))\s*;?/gi,
    (_match, alterStmt: string) => {
      // Extract table, constraint name, and columns to create a DO NOTHING-style statement
      const m = alterStmt.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+UNIQUE\s*\(([^)]+)\)/i);
      if (m) {
        return `ALTER TABLE ${m[1]} ADD CONSTRAINT ${m[2]} UNIQUE (${m[3]});`;
      }
      return alterStmt + ';';
    }
  );

  // Patterns G+H: IF NOT EXISTS (...) BEGIN ... END and single-statement conditional inserts
  // Handled by Phase 3 catch-alls (strip IF wrapper, rely on error handler for 23505 duplicates)

  // ── Phase 2: Type conversions ─────────────────────────────────────
  // INT IDENTITY(1,1) → SERIAL
  s = s.replace(/\bINT\s+IDENTITY\s*\(\s*1\s*,\s*1\s*\)/gi, 'SERIAL');
  // BIGINT IDENTITY(1,1) → BIGSERIAL
  s = s.replace(/\bBIGINT\s+IDENTITY\s*\(\s*1\s*,\s*1\s*\)/gi, 'BIGSERIAL');

  // NVARCHAR(MAX) → TEXT
  s = s.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');
  // NVARCHAR(n) → VARCHAR(n)
  s = s.replace(/\bNVARCHAR\s*\(\s*(\d+)\s*\)/gi, 'VARCHAR($1)');
  // VARCHAR(MAX) → TEXT
  s = s.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, 'TEXT');

  // BIT → BOOLEAN (with default conversion)
  s = s.replace(/\bBIT\b\s+NOT\s+NULL\s+DEFAULT\s+1/gi, 'BOOLEAN NOT NULL DEFAULT TRUE');
  s = s.replace(/\bBIT\b\s+NOT\s+NULL\s+DEFAULT\s+0/gi, 'BOOLEAN NOT NULL DEFAULT FALSE');
  s = s.replace(/\bBIT\b\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT TRUE');
  s = s.replace(/\bBIT\b\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT FALSE');
  s = s.replace(/\bBIT\b/gi, 'BOOLEAN');

  // Note: BIT literal conversion (,1) → ,true) applied only in INSERT statements (in runFile)

  // Convert boolean comparisons: is_xyz = 1 → is_xyz = true, is_xyz = 0 → is_xyz = false
  s = s.replace(/\b(is_\w+)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(is_\w+)\s*=\s*0\b/gi, '$1 = false');

  // DATETIME2 → TIMESTAMPTZ
  s = s.replace(/\bDATETIME2\b/gi, 'TIMESTAMPTZ');
  // DATETIME → TIMESTAMPTZ (must be after DATETIME2)
  s = s.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');

  // CHAR(1) stays valid in PG

  // DECIMAL stays valid in PG

  // SYSDATETIME() → CURRENT_TIMESTAMP
  s = s.replace(/\bSYSDATETIME\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  // GETDATE() → CURRENT_TIMESTAMP
  s = s.replace(/\bGETDATE\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');

  // UNIQUEIDENTIFIER → UUID
  s = s.replace(/\bUNIQUEIDENTIFIER\b/gi, 'UUID');
  // NEWID() → gen_random_uuid()
  s = s.replace(/\bNEWID\s*\(\s*\)/gi, 'gen_random_uuid()');

  // ISNULL(x, y) → COALESCE(x, y)
  s = s.replace(/\bISNULL\s*\(/gi, 'COALESCE(');

  // @@DATEFIRST → 1 (ISO standard, Monday=1) — must run before DATEADD
  s = s.replace(/@@DATEFIRST/gi, '1');

  // DATEPART(dw, x) → EXTRACT(DOW FROM x) — must run before DATEADD and general DATEPART
  s = s.replace(/\bDATEPART\s*\(\s*dw\s*,\s*([^)]+)\)/gi, 'EXTRACT(DOW FROM $1)');

  // DATEPART(unit, col) → EXTRACT(unit FROM col) — must run before DATEADD
  s = s.replace(/\bDATEPART\s*\(\s*(\w+)\s*,\s*([^)]+)\)/gi, 'EXTRACT($1 FROM $2)');

  // DATEADD(unit, n, date) → (date + (n) * INTERVAL '1 unit') — runs after DATEPART
  s = s.replace(
    /\bDATEADD\s*\(\s*(\w+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/gi,
    (_m, unit: string, n: string, d: string) => `(${d.trim()} + (${n.trim()}) * INTERVAL '1 ${unit.toLowerCase()}')`
  );

  // Remove N'' string prefix (PG handles unicode natively)
  s = s.replace(/\bN'/gi, "'");

  // MSSQL bracket identifiers [Name] → Name (PG folds to lowercase)
  // Lookahead ensures we only strip DDL identifiers, not [RL] inside LIKE strings
  s = s.replace(/\[(\w+)\](?=[\s,)])/g, '$1');

  // LIKE '...[XY]...' (MSSQL character set syntax) → SIMILAR TO '...[XY]...'
  s = s.replace(/\bLIKE\s+'([^']*\[[^\]]+\][^']*)'/gi, "SIMILAR TO '$1'");

  // LTRIM(RTRIM(x)) → TRIM(x)
  s = s.replace(/LTRIM\s*\(\s*RTRIM\s*\(\s*([^)]+)\s*\)\s*\)/gi, 'TRIM($1)');

  // CREATE OR ALTER VIEW → CREATE OR REPLACE VIEW
  s = s.replace(/\bCREATE\s+OR\s+ALTER\s+VIEW\b/gi, 'CREATE OR REPLACE VIEW');

  // IF EXISTS (...) DROP VIEW name → DROP VIEW IF EXISTS name
  s = s.replace(
    /IF\s+EXISTS\s*\([^)]*\)\s*\r?\n\s*DROP\s+VIEW\s+(\w+)\s*;?/gi,
    'DROP VIEW IF EXISTS $1;'
  );

  // ── Phase 3: Cleanup remaining IF NOT EXISTS wrappers that weren't caught ─
  // Catch-all: any remaining IF NOT EXISTS ... that wraps a CREATE TABLE
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\([^)]*\)\s*\r?\n\s*(CREATE\s+TABLE\s+[\s\S]*?\);)/gi,
    (_match, createStmt: string) => {
      return createStmt.replace(/CREATE\s+TABLE\s+(?!IF\s)/gi, 'CREATE TABLE IF NOT EXISTS ');
    }
  );

  // Catch-all: any remaining IF NOT EXISTS ... that wraps a CREATE INDEX
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\([^)]*(?:\([^)]*\))*[^)]*\)\s*\r?\n\s*(CREATE\s+(?:UNIQUE\s+)?INDEX\s+.*)/gim,
    (_match, createIndex: string) => {
      return createIndex.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s)/gi, 'CREATE $1INDEX IF NOT EXISTS ');
    }
  );

  // Catch-all: any remaining IF NOT EXISTS ... ALTER TABLE ADD CONSTRAINT
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\([^)]*(?:\([^)]*\))*[^)]*\)\s*\r?\n\s*(ALTER\s+TABLE\s+\w+\s+ADD\s+CONSTRAINT\s+[^\n;]+)/gim,
    '$1'
  );

  // Catch-all: any remaining IF NOT EXISTS (...) BEGIN ... END blocks (conditional inserts)
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\([^)]*(?:\([^)]*\))*[^)]*\)\s*\r?\n\s*BEGIN\s*([\s\S]*?)\s*\bEND\b/gi,
    '$1'
  );

  // Catch-all: remove any standalone remaining IF NOT EXISTS (...) single-statement  
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\([^)]*(?:\([^)]*\))*[^)]*\)\s*\r?\n/gi,
    ''
  );

  return s;
}

async function runPostgresMigrations(): Promise<void> {
  // Dynamic import of pg
  let pgModule: { Pool: new (config: Record<string, unknown>) => {
    connect(): Promise<{ query(sql: string): Promise<unknown>; release(): void }>;
    query(sql: string): Promise<{ rows: unknown[] }>;
    end(): Promise<void>;
  }};
  try {
    pgModule = await import(/* webpackIgnore: true */ 'pg') as typeof pgModule;
  } catch {
    throw new Error('PostgreSQL adapter requires the "pg" package. Install it: npm install pg');
  }

  const config = {
    host:     process.env.DB_SERVER ?? 'localhost',
    database: process.env.DB_DATABASE ?? 'postgres',
    user:     process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    max:      5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '30000', 10),
    ssl: { rejectUnauthorized: false },
  };

  async function waitForDb(retries = 10, delayMs = 3000) {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[migrate] PostgreSQL connecting... (${i}/${retries})`);
        const pool = new pgModule.Pool(config);
        const client = await pool.connect();
        client.release();
        console.log('[migrate] PostgreSQL connected.');
        return pool;
      } catch (e: unknown) {
        const msg = (e as Error).message;
        if (i === retries) throw e;
        console.log(`[migrate] Not yet available: ${msg} — waiting ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw new Error('DB not reachable');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function runFile(pool: any, filePath: string): Promise<void> {
    console.log(`[migrate] ▶ ${path.basename(filePath)}`);
    const rawSql = fs.readFileSync(filePath, 'utf8');
    const pgSql = convertMssqlToPostgres(rawSql);

    // Split into statements by semicolon, respecting comments and string literals
    // First, strip inline comments that contain semicolons to avoid false splits
    const cleanedSql = pgSql.replace(/--[^\n]*;[^\n]*/g, (m) => m.replace(/;/g, '##SC##'));
    const statements = cleanedSql
      .split(';')
      .map((s: string) => s.replace(/##SC##/g, ';').trim())
      .filter((s: string) => s && !s.split('\n').every(
        (l: string) => l.trim() === '' || l.trim().startsWith('--')
      ));

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      // Convert BIT literal values in INSERT statements: ,1) → ,true) and ,0) → ,false)
      if (/^\s*INSERT/i.test(stmt)) {
        stmt = stmt.replace(/(?<!\(\d+),\s*1\s*\)/g, ', true)');
        stmt = stmt.replace(/(?<!\(\d+),\s*0\s*\)/g, ', false)');
      }
      try {
        await pool.query(stmt);
      } catch (e: unknown) {
        const err = e as Error & { code?: string };
        // Skip "already exists" errors (42P07), "duplicate" (23505), "duplicate object" (42710)
        if (err.code === '42P07' || err.code === '23505' || err.code === '42710') {
          // Object already exists — idempotent, skip
          continue;
        }
        // Skip "column/constraint already exists" (42701)
        if (err.code === '42701') continue;
        console.error(`[migrate] ❌ ${path.basename(filePath)} stmt ${i + 1}: ${err.message}`);
        console.error(`[migrate]    SQL: ${stmt.slice(0, 120)}...`);
        // Don't throw — try remaining statements (idempotent migrations)
      }
    }
    console.log(`[migrate] ✅ ${path.basename(filePath)}`);
  }

  const pool = await waitForDb();

  // Core migrations
  const coreDir = path.join(process.cwd(), 'database', 'core');
  if (fs.existsSync(coreDir)) {
    const files = fs.readdirSync(coreDir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(coreDir, f));

    console.log(`[migrate] core: ${files.length} migrations`);
    for (const f of files) {
      await runFile(pool, f);
    }
  }

  // Module migrations
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
        console.log(`[migrate] module/${moduleId}: ${files.length} migrations`);
        for (const f of files) {
          await runFile(pool, f);
        }
      }
    }
  }

  await pool.end();
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
  } else if (DB_ADAPTER === 'postgres') {
    await runPostgresMigrations();
  } else {
    throw new Error(`Unsupported DB_ADAPTER: ${DB_ADAPTER}. Use 'mssql', 'postgres', or 'sqlite'.`);
  }
  
  console.log('[migrate] All migrations complete. ✅');
}

main().catch((e: unknown) => {
  console.error('[migrate] ERROR:', (e as Error).message);
  process.exit(1);
});
