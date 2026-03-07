export type SqlParamType =
  | 'nvarchar'
  | 'varchar'
  | 'int'
  | 'bigint'
  | 'float'
  | 'bit'
  | 'datetime2'
  | 'uuid';

export interface QueryParam {
  name: string;
  type: SqlParamType;
  value: unknown;
  /** For nvarchar/varchar: max length (e.g. 100). Omit for MAX. */
  maxLength?: number;
}

export interface IDatabaseAdapter {
  /** SELECT queries — returns typed array */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: QueryParam[]
  ): Promise<T[]>;

  /** INSERT/UPDATE/DELETE — returns affected row count */
  execute(
    sql: string,
    params?: QueryParam[]
  ): Promise<{ rowsAffected: number }>;

  /** Transaction wrapper */
  transaction<T>(fn: (db: IDatabaseAdapter) => Promise<T>): Promise<T>;

  close(): Promise<void>;

  isConnected(): boolean;
}
