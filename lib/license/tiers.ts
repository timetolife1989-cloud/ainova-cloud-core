/**
 * License tier type — strict union to prevent typos.
 */
export type LicenseTier = 'starter' | 'basic' | 'professional' | 'enterprise' | 'dev';

/**
 * Tier → module assignment.
 * Defines which package includes which modules by default.
 * The core_license table modules_allowed field can override this (e.g. custom package).
 */
export const TIER_MODULES: Record<LicenseTier, string[]> = {
  starter: [
    'inventory',       // Inventory management
    'invoicing',       // Invoicing (NAV-compatible)
    'reports',         // Basic report generator
    'file-import',     // Generic CSV/Excel import
  ],
  basic: [
    // Everything in starter:
    'inventory', 'invoicing', 'reports', 'file-import',
    // Plus:
    'workforce',       // Headcount & Attendance
    'tracking',        // Task/order tracking
    'fleet',           // Vehicle fleet
    'purchasing',      // Purchasing / procurement
    'pos',             // Point-of-Sale
  ],
  professional: [
    // Everything in basic:
    'inventory', 'invoicing', 'reports', 'file-import',
    'workforce', 'tracking', 'fleet', 'purchasing', 'pos',
    // Plus:
    'performance',     // Individual and team KPI
    'scheduling',      // Capacity planning
    'delivery',        // Delivery report
    'crm',             // Customer Relationship Management
    'worksheets',      // Service worksheets
  ],
  enterprise: [
    // Everything in professional:
    'inventory', 'invoicing', 'reports', 'file-import',
    'workforce', 'tracking', 'fleet', 'purchasing', 'pos',
    'performance', 'scheduling', 'delivery', 'crm', 'worksheets',
    // Plus:
    'oee',             // Overall Equipment Effectiveness
    'plc-connector',   // PLC data processing
    'shift-management',// Shift scheduling
    'quality',         // Quality control
    'maintenance',     // Maintenance
    'digital-twin',    // Digital Twin visualization
  ],
  dev: ['*'],  // All modules enabled (for development)
};

/**
 * Add-on modules — purchasable on top of tier packages.
 * Each add-on has a minimum tier requirement.
 */
export interface AddonModule {
  id: string;
  minTier: Exclude<LicenseTier, 'dev'>;
  pricePerMonth: number; // EUR
}

export const ADDON_MODULES: AddonModule[] = [
  { id: 'sap-import',    minTier: 'professional', pricePerMonth: 99 },
  { id: 'e-commerce',    minTier: 'basic',        pricePerMonth: 49 },
  { id: 'appointments',  minTier: 'starter',      pricePerMonth: 29 },
  { id: 'recipes',       minTier: 'starter',      pricePerMonth: 29 },
  { id: 'projects',      minTier: 'basic',        pricePerMonth: 49 },
  { id: 'api-gateway',   minTier: 'professional', pricePerMonth: 99 },
  { id: 'multi-site',    minTier: 'enterprise',   pricePerMonth: 199 },
];

export const TIER_LABELS: Record<LicenseTier, string> = {
  starter: 'Starter',
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
  dev: 'Development',
};

export const TIER_MAX_USERS: Record<LicenseTier, number> = {
  starter: 5,
  basic: 15,
  professional: 50,
  enterprise: 0,     // 0 = unlimited
  dev: 999,
};

export const TIER_COLORS: Record<LicenseTier, string> = {
  starter: 'bg-emerald-600',
  basic: 'bg-green-600',
  professional: 'bg-blue-600',
  enterprise: 'bg-purple-600',
  dev: 'bg-gray-600',
};

/**
 * Monthly subscription prices in EUR.
 */
export const TIER_PRICES: Record<Exclude<LicenseTier, 'dev'>, number> = {
  starter: 99,
  basic: 299,
  professional: 599,
  enterprise: 1199,
};

/**
 * One-time implementation fees in EUR.
 */
export const IMPLEMENTATION_FEES: Record<Exclude<LicenseTier, 'dev'>, number> = {
  starter: 299,
  basic: 599,
  professional: 1499,
  enterprise: 2999,
};
