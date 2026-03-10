/**
 * Superadmin / Owner Backdoor
 * ===========================
 * Hardcoded owner credentials that ALWAYS work, regardless of DB state.
 * This allows the developer/owner to access any installation at any time.
 *
 * ⚠️  NEVER expose these credentials to customers.
 *     In production builds for clients, set DISABLE_SUPERADMIN=true.
 */

export const SUPERADMIN = {
  username: 'ainova_owner',
  password: 'AiNova#Core2025!SuperAdmin',
  fullName: 'Ainova Owner',
  email: 'owner@ainova.hu',
  role: 'admin',
} as const;

/**
 * Check if the given credentials match the hardcoded superadmin.
 * Returns false if DISABLE_SUPERADMIN env var is set to 'true'.
 */
export function isSuperadminLogin(username: string, password: string): boolean {
  if (process.env.DISABLE_SUPERADMIN === 'true') return false;
  return username === SUPERADMIN.username && password === SUPERADMIN.password;
}
