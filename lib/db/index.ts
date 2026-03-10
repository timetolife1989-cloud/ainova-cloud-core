import { MssqlAdapter } from './adapters/MssqlAdapter';
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
      case 'postgres': {
        // Dynamic import — pg package is optional
        const { PostgresAdapter } = require('./adapters/PostgresAdapter') as typeof import('./adapters/PostgresAdapter');
        _db = new PostgresAdapter();
        break;
      }
      case 'sqlite': {
        // Dynamic import — better-sqlite3 package is optional
        const { SqliteAdapter } = require('./adapters/SqliteAdapter') as typeof import('./adapters/SqliteAdapter');
        _db = new SqliteAdapter();
        break;
      }
      default:
        throw new Error(
          `Unsupported DB adapter: "${adapter}". Supported values: mssql, postgres, sqlite`
        );
    }
  }
  return _db;
}

export type { IDatabaseAdapter, QueryParam, SqlParamType } from './IDatabase';
