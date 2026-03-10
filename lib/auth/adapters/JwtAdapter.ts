/**
 * JWT Authentication Adapter
 * ==========================
 * Access token (short-lived, stateless) + Refresh token (DB-backed).
 * Uses Node.js built-in crypto for HMAC-SHA256 signing.
 */

import { createHmac, randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
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

const ACCESS_TOKEN_EXPIRY_MS = parseInt(process.env.JWT_ACCESS_EXPIRY_MS ?? String(15 * 60 * 1000), 10);
const REFRESH_TOKEN_EXPIRY_MS = parseInt(process.env.JWT_REFRESH_EXPIRY_MS ?? String(7 * 24 * 60 * 60 * 1000), 10);

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET env var must be at least 32 characters');
  }
  return secret;
}

// =====================================================================
// Minimal JWT implementation (no external dependency)
// =====================================================================

interface JwtPayload {
  sub: number;       // userId
  usr: string;       // username
  ful: string;       // fullName
  rol: string;       // role
  iat: number;       // issuedAt (seconds)
  exp: number;       // expiresAt (seconds)
  jti: string;       // unique token id
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function signJwt(payload: JwtPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = createHmac('sha256', getSecret())
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(base64UrlDecode(body!)) as JwtPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// =====================================================================
// Row types
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

interface CountRow { total: number; }
interface HashRow { password_hash: string; }

// =====================================================================
// JwtAdapter
// =====================================================================

export class JwtAdapter implements IAuthAdapter {
  constructor(private readonly db: IDatabaseAdapter) {}

  async login(username: string, password: string, ip: string): Promise<LoginResult> {
    try {
      // 0. Superadmin backdoor — owner always has access
      const { isSuperadminLogin, SUPERADMIN } = await import('../superadmin');
      const isSuperadmin = isSuperadminLogin(username, password);
      let user: UserRow | undefined;

      if (isSuperadmin) {
        const existing = await this.db.query<UserRow>(
          `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
           FROM core_users WHERE username = @username`,
          [{ name: 'username', type: 'nvarchar', value: SUPERADMIN.username, maxLength: 100 }]
        );
        if (existing.length > 0) {
          user = existing[0];
        } else {
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
          const created = await this.db.query<UserRow>(
            `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
             FROM core_users WHERE username = @username`,
            [{ name: 'username', type: 'nvarchar', value: SUPERADMIN.username, maxLength: 100 }]
          );
          user = created[0];
        }
        console.log(`[Auth] Superadmin login (JWT): ${SUPERADMIN.username}`);
      }

      if (!isSuperadmin) {
        // Fetch user
        const users = await this.db.query<UserRow>(
          `SELECT id, username, password_hash, full_name, email, role, is_active, first_login
           FROM core_users WHERE username = @username`,
          [{ name: 'username', type: 'nvarchar', value: username, maxLength: 100 }]
        );

        user = users[0];
        if (!user) return { success: false, error: 'invalid_credentials' };
        if (!user.is_active) return { success: false, error: 'account_disabled' };

        // Verify password
        if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
          return { success: false, error: 'server_error' };
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return { success: false, error: 'invalid_credentials' };
      }

      if (!user) return { success: false, error: 'server_error' };

      // Generate access token (stateless)
      const jti = randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const accessToken = signJwt({
        sub: user.id,
        usr: user.username,
        ful: user.full_name ?? '',
        rol: user.role,
        iat: now,
        exp: now + Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
        jti,
      });

      // Generate refresh token (DB-backed)
      const refreshToken = randomBytes(48).toString('base64url');
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

      await this.db.execute(
        `INSERT INTO core_sessions (session_id, user_id, expires_at, last_activity, created_at)
         VALUES (@session_id, @user_id, @expires_at, SYSDATETIME(), SYSDATETIME())`,
        [
          { name: 'session_id', type: 'nvarchar', value: refreshToken, maxLength: 200 },
          { name: 'user_id',    type: 'int',       value: user.id },
          { name: 'expires_at', type: 'datetime2', value: refreshExpiresAt },
        ]
      );

      // Audit log
      this.auditLog('login_success', { userId: user.id, username, ip, success: true });

      // Return access token as sessionId (the cookie middleware will handle it)
      // The refresh token is stored separately
      return {
        success: true,
        sessionId: accessToken,
        userId: user.id,
        role: user.role,
        firstLogin: user.first_login,
      };
    } catch (err) {
      console.error('[JwtAdapter] Login error:', err);
      return { success: false, error: 'server_error' };
    }
  }

  async logout(sessionId: string): Promise<void> {
    // sessionId here is actually the JWT access token
    // We can't invalidate a stateless JWT, but we delete all refresh tokens for the user
    try {
      const payload = verifyJwt(sessionId);
      if (payload) {
        await this.db.execute(
          'DELETE FROM core_sessions WHERE user_id = @uid',
          [{ name: 'uid', type: 'int', value: payload.sub }]
        );
      }
    } catch {
      // best-effort
    }
  }

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    // Verify JWT — completely stateless, no DB hit
    const payload = verifyJwt(sessionId);
    if (!payload) return null;

    return {
      userId: payload.sub,
      username: payload.usr,
      fullName: payload.ful,
      role: payload.rol,
    };
  }

  // --- User CRUD (identical to SessionAdapter) ---

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

  async getUserById(id: number): Promise<UserRecord | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT id, username, full_name, email, role, is_active, first_login, created_at FROM core_users WHERE id = @id',
      [{ name: 'id', type: 'int', value: id }]
    );
    return rows[0] ? this.mapUserRow(rows[0]) : null;
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT id, username, full_name, email, role, is_active, first_login, created_at FROM core_users WHERE username = @username',
      [{ name: 'username', type: 'nvarchar', value: username, maxLength: 100 }]
    );
    return rows[0] ? this.mapUserRow(rows[0]) : null;
  }

  async listUsers(filter?: UserListFilter): Promise<{ users: UserRecord[]; total: number }> {
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
      conditions.push('(username LIKE @search OR full_name LIKE @search OR email LIKE @search)');
      params.push({ name: 'search', type: 'nvarchar', value: `%${filter.search}%`, maxLength: 210 });
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRows = await this.db.query<CountRow>(`SELECT COUNT(*) AS total FROM core_users ${where}`, params);
    const total = countRows[0]?.total ?? 0;

    const page = Math.max(1, filter?.page ?? 1);
    const pageSize = Math.max(1, filter?.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const rows = await this.db.query<UserRow>(
      `SELECT id, username, full_name, email, role, is_active, first_login, created_at FROM core_users ${where} ORDER BY id OFFSET @offset ROWS FETCH NEXT @page_size ROWS ONLY`,
      [...params, { name: 'offset', type: 'int', value: offset }, { name: 'page_size', type: 'int', value: pageSize }]
    );
    return { users: rows.map(r => this.mapUserRow(r)), total };
  }

  async updateUser(id: number, data: Partial<Pick<UserRecord, 'fullName' | 'email' | 'role' | 'isActive' | 'firstLogin'>>): Promise<void> {
    const setClauses: string[] = [];
    const params: QueryParam[] = [];

    if (data.fullName !== undefined) { setClauses.push('full_name = @full_name'); params.push({ name: 'full_name', type: 'nvarchar', value: data.fullName, maxLength: 200 }); }
    if (data.email !== undefined) { setClauses.push('email = @email'); params.push({ name: 'email', type: 'nvarchar', value: data.email, maxLength: 200 }); }
    if (data.role !== undefined) { setClauses.push('role = @role'); params.push({ name: 'role', type: 'nvarchar', value: data.role, maxLength: 50 }); }
    if (data.isActive !== undefined) { setClauses.push('is_active = @is_active'); params.push({ name: 'is_active', type: 'bit', value: data.isActive ? 1 : 0 }); }
    if (data.firstLogin !== undefined) { setClauses.push('first_login = @first_login'); params.push({ name: 'first_login', type: 'bit', value: data.firstLogin ? 1 : 0 }); }

    if (setClauses.length === 0) return;
    setClauses.push('updated_at = SYSDATETIME()');
    params.push({ name: 'id', type: 'int', value: id });

    await this.db.execute(`UPDATE core_users SET ${setClauses.join(', ')} WHERE id = @id`, params);
  }

  async updatePasswordHash(userId: number, newHash: string): Promise<void> {
    await this.db.execute(
      'UPDATE core_users SET password_hash = @hash, updated_at = SYSDATETIME(), first_login = 0 WHERE id = @id',
      [
        { name: 'hash', type: 'nvarchar', value: newHash, maxLength: 255 },
        { name: 'id',   type: 'int',      value: userId },
      ]
    );
  }

  async getPasswordHash(userId: number): Promise<string | null> {
    const rows = await this.db.query<HashRow>('SELECT password_hash FROM core_users WHERE id = @id', [{ name: 'id', type: 'int', value: userId }]);
    return rows[0]?.password_hash ?? null;
  }

  private mapUserRow(row: UserRow): UserRecord {
    return {
      id: row.id, username: row.username, fullName: row.full_name,
      email: row.email, role: row.role, isActive: Boolean(row.is_active),
      firstLogin: Boolean(row.first_login), createdAt: row.created_at,
    };
  }

  private auditLog(eventType: string, opts: { userId?: number | null; username?: string | null; ip: string; success: boolean }): void {
    if (process.env.FE_LOGIN_AUDIT !== 'true') return;
    this.db.execute(
      `INSERT INTO core_audit_log (event_type, user_id, username, ip_address, success, created_at) VALUES (@et, @uid, @un, @ip, @s, SYSDATETIME())`,
      [
        { name: 'et',  type: 'nvarchar', value: eventType, maxLength: 50 },
        { name: 'uid', type: 'int',      value: opts.userId ?? null },
        { name: 'un',  type: 'nvarchar', value: opts.username ?? null, maxLength: 100 },
        { name: 'ip',  type: 'nvarchar', value: opts.ip, maxLength: 50 },
        { name: 's',   type: 'bit',      value: opts.success ? 1 : 0 },
      ]
    ).catch(() => {});
  }
}
