import { getDb } from '@/lib/db';
import { ADDON_MODULES } from '@/lib/license/tiers';

export type LicenseTier = 'starter' | 'basic' | 'professional' | 'enterprise' | 'dev';

export interface LicenseInfo {
  tier: LicenseTier;
  customerName: string | null;
  modulesAllowed: string[];     // module IDs, ['*'] = all
  featuresAllowed: string[];    // feature flags, ['*'] = all
  maxUsers: number;
  expiresAt: Date | null;       // null = does not expire
  isExpired: boolean;
  isActive: boolean;
}

interface LicenseRow {
  tier: string;
  customer_name: string | null;
  modules_allowed: string | null;
  features_allowed: string | null;
  max_users: number;
  expires_at: Date | null;
  is_active: boolean;
}

let _cached: LicenseInfo | null = null;
let _cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Returns the active license data.
 * Cached for 5 minutes.
 * If no license exists in DB, returns 'basic' tier with empty module list.
 */
export async function getLicense(): Promise<LicenseInfo> {
  const now = Date.now();
  if (_cached && (now - _cachedAt) < CACHE_TTL) return _cached;

  try {
    const rows = await getDb().query<LicenseRow>(
      `SELECT TOP 1 tier, customer_name, modules_allowed, features_allowed,
              max_users, expires_at, is_active
       FROM core_license
       WHERE is_active = 1
       ORDER BY id DESC`
    );

    if (rows.length === 0) {
      _cached = getDefaultLicense();
      _cachedAt = now;
      return _cached;
    }

    const row = rows[0];
    const modulesAllowed = safeJsonParse(row.modules_allowed, []);
    const featuresAllowed = safeJsonParse(row.features_allowed, []);
    const isExpired = row.expires_at
      ? new Date(row.expires_at).getTime() < now
      : false;

    _cached = {
      tier: row.tier as LicenseTier,
      customerName: row.customer_name,
      modulesAllowed,
      featuresAllowed,
      maxUsers: row.max_users ?? 10,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      isExpired,
      isActive: Boolean(row.is_active) && !isExpired,
    };
    _cachedAt = now;
    return _cached;
  } catch (err) {
    console.error('[License] Failed to load license:', err);
    return getDefaultLicense();
  }
}

/** Checks if a specific module is allowed by the license (tier modules + add-ons). */
export async function isModuleAllowed(moduleId: string): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.modulesAllowed.includes('*')) return true;
  // Check if module is in the tier's base modules
  if (license.modulesAllowed.includes(moduleId)) return true;
  // Check if module is an active add-on for this license
  const addon = ADDON_MODULES.find(a => a.id === moduleId);
  if (addon && license.modulesAllowed.includes(`addon:${moduleId}`)) return true;
  return false;
}

/** Checks if a specific feature is allowed. */
export async function isFeatureAllowed(featureId: string): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.featuresAllowed.includes('*')) return true;
  return license.featuresAllowed.includes(featureId);
}

/** Checks if a new user can still be created. */
export async function canCreateUser(): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.maxUsers <= 0) return true; // 0 = unlimited
  try {
    const rows = await getDb().query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM core_users WHERE is_active = 1'
    );
    return (rows[0]?.total ?? 0) < license.maxUsers;
  } catch {
    return true;
  }
}

/** Clear cache (call after license key change) */
export function clearLicenseCache(): void {
  _cached = null;
  _cachedAt = 0;
}

function getDefaultLicense(): LicenseInfo {
  return {
    tier: 'basic',
    customerName: null,
    modulesAllowed: [],
    featuresAllowed: [],
    maxUsers: 5,
    expiresAt: null,
    isExpired: false,
    isActive: true,
  };
}

function safeJsonParse(value: string | null, fallback: string[]): string[] {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
