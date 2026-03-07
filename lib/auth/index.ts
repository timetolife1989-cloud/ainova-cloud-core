import { SessionAdapter } from './adapters/SessionAdapter';
import { getDb } from '@/lib/db';
import type { IAuthAdapter } from './IAuthAdapter';

let _auth: IAuthAdapter | null = null;

/**
 * Returns the singleton auth adapter.
 * Adapter type determined by AUTH_ADAPTER env var (default: 'session').
 */
export function getAuth(): IAuthAdapter {
  if (!_auth) {
    const adapter = process.env.AUTH_ADAPTER ?? 'session';
    switch (adapter) {
      case 'session':
        _auth = new SessionAdapter(getDb());
        break;
      default:
        throw new Error(
          `Unsupported auth adapter: "${adapter}". Supported values: session`
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
