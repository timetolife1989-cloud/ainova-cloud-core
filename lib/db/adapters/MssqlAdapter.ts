import sql from 'mssql';
import type { IDatabaseAdapter, QueryParam, SqlParamType } from '../IDatabase';

const TYPE_MAP: Record<SqlParamType, sql.ISqlType | (() => sql.ISqlType)> = {
  nvarchar:  sql.NVarChar,
  varchar:   sql.VarChar,
  int:       sql.Int,
  bigint:    sql.BigInt,
  float:     sql.Float,
  bit:       sql.Bit,
  datetime2: sql.DateTime2,
  uuid:      sql.UniqueIdentifier,
};

function getConfig(): sql.config {
  return {
    server:   process.env.DB_SERVER!,
    database: process.env.DB_DATABASE!,
    user:     process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    port:     parseInt(process.env.DB_PORT ?? '1433', 10),
    options: {
      encrypt:                true,
      trustServerCertificate: true,
      enableArithAbort:       true,
      useUTC:                 false,
    },
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '30000', 10),
    requestTimeout:    parseInt(process.env.DB_REQUEST_TIMEOUT    ?? '30000', 10),
    pool: {
      max:                parseInt(process.env.DB_POOL_MAX ?? '10',    10),
      min:                parseInt(process.env.DB_POOL_MIN ?? '2',     10),
      idleTimeoutMillis:  30000,
    },
  };
}

export class MssqlAdapter implements IDatabaseAdapter {
  private pool: sql.ConnectionPool | null = null;
  private isConnecting = false;

  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;

    if (this.isConnecting) {
      // Wait up to 10 seconds for another caller to finish connecting
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (this.pool?.connected) return this.pool;
      }
      throw new Error('DB connection timeout while waiting for pool');
    }

    this.isConnecting = true;
    try {
      if (this.pool) {
        try { await this.pool.close(); } catch { /* ignore */ }
        this.pool = null;
      }
      this.pool = await sql.connect(getConfig());
      return this.pool;
    } finally {
      this.isConnecting = false;
    }
  }

  private applyParams(
    request: sql.Request,
    params: QueryParam[] = []
  ): void {
    for (const p of params) {
      const baseType = TYPE_MAP[p.type];
      const sqlType =
        (p.type === 'nvarchar' || p.type === 'varchar') && p.maxLength
          ? (baseType as (length: number) => sql.ISqlType)(p.maxLength)
          : (typeof baseType === 'function' ? (baseType as () => sql.ISqlType)() : baseType);
      request.input(p.name, sqlType, p.value);
    }
  }

  async query<T = Record<string, unknown>>(
    querySql: string,
    params?: QueryParam[]
  ): Promise<T[]> {
    const pool = await this.getPool();
    const request = pool.request();
    this.applyParams(request, params);
    const result = await request.query<T>(querySql);
    return result.recordset;
  }

  async execute(
    querySql: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }> {
    const pool = await this.getPool();
    const request = pool.request();
    this.applyParams(request, params);
    const result = await request.query(querySql);
    const affected =
      Array.isArray(result.rowsAffected)
        ? result.rowsAffected.reduce((a, b) => a + b, 0)
        : (result.rowsAffected ?? 0);
    return { rowsAffected: affected };
  }

  async transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const txAdapter = new TransactionAdapter(transaction);
    try {
      const result = await fn(txAdapter);
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  isConnected(): boolean {
    return this.pool?.connected ?? false;
  }
}

/** Thin wrapper for use inside a transaction */
class TransactionAdapter implements IDatabaseAdapter {
  constructor(private tx: sql.Transaction) {}

  private applyParams(request: sql.Request, params: QueryParam[] = []): void {
    for (const p of params) {
      const baseType = TYPE_MAP[p.type];
      const sqlType =
        (p.type === 'nvarchar' || p.type === 'varchar') && p.maxLength
          ? (baseType as (length: number) => sql.ISqlType)(p.maxLength)
          : (typeof baseType === 'function' ? (baseType as () => sql.ISqlType)() : baseType);
      request.input(p.name, sqlType, p.value);
    }
  }

  async query<T = Record<string, unknown>>(
    querySql: string,
    params?: QueryParam[]
  ): Promise<T[]> {
    const request = new sql.Request(this.tx);
    this.applyParams(request, params);
    const result = await request.query<T>(querySql);
    return result.recordset;
  }

  async execute(
    querySql: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }> {
    const request = new sql.Request(this.tx);
    this.applyParams(request, params);
    const result = await request.query(querySql);
    const affected =
      Array.isArray(result.rowsAffected)
        ? result.rowsAffected.reduce((a, b) => a + b, 0)
        : (result.rowsAffected ?? 0);
    return { rowsAffected: affected };
  }

  async transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T> {
    // Nested transactions not supported — run inline
    return fn(this);
  }

  async close(): Promise<void> { /* no-op inside transaction */ }

  isConnected(): boolean { return true; }
}

// Graceful shutdown — close any open pool on SIGINT/SIGTERM
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    console.log('[DB] Closing connection pool...');
    try {
      // Best-effort: close the global mssql connection pool if one is open
      const globalPool = (sql as unknown as { globalConnection?: sql.ConnectionPool })
        .globalConnection;
      if (globalPool && globalPool.connected) {
        await globalPool.close();
      }
    } catch { /* ignore */ }
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT',  shutdown);
  process.once('SIGTERM', shutdown);
}
