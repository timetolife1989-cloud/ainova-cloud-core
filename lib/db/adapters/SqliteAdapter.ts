/**
 * SQLite Database Adapter
 * =======================
 * Implements IDatabaseAdapter using `better-sqlite3`.
 * Synchronous driver wrapped in async interface.
 * For small deployments, demos, and testing.
 */

import type { IDatabaseAdapter, QueryParam } from '../IDatabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let betterSqlite3: any = null;

function getBetterSqlite3() {
  if (!betterSqlite3) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      betterSqlite3 = require('better-sqlite3');
    } catch {
      throw new Error(
        'SQLite adapter requires "better-sqlite3". Install it: npm install better-sqlite3 @types/better-sqlite3'
      );
    }
  }
  return betterSqlite3;
}

/**
 * Convert MSSQL-style @param SQL to SQLite ? placeholders.
 * Returns { sql, values } where values is ordered array.
 */
function convertParams(
  sqlStr: string,
  params: QueryParam[] = []
): { sql: string; values: unknown[] } {
  if (!params.length) return { sql: sqlStr, values: [] };

  // Convert values and build map
  const paramMap = new Map<string, unknown>();
  for (const p of params) {
    let val = p.value;
    if (val instanceof Date) {
      val = val.toISOString();
    } else if (typeof val === 'boolean') {
      val = val ? 1 : 0;
    } else if (val !== null && val !== undefined && typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'bigint' && !Buffer.isBuffer(val)) {
      val = String(val);
    }
    paramMap.set(p.name, val ?? null);
  }

  // Find all @param occurrences in order they appear in SQL
  const values: unknown[] = [];
  const paramPattern = /@(\w+)\b/g;
  let converted = sqlStr;
  let match;
  
  // First pass: collect param names in order they appear
  const orderedNames: string[] = [];
  while ((match = paramPattern.exec(sqlStr)) !== null) {
    orderedNames.push(match[1]);
  }

  // Second pass: replace all params with ? and build values array
  const sorted = [...params].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    const regex = new RegExp(`@${p.name}\\b`, 'g');
    converted = converted.replace(regex, '?');
  }

  // Build values array in the order params appear in SQL
  for (const name of orderedNames) {
    values.push(paramMap.get(name) ?? null);
  }

  return { sql: converted, values };
}

/**
 * Convert MSSQL-specific SQL syntax to SQLite equivalents.
 */
function convertSqlSyntax(sqlStr: string): string {
  let s = sqlStr;

  // SYSDATETIME() → ISO 8601 UTC format (with 'Z' suffix so JS new Date() parses as UTC)
  s = s.replace(/SYSDATETIME\(\)/gi, "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");

  // DATEADD(MINUTE, -15, field) → strftime (ISO 8601 output consistent with SYSDATETIME fix)
  s = s.replace(/DATEADD\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*([^)]+)\s*\)/gi, (_match, unit, amount, field) => {
    const pgUnit = unit.toLowerCase() === 'minute' ? 'minutes' : `${unit.toLowerCase()}s`;
    return `strftime('%Y-%m-%dT%H:%M:%fZ', ${field.trim()}, '${amount} ${pgUnit}')`;
  });

  // OUTPUT INSERTED.id → strip entirely (handled via lastInsertRowid in query())
  s = s.replace(/\s*OUTPUT\s+INSERTED\.\w+/gi, '');

  // OFFSET..FETCH → LIMIT..OFFSET (supports both literal numbers and @param placeholders)
  s = s.replace(
    /OFFSET\s+(@?\w+)\s+ROWS\s+FETCH\s+NEXT\s+(@?\w+)\s+ROWS\s+ONLY/gi,
    'LIMIT $2 OFFSET $1'
  );

  // TOP N → (handled differently — move to LIMIT)
  s = s.replace(/SELECT\s+TOP\s+(\d+)\s+/gi, (match, n) => {
    // Will add LIMIT at the end — mark for post-processing
    return `SELECT /*TOP${n}*/ `;
  });

  // Post-process TOP → LIMIT
  if (s.includes('/*TOP')) {
    const topMatch = s.match(/\/\*TOP(\d+)\*\//);
    if (topMatch) {
      s = s.replace(/\/\*TOP\d+\*\/\s*/, '');
      if (!s.match(/LIMIT\s+\d+/i)) {
        s = s.trimEnd() + ` LIMIT ${topMatch[1]}`;
      }
    }
  }

  // NVARCHAR → TEXT (for CREATE TABLE in migrations)
  s = s.replace(/NVARCHAR\(\s*MAX\s*\)/gi, 'TEXT');
  s = s.replace(/NVARCHAR\(\s*\d+\s*\)/gi, 'TEXT');
  s = s.replace(/DATETIME2/gi, 'TEXT');
  s = s.replace(/BIT/gi, 'INTEGER');

  // IF NOT EXISTS (SELECT ...) INSERT → INSERT OR IGNORE
  // Handle MSSQL conditional insert pattern
  if (/IF\s+NOT\s+EXISTS\s*\(/i.test(s)) {
    // Extract the INSERT statement if present
    const insertMatch = s.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      s = `INSERT OR IGNORE INTO ${insertMatch[1]} (${insertMatch[2]}) VALUES (${insertMatch[3]})`;
    } else {
      // Skip the entire IF NOT EXISTS block — return empty
      s = '-- skipped MSSQL IF NOT EXISTS';
    }
  }

  // MERGE statements → INSERT OR REPLACE (accept any alias, not just 'target')
  if (/^\s*MERGE\s+/i.test(s)) {
    const mergeMatch = s.match(/MERGE\s+(\w+)\s+(?:AS\s+\w+\s+)?/i);
    if (mergeMatch) {
      const insertMatch = s.match(/INSERT\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (insertMatch) {
        const tableName = mergeMatch[1];
        const cols = insertMatch[1];
        const vals = insertMatch[2];
        s = `INSERT OR REPLACE INTO ${tableName} (${cols}) VALUES (${vals})`;
      }
    }
  }

  return s;
}

export class SqliteAdapter implements IDatabaseAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private _connected = false;

  private getDb() {
    if (this.db) return this.db;

    const Database = getBetterSqlite3();
    const dbPath = process.env.DB_SQLITE_PATH ?? './data/ainova.db';

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = OFF');
    this._connected = true;

    return this.db;
  }

  async query<T = Record<string, unknown>>(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<T[]> {
    const db = this.getDb();
    const converted = convertParams(convertSqlSyntax(sqlStr), params);

    // Skip converted-away statements
    if (converted.sql.startsWith('--') || !converted.sql.trim()) {
      return [] as T[];
    }

    try {
      // Detect INSERT statements → use run() + lastInsertRowid instead of all()
      const trimmed = converted.sql.replace(/^[\s;]+/, '').toUpperCase();
      if (trimmed.startsWith('INSERT')) {
        const stmt = db.prepare(converted.sql);
        const result = stmt.run(...converted.values);
        return [{ id: Number(result.lastInsertRowid) }] as T[];
      }

      const stmt = db.prepare(converted.sql);
      return stmt.all(...converted.values) as T[];
    } catch (err) {
      // Silently handle MSSQL-specific SQL that couldn't be converted
      const msg = (err as Error).message ?? '';
      if (msg.includes('syntax error') || msg.includes('no such') || msg.includes('near')) {
        console.warn(`[SqliteAdapter] Skipping incompatible SQL: ${msg}`);
        return [] as T[];
      }
      throw err;
    }
  }

  async execute(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }> {
    const db = this.getDb();
    const converted = convertParams(convertSqlSyntax(sqlStr), params);

    // Skip converted-away statements
    if (converted.sql.startsWith('--') || !converted.sql.trim()) {
      return { rowsAffected: 0 };
    }

    try {
      const stmt = db.prepare(converted.sql);
      const result = stmt.run(...converted.values);
      return { rowsAffected: result.changes };
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('syntax error') || msg.includes('no such') || msg.includes('near')) {
        console.warn(`[SqliteAdapter] Skipping incompatible SQL: ${msg}`);
        return { rowsAffected: 0 };
      }
      throw err;
    }
  }

  async transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const db = this.getDb();
    const txFn = db.transaction(async () => {
      return fn(this);
    });
    return txFn();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this._connected = false;
    }
  }

  isConnected(): boolean {
    return this._connected;
  }
}
