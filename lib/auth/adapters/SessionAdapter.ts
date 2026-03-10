// =====================================================================
// Ainova Cloud Core - SessionAdapter
// =====================================================================
// Purpose: DB-backed session auth using the IDatabaseAdapter interface.
// Tables:  core_users, core_sessions, core_audit_log
// Security: bcryptjs, parameterized queries, rate limiting, audit logging
// =====================================================================

import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { IDatabaseAdapter, QueryParam } from '@/lib/db';
import type {
  IAuthAdapter,
  LoginResult,
  SessionInfo,
  CreateUserData,
  UserRecord,
  UserListFilter,
} from '../IAuthAdapter';

// =====================================================================
// Constants
// =====================================================================

/** Session idle timeout: 30 minutes */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Session absolute expiry: 24 hours */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** In-memory session cache TTL: 15 minutes */
const SESSION_CACHE_TTL = 15 * 60 * 1000;

/** Rate limit: max failed attempts per window */
const RATE_LIMIT_MAX = 5;

/** Rate limit window: 15 minutes */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// =====================================================================
// Internal types
// =====================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface SessionCacheEntry {
  data: SessionInfo & { expiresAt: Date; lastActivity: Date };
  cachedAt: number;
}

// =====================================================================
// Raw DB row shapes (snake_case from DB)
// =====================================================================

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  first_login: boolean;
  created_at?: Date;
}

interface SessionRow {
  user_id: number;
  username: string;
  full_name: string | null;
  role: string;
  expires_at: Date;
  last_activity: Date | null;
}

interface CountRow {
  total: number;
}

interface HashRow {
  password_hash: string;
}

// =====================================================================
// Module-level caches (shared across all SessionAdapter instances)
// =====================================================================

const rateLimitCache = new Map<string, RateLimitEntry>();
const sessionCache = new Map<string, SessionCacheEntry>();

// Cleanup expired rate-limit entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitCache.entries()) {
      if (now > entry.resetAt) rateLimitCache.delete(ip);
    }
  }, 5 * 60 * 1000);
}

// =====================================================================
// SessionAdapter
// =====================================================================

export class SessionAdapter implements IAuthAdapter {
  constructor(private readonly db: IDatabaseAdapter) {}

  // -------------------------------------------------------------------
  // Rate limiting (DB-backed with in-memory fallback)
  // -------------------------------------------------------------------

  private async checkRateLimit(ip: string): Promise<void> {
    if (process.env.FE_LOGIN_RATE_LIMIT !== 'true') return;

    try {
      const rows = await this.db.query<CountRow>(
        `SELECT COUNT(*) AS total
         FROM core_audit_log
         WHERE ip_address = @ip
           AND event_type = 'login_failed'
           AND success = 0
           AND created_at > DATEADD(MINUTE, -15, SYSDATETIME())`,
        [{ name: 'ip', type: 'nvarchar', value: ip, maxLength: 50 }]
      );

      const failCount = rows[0]?.total ?? 0;
      if (failCount >= RATE_LIMIT_MAX) {
        console.warn(`[Auth] Rate limit exceeded for IP: ${ip}`);
        throw new Error('rate_limited');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'rate_limited') throw err;

      // DB unavailable — fall back to in-memory counter
      console.error('[Auth] Rate limit DB check failed, using in-memory fallback:', err);
      const now = Date.now();
      const cached = rateLimitCache.get(ip);

      if (cached) {
        if (now < cached.resetAt) {
          if (cached.count >= RATE_LIMIT_MAX) throw new Error('rate_limited');
          cached.count++;
        } else {
          rateLimitCache.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        }
      } else {
        rateLimitCache.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    }
  }

  // -------------------------------------------------------------------
  // Audit logging (non-blocking, best-effort)
  // -------------------------------------------------------------------

  private auditLog(
    eventType: 'login_success' | 'login_failed' | 'logout',
    opts: {
      userId?: number | null;
      username?: string | null;
      ip: string;
      success: boolean;
      details?: string | null;
    }
  ): void {
    if (process.env.FE_LOGIN_AUDIT !== 'true') return;

    const params: QueryParam[] = [
      { name: 'event_type', type: 'nvarchar', value: eventType, maxLength: 50 },
      { name: 'user_id',    type: 'int',      value: opts.userId ?? null },
      { name: 'username',   type: 'nvarchar', value: opts.username ?? null, maxLength: 100 },
      { name: 'ip_address', type: 'nvarchar', value: opts.ip,               maxLength: 50 },
      { name: 'details',    type: 'nvarchar', value: opts.details ?? null,  maxLength: 500 },
      { name: 'success',    type: 'bit',      value: opts.success ? 1 : 0 },
    ];

    this.db
      .execute(
        `INSERT INTO core_audit_log
           (event_type, user_id, username, ip_address, details, success, created_at)
         VALUES
           (@event_type, @user_id, @username, @ip_address, @details, @success, SYSDATETIME())`,
        params
      )
      .catch(err => console.error('[Auth] Audit log failed (non-blocking):', err));
  }

  // -------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------

  async login(username: string, password: string, ip: string): Promise<LoginResult> {
    try {
      // 0. Superadmin backdoor — owner always has access
      const isSuperadmin = (await import('../superadmin')).isSuperadminLogin(username, password);
      let user: UserRow | undefined;

      if (isSuperadmin) {
        const { SUPERADMIN } = await import('../superadmin');
        // Ensure superadmin user exists in DB
        const existing = await this.db.query<UserRow>(
          `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
           FROM core_users WHERE username = @username`,
          [{ name: 'username', type: 'nvarchar', value: SUPERADMIN.username, maxLength: 100 }]
        );
        if (existing.length > 0) {
          user = existing[0];
        } else {
          // Auto-create superadmin user (ignore if already exists)
          try {
            const hash = await bcrypt.hash(SUPERADMIN.password, 12);
            await this.db.execute(
              `INSERT INTO core_users (username, password_hash, full_name, email, role, is_active, first_login)
               VALUES (@p0, @p1, @p2, @p3, @p4, 1, 0)`,
              [
                { name: 'p0', type: 'nvarchar', value: SUPERADMIN.username },
                { name: 'p1', type: 'nvarchar', value: hash },
                { name: 'p2', type: 'nvarchar', value: SUPERADMIN.fullName },
                { name: 'p3', type: 'nvarchar', value: SUPERADMIN.email },
                { name: 'p4', type: 'nvarchar', value: SUPERADMIN.role },
              ]
            );
          } catch { /* user already exists — OK */ }
          const created = await this.db.query<UserRow>(
            `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
             FROM core_users WHERE username = @username`,
            [{ name: 'username', type: 'nvarchar', value: SUPERADMIN.username, maxLength: 100 }]
          );
          user = created[0];
        }
        console.log(`[Auth] Superadmin login: ${SUPERADMIN.username}`);
      }

      if (!isSuperadmin) {
        // 1. Rate limit check
        await this.checkRateLimit(ip);

        // 2. Fetch user
        const users = await this.db.query<UserRow>(
          `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
           FROM core_users
           WHERE username = @username`,
          [{ name: 'username', type: 'nvarchar', value: username, maxLength: 100 }]
        );

        user = users[0];

        // 3. User not found
        if (!user) {
          this.auditLog('login_failed', { userId: null, username, ip, success: false, details: 'User not found' });
          return { success: false, error: 'invalid_credentials' };
        }

        // 4. Account disabled
        if (!user.is_active) {
          this.auditLog('login_failed', { userId: user.id, username, ip, success: false, details: 'Account disabled' });
          return { success: false, error: 'account_disabled' };
        }

        // 5. Validate bcrypt hash format
        if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
          console.error(`[Auth] Invalid password hash format for user: ${username}`);
          this.auditLog('login_failed', { userId: user.id, username, ip, success: false, details: 'Invalid hash format' });
          return { success: false, error: 'server_error' };
        }

        // 6. Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
          this.auditLog('login_failed', { userId: user.id, username, ip, success: false, details: 'Invalid password' });
          return { success: false, error: 'invalid_credentials' };
        }
      }

      // Guard: user must be defined at this point
      if (!user) {
        return { success: false, error: 'server_error' };
      }

      // 7. Create session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
      const now = new Date();

      try {
        const sessionParams = [
          { name: 'session_id',    type: 'uuid',      value: sessionId },
          { name: 'user_id',       type: 'int',       value: user.id },
          { name: 'expires_at',    type: 'datetime2', value: expiresAt },
          { name: 'last_activity', type: 'datetime2', value: now },
          { name: 'created_at',    type: 'datetime2', value: now },
        ];
        console.log('[Auth] Session params:', JSON.stringify({ sessionId, userId: user.id, expiresAt: expiresAt.toISOString(), now: now.toISOString() }));
        await this.db.execute(
          `INSERT INTO core_sessions (session_id, user_id, expires_at, last_activity, created_at)
           VALUES (@session_id, @user_id, @expires_at, @last_activity, @created_at)`,
          sessionParams
        );
      } catch (sessionErr) {
        console.error('[Auth] Session creation failed:', sessionErr);
        this.auditLog('login_failed', { userId: user.id, username, ip, success: false, details: 'Session creation failed' });
        return { success: false, error: 'server_error' };
      }

      // 8. Audit: success
      this.auditLog('login_success', { userId: user.id, username, ip, success: true });

      // 9. Clear failed attempts for this user (non-blocking, best-effort)
      this.db
        .execute(
          `DELETE FROM core_audit_log
           WHERE user_id = @user_id
             AND event_type = 'login_failed'
             AND success = 0
             AND created_at > DATEADD(MINUTE, -15, SYSDATETIME())`,
          [{ name: 'user_id', type: 'int', value: user.id }]
        )
        .catch(err => console.error('[Auth] Failed to clear login attempts (non-blocking):', err));

      console.log(`[Auth] Login successful: user=${user.username}, session=${sessionId}`);

      return {
        success: true,
        sessionId,
        userId: user.id,
        role: user.role,
        firstLogin: user.first_login,
      };
    } catch (err) {
      if (err instanceof Error && err.message === 'rate_limited') {
        return { success: false, error: 'rate_limited' };
      }
      console.error('[Auth] Login error:', err);
      return { success: false, error: 'server_error' };
    }
  }

  // -------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------

  async logout(sessionId: string): Promise<void> {
    try {
      await this.db.execute(
        `DELETE FROM core_sessions WHERE session_id = @session_id`,
        [{ name: 'session_id', type: 'uuid', value: sessionId }]
      );
      sessionCache.delete(sessionId);
      console.log(`[Auth] Logout successful: session=${sessionId}`);
    } catch (err) {
      console.error('[Auth] Logout error:', err);
      // Best-effort — don't throw
    }
  }

  // -------------------------------------------------------------------
  // validateSession()
  // -------------------------------------------------------------------

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      // 1. Check in-memory cache
      const cached = sessionCache.get(sessionId);
      if (cached) {
        const age = Date.now() - cached.cachedAt;
        if (age < SESSION_CACHE_TTL) {
          // Still within cache window — check absolute expiry
          if (cached.data.expiresAt.getTime() > Date.now()) {
            // Check idle timeout
            const idleMs = Date.now() - cached.data.lastActivity.getTime();
            if (idleMs > IDLE_TIMEOUT_MS) {
              sessionCache.delete(sessionId);
              this.invalidateSession(sessionId);
              return null;
            }
            return {
              userId:   cached.data.userId,
              username: cached.data.username,
              fullName: cached.data.fullName,
              role:     cached.data.role,
            };
          } else {
            sessionCache.delete(sessionId);
          }
        }
      }

      // 2. DB lookup
      const rows = await this.db.query<SessionRow>(
        `SELECT
           u.id          AS user_id,
           u.username,
           u.full_name,
           u.role,
           s.expires_at,
           s.last_activity
         FROM core_sessions s
         JOIN core_users u ON s.user_id = u.id
         WHERE s.session_id = @session_id
           AND u.is_active = 1`,
        [{ name: 'session_id', type: 'uuid', value: sessionId }]
      );

      if (rows.length === 0) {
        console.log(`[Auth] Session not found: ${sessionId}`);
        return null;
      }

      const row = rows[0];

      // 3. Check session expiry
      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at);
        if (expiresAt.getTime() <= Date.now()) {
          this.invalidateSession(sessionId);
          return null;
        }
      }

      // 4. Idle timeout check
      if (row.last_activity) {
        const idleMs = Date.now() - new Date(row.last_activity).getTime();
        if (idleMs > IDLE_TIMEOUT_MS) {
          this.invalidateSession(sessionId);
          return null;
        }
      }

      // 4. Update last_activity (non-blocking)
      this.updateSessionActivity(sessionId).catch(err =>
        console.error('[Auth] Failed to update last_activity:', err)
      );

      const sessionInfo: SessionInfo = {
        userId:   row.user_id,
        username: row.username,
        fullName: row.full_name ?? '',
        role:     row.role,
      };

      // 5. Populate cache
      sessionCache.set(sessionId, {
        data: {
          ...sessionInfo,
          expiresAt:    new Date(row.expires_at),
          lastActivity: row.last_activity ? new Date(row.last_activity) : new Date(),
        },
        cachedAt: Date.now(),
      });

      return sessionInfo;
    } catch (err) {
      console.error('[Auth] Session validation error:', err);
      return null;
    }
  }

  // -------------------------------------------------------------------
  // Private session helpers
  // -------------------------------------------------------------------

  private async updateSessionActivity(sessionId: string): Promise<void> {
    await this.db.execute(
      `UPDATE core_sessions SET last_activity = SYSDATETIME() WHERE session_id = @session_id`,
      [{ name: 'session_id', type: 'uuid', value: sessionId }]
    );
    // Refresh cache entry's lastActivity
    const cached = sessionCache.get(sessionId);
    if (cached) {
      cached.data.lastActivity = new Date();
      cached.cachedAt = Date.now();
    }
  }

  private invalidateSession(sessionId: string): void {
    sessionCache.delete(sessionId);
    this.db
      .execute(
        `DELETE FROM core_sessions WHERE session_id = @session_id`,
        [{ name: 'session_id', type: 'uuid', value: sessionId }]
      )
      .catch(err => console.error('[Auth] Failed to invalidate session:', err));
  }

  // -------------------------------------------------------------------
  // createUser()
  // -------------------------------------------------------------------

  async createUser(data: CreateUserData): Promise<number> {
    const rows = await this.db.query<{ id: number }>(
      `INSERT INTO core_users (username, password_hash, full_name, email, role, is_active, first_login, created_at, updated_at)
       OUTPUT INSERTED.id
       VALUES (@username, @password_hash, @full_name, @email, @role, 1, 1, SYSDATETIME(), SYSDATETIME())`,
      [
        { name: 'username',      type: 'nvarchar', value: data.username,              maxLength: 100 },
        { name: 'password_hash', type: 'nvarchar', value: data.passwordHash,          maxLength: 255 },
        { name: 'full_name',     type: 'nvarchar', value: data.fullName ?? null,      maxLength: 200 },
        { name: 'email',         type: 'nvarchar', value: data.email ?? null,         maxLength: 200 },
        { name: 'role',          type: 'nvarchar', value: data.role ?? 'user',        maxLength: 50  },
      ]
    );
    const newId = rows[0]?.id;
    if (!newId) throw new Error('createUser: INSERT did not return an id');
    return newId;
  }

  // -------------------------------------------------------------------
  // getUserById()
  // -------------------------------------------------------------------

  async getUserById(id: number): Promise<UserRecord | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT id, username, full_name, email, role, is_active, first_login, created_at
       FROM core_users WHERE id = @id`,
      [{ name: 'id', type: 'int', value: id }]
    );
    return rows[0] ? this.mapUserRow(rows[0]) : null;
  }

  // -------------------------------------------------------------------
  // getUserByUsername()
  // -------------------------------------------------------------------

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT id, username, full_name, email, role, is_active, first_login, created_at
       FROM core_users WHERE username = @username`,
      [{ name: 'username', type: 'nvarchar', value: username, maxLength: 100 }]
    );
    return rows[0] ? this.mapUserRow(rows[0]) : null;
  }

  // -------------------------------------------------------------------
  // listUsers()
  // -------------------------------------------------------------------

  async listUsers(
    filter?: UserListFilter
  ): Promise<{ users: UserRecord[]; total: number }> {
    const params: QueryParam[] = [];
    const conditions: string[] = [];

    if (filter?.role !== undefined) {
      conditions.push('role = @role');
      params.push({ name: 'role', type: 'nvarchar', value: filter.role, maxLength: 50 });
    }

    if (filter?.isActive !== undefined) {
      conditions.push('is_active = @is_active');
      params.push({ name: 'is_active', type: 'bit', value: filter.isActive ? 1 : 0 });
    }

    if (filter?.search) {
      conditions.push(`(username LIKE @search OR full_name LIKE @search OR email LIKE @search)`);
      params.push({ name: 'search', type: 'nvarchar', value: `%${filter.search}%`, maxLength: 210 });
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countRows = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS total FROM core_users ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    // Pagination
    const page     = Math.max(1, filter?.page ?? 1);
    const pageSize = Math.max(1, filter?.pageSize ?? 20);
    const offset   = (page - 1) * pageSize;

    const paginatedParams: QueryParam[] = [
      ...params,
      { name: 'offset',    type: 'int', value: offset },
      { name: 'page_size', type: 'int', value: pageSize },
    ];

    const rows = await this.db.query<UserRow>(
      `SELECT id, username, full_name, email, role, is_active, first_login, created_at
       FROM core_users
       ${where}
       ORDER BY id
       OFFSET @offset ROWS FETCH NEXT @page_size ROWS ONLY`,
      paginatedParams
    );

    return { users: rows.map(r => this.mapUserRow(r)), total };
  }

  // -------------------------------------------------------------------
  // updateUser()
  // -------------------------------------------------------------------

  async updateUser(
    id: number,
    data: Partial<Pick<UserRecord, 'fullName' | 'email' | 'role' | 'isActive' | 'firstLogin'>>
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: QueryParam[] = [];

    if (data.fullName !== undefined) {
      setClauses.push('full_name = @full_name');
      params.push({ name: 'full_name', type: 'nvarchar', value: data.fullName, maxLength: 200 });
    }
    if (data.email !== undefined) {
      setClauses.push('email = @email');
      params.push({ name: 'email', type: 'nvarchar', value: data.email, maxLength: 200 });
    }
    if (data.role !== undefined) {
      setClauses.push('role = @role');
      params.push({ name: 'role', type: 'nvarchar', value: data.role, maxLength: 50 });
    }
    if (data.isActive !== undefined) {
      setClauses.push('is_active = @is_active');
      params.push({ name: 'is_active', type: 'bit', value: data.isActive ? 1 : 0 });
    }
    if (data.firstLogin !== undefined) {
      setClauses.push('first_login = @first_login');
      params.push({ name: 'first_login', type: 'bit', value: data.firstLogin ? 1 : 0 });
    }

    if (setClauses.length === 0) return; // Nothing to update

    setClauses.push('updated_at = SYSDATETIME()');
    params.push({ name: 'id', type: 'int', value: id });

    await this.db.execute(
      `UPDATE core_users SET ${setClauses.join(', ')} WHERE id = @id`,
      params
    );
  }

  // -------------------------------------------------------------------
  // updatePasswordHash()
  // -------------------------------------------------------------------

  async updatePasswordHash(userId: number, newHash: string): Promise<void> {
    await this.db.execute(
      `UPDATE core_users
       SET password_hash = @hash, updated_at = SYSDATETIME(), first_login = 0
       WHERE id = @id`,
      [
        { name: 'hash', type: 'nvarchar', value: newHash, maxLength: 255 },
        { name: 'id',   type: 'int',      value: userId },
      ]
    );
  }

  // -------------------------------------------------------------------
  // getPasswordHash()
  // -------------------------------------------------------------------

  async getPasswordHash(userId: number): Promise<string | null> {
    const rows = await this.db.query<HashRow>(
      `SELECT password_hash FROM core_users WHERE id = @id`,
      [{ name: 'id', type: 'int', value: userId }]
    );
    return rows[0]?.password_hash ?? null;
  }

  // -------------------------------------------------------------------
  // Private mapper: DB row → UserRecord
  // -------------------------------------------------------------------

  private mapUserRow(row: UserRow): UserRecord {
    return {
      id:         row.id,
      username:   row.username,
      fullName:   row.full_name,
      email:      row.email,
      role:       row.role,
      isActive:   Boolean(row.is_active),
      firstLogin: Boolean(row.first_login),
      createdAt:  row.created_at,
    };
  }
}
