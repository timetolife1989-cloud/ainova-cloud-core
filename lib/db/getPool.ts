// =====================================================================
// AINOVA CLOUD CORE - Raw mssql ConnectionPool Shim
// =====================================================================
// Purpose: Expose a raw sql.ConnectionPool for routes that need direct
//          mssql access (bulk operations, sql.Table, MERGE statements).
//          The MssqlAdapter wraps the pool behind an interface; this shim
//          provides the underlying pool without modifying the adapter.
// Pattern: Module-level singleton with race-condition guard.
// =====================================================================

import sql from 'mssql';

// =====================================================================
// Environment variable warning (server-side only)
// =====================================================================
if (typeof window === 'undefined') {
  const requiredEnvVars = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(
      `[getPool] Warning: Missing environment variables: ${missingVars.join(', ')}\n` +
      'Database connection will fail if attempted. Check your .env.local file.'
    );
  }
}

// =====================================================================
// Connection Configuration
// =====================================================================
const config: sql.config = {
  server:   process.env.DB_SERVER   || 'localhost',
  database: process.env.DB_DATABASE || 'AinovaCore',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt:                true,
    trustServerCertificate: true,
    enableArithAbort:       true,
    useUTC:                 false,
  },
  connectionTimeout: 30000,
  requestTimeout:    30000,
  pool: {
    max:               10,
    min:               2,
    idleTimeoutMillis: 30000,
  },
};

// =====================================================================
// Singleton state
// =====================================================================
let pool: sql.ConnectionPool | null = null;
let isConnecting = false;

/**
 * Returns the singleton mssql ConnectionPool.
 * Creates and connects the pool on first call; subsequent calls return
 * the cached pool if it is still connected.
 *
 * Race-condition safe: if a connection attempt is already in progress,
 * callers wait up to 10 seconds for it to complete.
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  // Fast path — pool already connected
  if (pool && pool.connected) {
    return pool;
  }

  // Wait for an in-progress connection attempt (max 10 s, 100 × 100 ms)
  if (isConnecting) {
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (pool && pool.connected) return pool;
    }
    throw new Error('[getPool] Connection timeout: another connection attempt is in progress');
  }

  // Create a new connection
  isConnecting = true;
  try {
    // Close any stale / disconnected pool before reconnecting
    if (pool) {
      try { await pool.close(); } catch { /* ignore */ }
      pool = null;
    }

    console.log('[getPool] Connecting to SQL Server:', config.server);
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('[getPool] Connected successfully to:', config.database);
    return pool;
  } catch (error) {
    // Clean up the failed pool to prevent resource leaks
    if (pool) {
      try { await pool.close(); } catch { /* ignore */ }
      pool = null;
    }
    console.error('[getPool] Connection failed:', error);
    throw new Error(
      `[getPool] SQL Server connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    isConnecting = false;
  }
}

// Re-export sql so callers can use sql.Table, sql.NVarChar, etc.
export { sql };
