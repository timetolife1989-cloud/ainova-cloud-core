/**
 * Superadmin / Owner Backdoor
 * ===========================
 * Owner credentials that ALWAYS work, regardless of DB state.
 * This allows the developer/owner to access any installation at any time.
 *
 * Credentials MUST be set via environment variables:
 *   SUPERADMIN_USERNAME  (default: ainova_owner)
 *   SUPERADMIN_PASSWORD  (REQUIRED — no hardcoded fallback)
 *
 * ⚠️  NEVER expose these credentials to customers.
 *     In production builds for clients, set DISABLE_SUPERADMIN=true.
 */

export const SUPERADMIN = {
  get username() { return process.env.SUPERADMIN_USERNAME ?? 'ainova_owner'; },
  get password() { return process.env.SUPERADMIN_PASSWORD ?? ''; },
  fullName: 'Ainova Owner',
  email: 'owner@ainova.hu',
  role: 'admin',
} as const;

/**
 * Check if the given credentials match the superadmin.
 * Returns false if:
 *   - DISABLE_SUPERADMIN env var is 'true'
 *   - SUPERADMIN_PASSWORD env var is not set (no hardcoded fallback)
 */
export function isSuperadminLogin(username: string, password: string): boolean {
  // Legacy env var support
  if (process.env.DISABLE_SUPERADMIN === 'true') return false;
  // In production, superadmin is OFF by default — must explicitly enable
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SUPERADMIN !== 'true') return false;
  if (!SUPERADMIN.password) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ACI] ⚠️ SUPERADMIN_PASSWORD env var not set — superadmin login disabled');
    }
    return false;
  }
  return username === SUPERADMIN.username && password === SUPERADMIN.password;
}
