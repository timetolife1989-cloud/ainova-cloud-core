import { SessionAdapter } from './adapters/SessionAdapter';
import { JwtAdapter } from './adapters/JwtAdapter';
import { getDb } from '@/lib/db';
import type { IAuthAdapter } from './IAuthAdapter';

let _auth: IAuthAdapter | null = null;

/**
 * Returns the singleton auth adapter.
 * Adapter type determined by AUTH_ADAPTER env var (default: 'session').
 * 
 * Supported values: session, jwt
 */
export function getAuth(): IAuthAdapter {
  if (!_auth) {
    const adapter = process.env.AUTH_ADAPTER ?? 'session';
    switch (adapter) {
      case 'session':
        _auth = new SessionAdapter(getDb());
        break;
      case 'jwt':
        _auth = new JwtAdapter(getDb());
        break;
      default:
        throw new Error(
          `Unsupported auth adapter: "${adapter}". Supported values: session, jwt`
        );
    }
  }
  return _auth;
}

export type {
  IAuthAdapter,
  SessionInfo,
  LoginResult,
  UserRecord,
  CreateUserData,
  UserListFilter,
} from './IAuthAdapter';
