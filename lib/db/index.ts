import { MssqlAdapter } from './adapters/MssqlAdapter';
import { PostgresAdapter } from './adapters/PostgresAdapter';
import { SqliteAdapter } from './adapters/SqliteAdapter';
import type { IDatabaseAdapter } from './IDatabase';

let _db: IDatabaseAdapter | null = null;

/**
 * Returns the singleton database adapter.
 * Adapter type is determined by DB_ADAPTER env var (default: 'mssql').
 *
 * Supported values: mssql, postgres, sqlite
 */
export function getDb(): IDatabaseAdapter {
  if (!_db) {
    const adapter = process.env.DB_ADAPTER ?? 'mssql';
    switch (adapter) {
      case 'mssql':
        _db = new MssqlAdapter();
        break;
      case 'postgres':
        _db = new PostgresAdapter();
        break;
      case 'sqlite':
        _db = new SqliteAdapter();
        break;
      default:
        throw new Error(
          `Unsupported DB adapter: "${adapter}". Supported values: mssql, postgres, sqlite`
        );
    }
  }
  return _db;
}

export type { IDatabaseAdapter, QueryParam, SqlParamType } from './IDatabase';
