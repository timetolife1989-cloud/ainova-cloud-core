import { MssqlAdapter } from './adapters/MssqlAdapter';
import type { IDatabaseAdapter } from './IDatabase';

let _db: IDatabaseAdapter | null = null;

/**
 * Returns the singleton database adapter.
 * Adapter type is determined by DB_ADAPTER env var (default: 'mssql').
 */
export function getDb(): IDatabaseAdapter {
  if (!_db) {
    const adapter = process.env.DB_ADAPTER ?? 'mssql';
    switch (adapter) {
      case 'mssql':
        _db = new MssqlAdapter();
        break;
      default:
        throw new Error(
          `Unsupported DB adapter: "${adapter}". Supported values: mssql`
        );
    }
  }
  return _db;
}

export type { IDatabaseAdapter, QueryParam, SqlParamType } from './IDatabase';
