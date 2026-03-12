/**
 * PostgreSQL Database Adapter
 * ===========================
 * Implements IDatabaseAdapter using the `pg` driver.
 * Connection pooling via pg.Pool.
 * Parameter syntax: $1, $2, ... (converted from @name format)
 */

import type { IDatabaseAdapter, QueryParam } from '../IDatabase';
import pg from 'pg';

// Override pg date/timestamp parser to return ISO strings instead of Date objects.
// This ensures consistency: `String(value).split('T')[0]` works for date formatting.
// Type OIDs: 1082=DATE, 1114=TIMESTAMP, 1184=TIMESTAMPTZ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pgTypes = (pg as any).types;
pgTypes.setTypeParser(1082, (val: string) => val); // DATE → 'YYYY-MM-DD'
pgTypes.setTypeParser(1114, (val: string) => val); // TIMESTAMP → ISO string
pgTypes.setTypeParser(1184, (val: string) => val); // TIMESTAMPTZ → ISO string
pgTypes.setTypeParser(1700, (val: string) => parseFloat(val)); // NUMERIC/DECIMAL → number

function getConfig() {
  const isCloud = (process.env.DEPLOYMENT_FLAVOR === 'cloud') ||
                  (process.env.DB_SERVER ?? '').includes('supabase.com');
  return {
    host:     process.env.DB_SERVER ?? 'localhost',
    database: process.env.DB_DATABASE ?? 'ainova',
    user:     process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    max:      parseInt(process.env.DB_POOL_MAX ?? '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '30000', 10),
    application_name: 'ainova-cloud-core',
    // Supabase Transaction Pooler (PgBouncer) requires SSL and no prepared statements
    ...(isCloud ? {
      ssl: { rejectUnauthorized: false },
    } : {}),
  };
}

/**
 * Convert MSSQL-style @param SQL to PostgreSQL $N style.
 * Returns { sql, values } where values is ordered array.
 */
function convertParams(
  sqlStr: string,
  params: QueryParam[] = []
): { sql: string; values: unknown[] } {
  if (!params.length) return { sql: sqlStr, values: [] };

  const values: unknown[] = [];
  let converted = sqlStr;

  // Sort by name length descending to avoid partial replacements (e.g. @p10 vs @p1)
  const sorted = [...params].sort((a, b) => b.name.length - a.name.length);

  for (const p of sorted) {
    const regex = new RegExp(`@${p.name}\\b`, 'g');
    if (regex.test(converted)) {
      // Convert BIT type values to proper JS booleans for PostgreSQL BOOLEAN columns
      let val = p.value;
      if (p.type?.toLowerCase() === 'bit' && typeof val === 'number') {
        val = val !== 0;
      }
      values.push(val);
      const paramIndex = values.length;
      converted = converted.replace(regex, `$${paramIndex}`);
    }
  }

  return { sql: converted, values };
}

/**
 * Convert MSSQL-specific SQL syntax to PostgreSQL equivalents.
 */
function convertSqlSyntax(sqlStr: string): string {
  let s = sqlStr;

  // SYSDATETIME() → NOW()
  s = s.replace(/SYSDATETIME\(\)/gi, 'NOW()');

  // GETDATE() → NOW()
  s = s.replace(/GETDATE\(\)/gi, 'NOW()');

  // ISNULL(expr, default) → COALESCE(expr, default)
  s = s.replace(/\bISNULL\s*\(/gi, 'COALESCE(');

  // CONVERT(DATE, expr) → (expr)::DATE
  s = s.replace(/CONVERT\s*\(\s*DATE\s*,\s*([^)]+)\)/gi, '($1)::DATE');

  // CAST(expr AS DATE) — valid in both, but just in case of MSSQL-specific patterns
  // No change needed — PostgreSQL supports CAST

  // DATEADD(MINUTE, -15, ...) → (... - INTERVAL '15 minutes')
  s = s.replace(/DATEADD\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*([^)]+)\s*\)/gi, (_match, unit, amount, field) => {
    const absAmount = Math.abs(parseInt(amount));
    const sign = parseInt(amount) < 0 ? '-' : '+';
    const pgUnit = unit.toLowerCase() === 'minute' ? 'minutes' : `${unit.toLowerCase()}s`;
    return `(${field.trim()} ${sign} INTERVAL '${absAmount} ${pgUnit}')`;
  });

  // DATEPART(YEAR, expr) → EXTRACT(YEAR FROM expr)
  // DATEPART(ISO_WEEK, expr) → EXTRACT(WEEK FROM expr)
  // DATEPART(dw, expr) → EXTRACT(ISODOW FROM expr)
  // DATEPART(MONTH, expr) → EXTRACT(MONTH FROM expr)
  // DATEPART(DAY, expr) → EXTRACT(DAY FROM expr)
  s = s.replace(/DATEPART\s*\(\s*(\w+)\s*,\s*([^)]+)\)/gi, (_match, part, expr) => {
    const partMap: Record<string, string> = {
      year: 'YEAR', isoyear: 'ISOYEAR',
      month: 'MONTH', day: 'DAY',
      hour: 'HOUR', minute: 'MINUTE', second: 'SECOND',
      iso_week: 'WEEK', week: 'WEEK',
      dw: 'ISODOW', weekday: 'ISODOW',
    };
    const pgPart = partMap[part.toLowerCase()] ?? part.toUpperCase();
    return `EXTRACT(${pgPart} FROM ${expr.trim()})`;
  });

  // SELECT TOP N ... → SELECT ... LIMIT N
  s = s.replace(/SELECT\s+TOP\s+(\d+)\b/gi, (_match, n) => `SELECT /*TOP${n}*/`);
  if (/\/\*TOP\d+\*\//.test(s)) {
    const topMatch = s.match(/\/\*TOP(\d+)\*\//);
    if (topMatch) {
      const n = topMatch[1];
      s = s.replace(`/*TOP${n}*/`, '');
      s = s.replace(/\bLIMIT\s+\d+\s*$/i, '');
      s = s.trimEnd() + ` LIMIT ${n}`;
    }
  }

  // OFFSET x ROWS FETCH NEXT y ROWS ONLY → LIMIT y OFFSET x
  s = s.replace(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/gi,
    (_match, offset, limit) => `LIMIT ${limit} OFFSET ${offset}`);

  // OUTPUT INSERTED.id → RETURNING id
  s = s.replace(/OUTPUT\s+INSERTED\.(\w+)/gi, 'RETURNING $1');

  // IF NOT EXISTS (SELECT 1 FROM table WHERE ...) INSERT INTO table (...) VALUES (...)
  // → INSERT INTO table (...) VALUES (...) ON CONFLICT DO NOTHING
  s = s.replace(
    /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+\w+\s+WHERE\s+[^)]+\)\s*(INSERT\s+INTO\s+[^;]+)/gi,
    '$1 ON CONFLICT DO NOTHING'
  );

  // BIT/BOOLEAN columns: = 1 → = true, = 0 → = false
  s = s.replace(/\b(is_active|first_login|success|is_read|is_default|is_builtin)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(is_active|first_login|success|is_read|is_default|is_builtin)\s*=\s*0\b/gi, '$1 = false');
  // CASE WHEN bool_col = 1 THEN 1 ELSE 0 END → bool_col::int
  s = s.replace(/CASE\s+WHEN\s+(\w+)\s*=\s*1\s+THEN\s+1\s+ELSE\s+0\s+END/gi, '$1::int');
  // SET first_login = 0 / SET first_login = 1 (in UPDATE statements)
  s = s.replace(/\b(first_login)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(first_login)\s*=\s*0\b/gi, '$1 = false');

  // MERGE → convert simple MERGE patterns to INSERT ... ON CONFLICT DO UPDATE
  s = convertMerge(s);

  return s;
}

/**
 * Convert MSSQL MERGE to PostgreSQL INSERT ... ON CONFLICT DO UPDATE.
 * Handles the common pattern: MERGE INTO target USING (SELECT ...) AS src ON ... WHEN MATCHED THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...
 */
function convertMerge(s: string): string {
  // Only attempt if MERGE keyword is present
  if (!/\bMERGE\b/i.test(s)) return s;

  // Pattern: MERGE [INTO] table AS t USING (SELECT @vals AS cols) AS src ON (condition) WHEN MATCHED THEN UPDATE SET ... WHEN NOT MATCHED THEN INSERT (...) VALUES (...)
  const mergeRegex = /MERGE\s+(?:INTO\s+)?(\w+)\s+AS\s+\w+\s+USING\s*\([^)]+\)\s*AS\s+\w+\s+ON\s*\(([^)]+)\)\s*WHEN\s+MATCHED\s+THEN\s+UPDATE\s+SET\s+([\s\S]+?)\s+WHEN\s+NOT\s+MATCHED\s+THEN\s+INSERT\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;

  const match = mergeRegex.exec(s);
  if (match) {
    const [, table, onCondition, updateSet, insertCols, insertVals] = match;
    // Extract the conflict column from ON condition (e.g. "t.key = src.key" → "key")
    const conflictCol = onCondition.replace(/.*?\.(\w+)\s*=.*/i, '$1').trim();
    const result = `INSERT INTO ${table} (${insertCols}) VALUES (${insertVals}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet.replace(/\bt\.\w+\s*=\s*src\./gi, (m) => m.replace(/\bt\./, '').replace(/src\./, 'EXCLUDED.'))}`;
    return s.replace(match[0], result);
  }

  return s;
}

export class PostgresAdapter implements IDatabaseAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool: any = null;
  private connected = false;

  private async getPool() {
    if (this.pool) return this.pool;

    this.pool = new pg.Pool(getConfig());

    this.pool.on('connect', () => { this.connected = true; });
    this.pool.on('error', (err: Error) => {
      console.error('[PostgresAdapter] Pool error:', err);
      this.connected = false;
    });

    // Test connection
    const client = await this.pool.connect();
    client.release();
    this.connected = true;

    return this.pool;
  }

  async query<T = Record<string, unknown>>(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<T[]> {
    const pool = await this.getPool();
    const converted = convertParams(convertSqlSyntax(sqlStr), params);
    // Use unnamed (no prepared) statements for PgBouncer transaction-mode compatibility
    const result = await pool.query({ text: converted.sql, values: converted.values, rowMode: undefined });
    return result.rows as T[];
  }

  async execute(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }> {
    const pool = await this.getPool();
    const converted = convertParams(convertSqlSyntax(sqlStr), params);
    const result = await pool.query({ text: converted.sql, values: converted.values, rowMode: undefined });
    return { rowsAffected: result.rowCount ?? 0 };
  }

  async transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const txAdapter = new PostgresTransactionAdapter(client);
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

class PostgresTransactionAdapter implements IDatabaseAdapter {
  constructor(private client: { query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }> }) {}

  async query<T = Record<string, unknown>>(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<T[]> {
    const converted = convertParams(convertSqlSyntax(sqlStr), params);
    const result = await this.client.query(converted.sql, converted.values);
    return result.rows as T[];
  }

  async execute(
    sqlStr: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }> {
    const converted = convertParams(convertSqlSyntax(sqlStr), params);
    const result = await this.client.query(converted.sql, converted.values);
    return { rowsAffected: result.rowCount ?? 0 };
  }

  async transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T> {
    return fn(this); // Nested — run inline
  }

  async close(): Promise<void> { /* no-op */ }
  isConnected(): boolean { return true; }
}
