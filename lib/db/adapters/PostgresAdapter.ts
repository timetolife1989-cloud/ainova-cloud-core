/**
 * PostgreSQL Database Adapter
 * ===========================
 * Implements IDatabaseAdapter using the `pg` driver.
 * Connection pooling via pg.Pool.
 * Parameter syntax: $1, $2, ... (converted from @name format)
 */

import type { IDatabaseAdapter, QueryParam } from '../IDatabase';

// pg types — conditionally imported (no compile-time dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pg: any = null;

async function getPg(): Promise<any> {
  if (!pg) {
    try {
      pg = await import(/* webpackIgnore: true */ 'pg');
    } catch {
      throw new Error(
        'PostgreSQL adapter requires the "pg" package. Install it: npm install pg @types/pg'
      );
    }
  }
  return pg;
}

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

  // DATEADD(MINUTE, -15, ...) → (... - INTERVAL '15 minutes')
  s = s.replace(/DATEADD\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*([^)]+)\s*\)/gi, (_match, unit, amount, field) => {
    const absAmount = Math.abs(parseInt(amount));
    const sign = parseInt(amount) < 0 ? '-' : '+';
    const pgUnit = unit.toLowerCase() === 'minute' ? 'minutes' : `${unit.toLowerCase()}s`;
    return `(${field.trim()} ${sign} INTERVAL '${absAmount} ${pgUnit}')`;
  });

  // OUTPUT INSERTED.id → RETURNING id
  s = s.replace(/OUTPUT\s+INSERTED\.(\w+)/gi, 'RETURNING $1');

  // BIT/BOOLEAN columns: = 1 → = true, = 0 → = false
  // Matches patterns like: is_active = 1, first_login = 0, success = 0
  s = s.replace(/\b(is_active|first_login|success|is_read|is_default)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(is_active|first_login|success|is_read|is_default)\s*=\s*0\b/gi, '$1 = false');
  // CASE WHEN bool_col = 1 THEN 1 ELSE 0 END → bool_col::int
  s = s.replace(/CASE\s+WHEN\s+(\w+)\s*=\s*1\s+THEN\s+1\s+ELSE\s+0\s+END/gi, '$1::int');
  // SET first_login = 0 / SET first_login = 1 (in UPDATE statements)
  s = s.replace(/\b(first_login)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(first_login)\s*=\s*0\b/gi, '$1 = false');

  // MERGE → handled by dialect helper, not auto-converted here

  return s;
}

export class PostgresAdapter implements IDatabaseAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool: any = null;
  private connected = false;

  private async getPool() {
    if (this.pool) return this.pool;

    const pgModule = await getPg();
    this.pool = new pgModule.Pool(getConfig());

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
