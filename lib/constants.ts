/** Minimum password length */
export const PASSWORD_MIN_LENGTH = 8;

/** Password complexity policy */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: false,
} as const;

/** Minimum username length */
export const USERNAME_MIN_LENGTH = 3;

/** Default pagination page size */
export const DEFAULT_PAGE_SIZE = 20;

/** bcrypt work factor */
export const BCRYPT_ROUNDS = 12;

/** Session idle timeout in minutes */
export const SESSION_IDLE_TIMEOUT_MINUTES = 30;

/** Session absolute timeout in hours */
export const SESSION_ABSOLUTE_TIMEOUT_HOURS = 24;

/** In-memory session cache TTL in minutes */
export const SESSION_CACHE_TTL_MINUTES = 15;

/** Login rate limit: max failed attempts */
export const LOGIN_RATE_LIMIT_ATTEMPTS = 5;

/** Login rate limit: window in minutes */
export const LOGIN_RATE_LIMIT_WINDOW_MINUTES = 15;

/** Max file upload size for settings (logo etc.) */
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// ── Deployment Flavor ─────────────────────────────────────────────────
export type DeploymentFlavor = 'cloud' | 'site';

export const DEPLOYMENT_FLAVOR: DeploymentFlavor =
  (process.env.DEPLOYMENT_FLAVOR as DeploymentFlavor) || 'cloud';

export const DEPLOYMENT_FLAVOR_LABEL: Record<DeploymentFlavor, string> = {
  cloud: 'ACI Cloud',
  site:  'ACI Site',
};
