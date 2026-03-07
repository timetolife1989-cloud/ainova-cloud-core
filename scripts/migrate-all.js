#!/usr/bin/env node
/**
 * Ainova Cloud Core — Automatikus DB migráció
 * Plain JS, fut: node scripts/migrate-all.js
 * Hívja a Docker entrypoint induláskor.
 * Idempotens: biztonságos többször futtatni.
 */
'use strict';

const sql  = require('mssql');
const fs   = require('fs');
const path = require('path');

const cfg = {
  server:   process.env.DB_SERVER   || 'db',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt:                true,
    trustServerCertificate: true,
    enableArithAbort:       true,
  },
  connectionTimeout: 30000,
  requestTimeout:    120000,
};

async function waitForDb(retries, delayMs) {
  for (let i = 1; i <= retries; i++) {
    try {
      process.stdout.write(`[migrate] DB kapcsolódás... (${i}/${retries})\n`);
      // Először master-be, hogy létre tudjuk hozni az adatbázist
      const pool = await sql.connect({ ...cfg, database: 'master' });
      process.stdout.write('[migrate] Kapcsolódva.\n');
      return pool;
    } catch (e) {
      if (i === retries) throw e;
      process.stdout.write(`[migrate] Várok ${delayMs}ms... (${e.message})\n`);
      await new Promise(r => setTimeout(r, delayMs));
      await sql.close().catch(() => {});
    }
  }
}

async function runBatches(pool, sqlText, label) {
  const batches = sqlText
    .split(/^\s*GO\s*$/im)
    .map(b => b.trim())
    .filter(b => b && !b.split('\n').every(l => l.trim() === '' || l.trim().startsWith('--')));

  for (let i = 0; i < batches.length; i++) {
    try {
      await pool.request().query(batches[i]);
    } catch (e) {
      process.stderr.write(`[migrate] ❌ ${label} batch ${i + 1}: ${e.message}\n`);
      process.stderr.write(`[migrate]    SQL: ${batches[i].slice(0, 150)}\n`);
      throw e;
    }
  }
}

async function main() {
  const dbName = process.env.DB_DATABASE || 'AinovaCloudCore';

  // 1. Várakozás + kapcsolódás master-hez
  const masterPool = await waitForDb(30, 3000);

  // 2. Adatbázis létrehozása ha nem létezik
  process.stdout.write(`[migrate] Adatbázis: ${dbName}\n`);
  await masterPool.request().query(
    `IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = '${dbName}')
       CREATE DATABASE [${dbName}]`
  );
  await masterPool.close();
  await sql.close().catch(() => {});

  // 3. Kapcsolódás az adatbázishoz
  const pool = await sql.connect({ ...cfg, database: dbName });

  // 4. Core migrációk futtatása
  const coreDir = path.join(__dirname, '..', 'database', 'core');
  if (fs.existsSync(coreDir)) {
    const files = fs.readdirSync(coreDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    process.stdout.write(`[migrate] ${files.length} core migráció...\n`);
    for (const f of files) {
      const sqlText = fs.readFileSync(path.join(coreDir, f), 'utf8');
      await runBatches(pool, sqlText, f);
      process.stdout.write(`[migrate] ✅ ${f}\n`);
    }
  }

  await pool.close();
  process.stdout.write('[migrate] ✅ Minden migráció kész!\n');
}

main().catch(e => {
  process.stderr.write(`[migrate] FATÁLIS HIBA: ${e.message}\n`);
  process.exit(1);
});
