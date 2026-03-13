/**
 * SQL Dialect Abstraction Layer
 * =============================
 * Generates adapter-specific SQL expressions.
 * Each DB adapter implements its own dialect.
 */

export interface SqlDialect {
  /** Current timestamp expression: SYSDATETIME() | NOW() | datetime('now') */
  now(): string;

  /** Date arithmetic: DATEADD(...) | interval | datetime(...) */
  dateAdd(unit: 'minute' | 'hour' | 'day' | 'month' | 'year', amount: number, field: string): string;

  /** UPSERT: MERGE | INSERT ... ON CONFLICT */
  upsert(table: string, columns: string[], keyColumns: string[], valueAliases: string[]): string;

  /** Pagination: OFFSET..FETCH | LIMIT..OFFSET */
  limit(n: number, offset?: number): string;

  /** New UUID: NEWID() | gen_random_uuid() | lower(hex(randomblob(16))) */
  newUuid(): string;

  /** Boolean literal: 1/0 for MSSQL, true/false for PG, 1/0 for SQLite */
  bool(value: boolean): string;

  /** Auto-increment definition: IDENTITY(1,1) | SERIAL | AUTOINCREMENT */
  autoIncrement(): string;

  /** RETURNING clause: OUTPUT INSERTED.* | RETURNING * | '' */
  returning(columns: string[]): string;

  /** TOP N prefix (MSSQL-only, empty for PG/SQLite) */
  top(n: number): string;

  /** String concatenation: + (MSSQL) | || (PG/SQLite) */
  concat(...parts: string[]): string;

  /** IF NOT EXISTS table check (for migrations) */
  ifTableNotExists(tableName: string, createSql: string): string;

  /** IF NOT EXISTS index check (for migrations) */
  ifIndexNotExists(indexName: string, createSql: string): string;

  /** Parameter placeholder: @name (MSSQL) | $N (PG) | ? (SQLite) */
  param(name: string, index: number): string;

  /** Identity of the dialect */
  readonly name: 'mssql' | 'postgres' | 'sqlite';
}

// =====================================================================
// MSSQL Dialect
// =====================================================================

export class MssqlDialect implements SqlDialect {
  readonly name = 'mssql' as const;

  now(): string { return 'SYSDATETIME()'; }

  dateAdd(unit: string, amount: number, field: string): string {
    return `DATEADD(${unit}, ${amount}, ${field})`;
  }

  upsert(table: string, columns: string[], keyColumns: string[], valueAliases: string[]): string {
    const keyConditions = keyColumns.map(k => `target.${k} = source.${k}`).join(' AND ');
    const updateSet = columns.filter(c => !keyColumns.includes(c)).map((c, i) => {
      const aliasIdx = columns.indexOf(c);
      return `${c} = ${valueAliases[aliasIdx]}`;
    }).join(', ');
    const insertCols = columns.join(', ');
    const insertVals = valueAliases.join(', ');

    return `MERGE ${table} AS target
     USING (SELECT ${keyColumns.map((k, i) => `${valueAliases[columns.indexOf(k)]} AS ${k}`).join(', ')}) AS source
     ON ${keyConditions}
     WHEN MATCHED THEN UPDATE SET ${updateSet}
     WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals});`;
  }

  limit(n: number, offset?: number): string {
    if (offset !== undefined) {
      return `OFFSET ${offset} ROWS FETCH NEXT ${n} ROWS ONLY`;
    }
    return `OFFSET 0 ROWS FETCH NEXT ${n} ROWS ONLY`;
  }

  newUuid(): string { return 'NEWID()'; }
  bool(value: boolean): string { return value ? '1' : '0'; }
  autoIncrement(): string { return 'IDENTITY(1,1)'; }

  returning(columns: string[]): string {
    return `OUTPUT INSERTED.${columns.join(', INSERTED.')}`;
  }

  top(n: number): string { return `TOP ${n}`; }
  concat(...parts: string[]): string { return parts.join(' + '); }

  ifTableNotExists(tableName: string, createSql: string): string {
    return `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = '${tableName}')\n  ${createSql}`;
  }

  ifIndexNotExists(indexName: string, createSql: string): string {
    return `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = '${indexName}')\n  ${createSql}`;
  }

  param(name: string, _index: number): string { return `@${name}`; }
}

// =====================================================================
// PostgreSQL Dialect
// =====================================================================

export class PostgresDialect implements SqlDialect {
  readonly name = 'postgres' as const;

  now(): string { return 'NOW()'; }

  dateAdd(unit: string, amount: number, field: string): string {
    return `(${field} + INTERVAL '${amount} ${unit}')`;
  }

  upsert(table: string, columns: string[], keyColumns: string[], valueAliases: string[]): string {
    const insertCols = columns.join(', ');
    const insertVals = valueAliases.join(', ');
    const conflict = keyColumns.join(', ');
    const updateSet = columns
      .filter(c => !keyColumns.includes(c))
      .map((c, i) => {
        const aliasIdx = columns.indexOf(c);
        return `${c} = EXCLUDED.${c}`;
      })
      .join(', ');

    return `INSERT INTO ${table} (${insertCols}) VALUES (${insertVals})
     ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`;
  }

  limit(n: number, offset?: number): string {
    if (offset !== undefined) {
      return `LIMIT ${n} OFFSET ${offset}`;
    }
    return `LIMIT ${n}`;
  }

  newUuid(): string { return 'gen_random_uuid()'; }
  bool(value: boolean): string { return value ? 'TRUE' : 'FALSE'; }
  autoIncrement(): string { return 'SERIAL'; }

  returning(columns: string[]): string {
    return `RETURNING ${columns.join(', ')}`;
  }

  top(_n: number): string { return ''; }
  concat(...parts: string[]): string { return parts.join(' || '); }

  ifTableNotExists(tableName: string, createSql: string): string {
    // PostgreSQL CREATE TABLE IF NOT EXISTS is native
    return createSql.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ');
  }

  ifIndexNotExists(indexName: string, createSql: string): string {
    return createSql.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')
                    .replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ');
  }

  param(name: string, index: number): string { return `$${index + 1}`; }
}

// =====================================================================
// SQLite Dialect
// =====================================================================

export class SqliteDialect implements SqlDialect {
  readonly name = 'sqlite' as const;

  now(): string { return "datetime('now')"; }

  dateAdd(unit: string, amount: number, field: string): string {
    return `datetime(${field}, '${amount} ${unit}')`;
  }

  upsert(table: string, columns: string[], keyColumns: string[], valueAliases: string[]): string {
    const insertCols = columns.join(', ');
    const insertVals = valueAliases.join(', ');
    const conflict = keyColumns.join(', ');
    const updateSet = columns
      .filter(c => !keyColumns.includes(c))
      .map(c => `${c} = excluded.${c}`)
      .join(', ');

    return `INSERT INTO ${table} (${insertCols}) VALUES (${insertVals})
     ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`;
  }

  limit(n: number, offset?: number): string {
    if (offset !== undefined) {
      return `LIMIT ${n} OFFSET ${offset}`;
    }
    return `LIMIT ${n}`;
  }

  newUuid(): string { return "lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))"; }
  bool(value: boolean): string { return value ? '1' : '0'; }
  autoIncrement(): string { return 'INTEGER PRIMARY KEY AUTOINCREMENT'; }

  returning(columns: string[]): string {
    return `RETURNING ${columns.join(', ')}`;
  }

  top(_n: number): string { return ''; }
  concat(...parts: string[]): string { return parts.join(' || '); }

  ifTableNotExists(tableName: string, createSql: string): string {
    return createSql.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ');
  }

  ifIndexNotExists(indexName: string, createSql: string): string {
    return createSql.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')
                    .replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ');
  }

  param(_name: string, index: number): string { return '?'; }
}

// =====================================================================
// Factory
// =====================================================================

let _dialect: SqlDialect | null = null;

export function getDialect(): SqlDialect {
  if (!_dialect) {
    const adapter = process.env.DB_ADAPTER ?? 'mssql';
    switch (adapter) {
      case 'mssql':    _dialect = new MssqlDialect(); break;
      case 'postgres': _dialect = new PostgresDialect(); break;
      case 'sqlite':   _dialect = new SqliteDialect(); break;
      default:         _dialect = new MssqlDialect(); break;
    }
  }
  return _dialect;
}
