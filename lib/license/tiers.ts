/**
 * Tier → module assignment.
 * Defines which package includes which modules by default.
 * The core_license table modules_allowed field can override this (e.g. custom package).
 */
export const TIER_MODULES: Record<string, string[]> = {
  basic: [
    'workforce',       // Headcount & Attendance
    'tracking',        // Task/order tracking
    'fleet',           // Vehicle fleet
    'file-import',     // Generic CSV/Excel import
    'reports',         // Basic report generator
  ],
  professional: [
    // Everything in basic:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    // Plus:
    'performance',     // Individual and team KPI
    'scheduling',      // Capacity planning
    'delivery',        // Delivery report
    'inventory',       // Inventory management
    'sap-import',      // SAP Excel import
  ],
  enterprise: [
    // Everything in professional:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    'performance', 'scheduling', 'delivery', 'inventory', 'sap-import',
    // Plus:
    'oee',             // Overall Equipment Effectiveness
    'plc-connector',   // PLC data processing
    'shift-management',// Shift scheduling
    'quality',         // Quality control
    'maintenance',     // Maintenance
    'api-gateway',     // REST/webhook integration
    'multi-site',      // Multi-site support
  ],
  dev: ['*'],  // All modules enabled (for development)
};

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
  dev: 'Development',
};

export const TIER_MAX_USERS: Record<string, number> = {
  basic: 10,
  professional: 50,
  enterprise: 0,     // 0 = unlimited
  dev: 999,
};

export const TIER_COLORS: Record<string, string> = {
  basic: 'bg-green-600',
  professional: 'bg-blue-600',
  enterprise: 'bg-purple-600',
  dev: 'bg-gray-600',
};
