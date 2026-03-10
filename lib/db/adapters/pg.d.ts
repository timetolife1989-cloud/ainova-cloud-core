// Type stub for optional 'pg' dependency
// Install for real types: npm install pg @types/pg
declare module 'pg' {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    connect(): Promise<PoolClient>;
    query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
    end(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export interface PoolClient {
    query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
    release(): void;
  }
}
