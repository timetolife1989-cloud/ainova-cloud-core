/**
 * Module Loader
 * =============
 * Betölti az összes modul manifest-jét.
 * Minden manifest a registerModule()-t hívja, ami a registry-be teszi a modult.
 *
 * ÚJ MODUL HOZZÁADÁSAKOR: adj hozzá egy import sort ide.
 */

// LAC (referencia implementáció) — demo módban kikapcsolva
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
import '@/modules/sap-import/manifest';

// === ENTERPRISE csomag ===
import '@/modules/oee/manifest';
import '@/modules/plc-connector/manifest';
import '@/modules/shift-management/manifest';
import '@/modules/quality/manifest';
import '@/modules/maintenance/manifest';
import '@/modules/digital-twin/manifest';
