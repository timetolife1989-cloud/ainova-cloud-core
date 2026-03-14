/**
 * Module Loader
 * =============
 * Loads all module manifests.
 * Each manifest calls registerModule(), which adds the module to the registry.
 *
 * WHEN ADDING A NEW MODULE: add an import line here.
 */

// LAC (reference implementation) — disabled in demo mode
// import '@/modules/lac-napi-perces/manifest';

// === BASIC csomag ===
import '@/modules/workforce/manifest';
import '@/modules/tracking/manifest';
import '@/modules/fleet/manifest';
import '@/modules/file-import/manifest';
import '@/modules/reports/manifest';

// === PROFESSIONAL csomag ===
import '@/modules/performance/manifest';
import '@/modules/scheduling/manifest';
import '@/modules/delivery/manifest';
import '@/modules/inventory/manifest';
import '@/modules/invoicing/manifest';
import '@/modules/sap-import/manifest';

// === ENTERPRISE csomag ===
import '@/modules/oee/manifest';
import '@/modules/plc-connector/manifest';
import '@/modules/shift-management/manifest';
import '@/modules/quality/manifest';
import '@/modules/maintenance/manifest';
import '@/modules/digital-twin/manifest';
