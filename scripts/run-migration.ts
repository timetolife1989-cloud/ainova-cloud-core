/**
 * Core migration runner
 * Usage: npx tsx scripts/run-migration.ts <prefix>
 * Examples:
 *   npx tsx scripts/run-migration.ts 001
 *   npx tsx scripts/run-migration.ts 001_core_users
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

async function main(): Promise<void> {
  const prefix = process.argv[2];
  if (!prefix) {
    console.error('Usage: npx tsx scripts/run-migration.ts <prefix>');
    console.error('Example: npx tsx scripts/run-migration.ts 001');
    process.exit(1);
  }

  const migDir = path.join(process.cwd(), 'database', 'core');
  if (!fs.existsSync(migDir)) {
    console.error(`Migration directory not found: ${migDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migDir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error(`No SQL files matching "${prefix}*.sql" in ${migDir}`);
    process.exit(1);
  }

  const file = files[0];
  console.log(`\n▶ Running migration: ${file}`);
  console.log('─'.repeat(50));

  const sqlText = fs.readFileSync(path.join(migDir, file), 'utf8');

  // Split on GO statement (case-insensitive, whole line)
  const batches = sqlText
    .split(/^\s*GO\s*$/im)
    .map(b => b.trim())
    .filter(b => {
      if (!b) return false;
      // Skip comment-only batches
      return !b.split('\n').every(
        line => line.trim() === '' || line.trim().startsWith('--')
      );
    });

  const pool = await sql.connect(cfg);
  let batchIndex = 0;

  for (const batch of batches) {
    batchIndex++;
    try {
      const result = await pool.request().query(batch);

      // If batch returned rows (e.g. SELECT COUNT(*)), print them
      if (result.recordset && result.recordset.length > 0) {
        const row = result.recordset[0];
        const summary = Object.entries(row)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        console.log(`  ✅ Batch ${batchIndex}: ${summary}`);
      } else {
        const affected = Array.isArray(result.rowsAffected)
          ? result.rowsAffected.reduce((a, b) => a + b, 0)
          : (result.rowsAffected ?? 0);
        const firstLine = batch.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) ?? '';
        console.log(`  ✅ Batch ${batchIndex}: ${firstLine.slice(0, 60)}… (${affected} rows affected)`);
      }
    } catch (e: unknown) {
      const err = e as Error & { number?: number };
      console.error(`  ❌ Batch ${batchIndex} FAILED: ${err.message}`);
      if (err.number) console.error(`     SQL Error #${err.number}`);
      console.error(`     SQL: ${batch.slice(0, 200)}`);
      await pool.close();
      process.exit(1);
    }
  }

  await pool.close();
  console.log('\n✅ Migration complete!\n');
}

main().catch((e: unknown) => {
  console.error('FATAL:', (e as Error).message);
  process.exit(1);
});
