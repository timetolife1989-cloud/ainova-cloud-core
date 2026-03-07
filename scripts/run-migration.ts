/**
 * Migration runner
 * Usage:
 *   npx tsx scripts/run-migration.ts 001              -- prefix, keres database/core/-ban
 *   npx tsx scripts/run-migration.ts all:core         -- összes core migráció
 *   npx tsx scripts/run-migration.ts all:lac          -- összes lac migráció
 *   npx tsx scripts/run-migration.ts database/lac/001_lac_sap_visszajelentes.sql  -- konkrét fájl
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

async function runFile(pool: sql.ConnectionPool, filePath: string): Promise<void> {
  console.log(`\n▶ ${path.basename(filePath)}`);
  console.log('─'.repeat(55));

  const sqlText = fs.readFileSync(filePath, 'utf8');
  const batches = sqlText
    .split(/^\s*GO\s*$/im)
    .map((b: string) => b.trim())
    .filter((b: string) => {
      if (!b) return false;
      return !b.split('\n').every(
        (line: string) => line.trim() === '' || line.trim().startsWith('--')
      );
    });

  let idx = 0;
  for (const batch of batches) {
    idx++;
    try {
      const res = await pool.request().query(batch);
      if (res.recordset && res.recordset.length > 0) {
        const row = res.recordset[0];
        const summary = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ');
        console.log(`  ✅ Batch ${idx}: ${summary}`);
      } else {
        const affected = Array.isArray(res.rowsAffected)
          ? (res.rowsAffected as number[]).reduce((a, b) => a + b, 0)
          : (res.rowsAffected ?? 0);
        const firstLine = batch.split('\n').find((l: string) => l.trim() && !l.trim().startsWith('--')) ?? '';
        console.log(`  ✅ Batch ${idx}: ${firstLine.slice(0, 60)}… (${affected} rows)`);
      }
    } catch (e: unknown) {
      const err = e as Error & { number?: number };
      console.error(`  ❌ Batch ${idx} FAILED: ${err.message}`);
      if (err.number) console.error(`     SQL Error #${err.number}`);
      console.error(`     SQL kezdete: ${batch.slice(0, 200)}`);
      throw err;
    }
  }
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Használat: npx tsx scripts/run-migration.ts <prefix|all:core|all:lac|fájl.sql>');
    console.error('Példák:');
    console.error('  npx tsx scripts/run-migration.ts 001');
    console.error('  npx tsx scripts/run-migration.ts all:core');
    console.error('  npx tsx scripts/run-migration.ts all:lac');
    console.error('  npx tsx scripts/run-migration.ts database/lac/001_lac_sap_visszajelentes.sql');
    process.exit(1);
  }

  let files: string[] = [];

  if (arg === 'all:core' || arg === 'all:lac') {
    const folder = arg === 'all:core' ? 'core' : 'lac';
    const dir = path.join(process.cwd(), 'database', folder);
    files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()
      .map((f: string) => path.join(dir, f));
    console.log(`\n🗂  ${files.length} migráció a database/${folder}/ könyvtárban`);
  } else if (arg.endsWith('.sql')) {
    const full = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
    if (!fs.existsSync(full)) {
      console.error(`Fájl nem található: ${full}`);
      process.exit(1);
    }
    files = [full];
  } else {
    // prefix — keres database/core/-ban
    const dir = path.join(process.cwd(), 'database', 'core');
    const found = fs.readdirSync(dir)
      .filter((f: string) => f.startsWith(arg) && f.endsWith('.sql'))
      .sort();
    if (found.length === 0) {
      console.error(`Nem találtam "${arg}*.sql" fájlt a database/core/ könyvtárban`);
      process.exit(1);
    }
    files = [path.join(dir, found[0])];
  }

  const pool = await sql.connect(cfg);
  try {
    for (const f of files) {
      await runFile(pool, f);
    }
  } catch {
    await pool.close();
    process.exit(1);
  }

  await pool.close();
  console.log('\n✅ Minden migráció kész!\n');
}

main().catch((e: unknown) => {
  console.error('FATAL:', (e as Error).message);
  process.exit(1);
});
