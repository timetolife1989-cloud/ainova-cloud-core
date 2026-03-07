/**
 * Futtatja az összes core migrációt sorban.
 * Biztonságos: minden migráció idempotens (IF NOT EXISTS).
 * Használat: npx tsx scripts/migrate-all.ts
 */
import sql from 'mssql';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

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
      console.log(`[migrate] DB kapcsolódás... (${i}/${retries})`);
      const pool = await sql.connect(cfg);
      console.log('[migrate] Kapcsolódva.');
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

async function main(): Promise<void> {
  const folders = ['core'];  // Csak core — LAC modul opcionális
  const pool = await waitForDb();

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

  await pool.close();
  console.log('[migrate] Minden migráció kész. ✅');
}

main().catch((e: unknown) => {
  console.error('[migrate] HIBA:', (e as Error).message);
  process.exit(1);
});
