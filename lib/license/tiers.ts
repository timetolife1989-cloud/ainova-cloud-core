/**
 * Tier → modul hozzárendelés.
 * Ez definiálja, hogy melyik csomag milyen modulokat tartalmaz ALAPBÓL.
 * A core_license tábla modules_allowed mezője felülírhatja (pl. egyedi csomag).
 */
export const TIER_MODULES: Record<string, string[]> = {
  basic: [
    'workforce',       // Létszám & Jelenlét
    'tracking',        // Feladat/rendelés felkövetés
    'fleet',           // Gépkocsi futás
    'file-import',     // Generikus CSV/Excel import
    'reports',         // Alap riport generátor
  ],
  professional: [
    // Minden ami basic-ben van:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    // Plusz:
    'performance',     // Egyéni és csapat KPI
    'scheduling',      // Kapacitás tervezés
    'delivery',        // Kiszállítás riport
    'inventory',       // Készletnyilvántartás
    'sap-import',      // SAP Excel import
  ],
  enterprise: [
    // Minden ami professional-ben van:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    'performance', 'scheduling', 'delivery', 'inventory', 'sap-import',
    // Plusz:
    'oee',             // Overall Equipment Effectiveness
    'plc-connector',   // PLC adatfeldolgozás
    'shift-management',// Műszakbeosztás
    'quality',         // Minőségellenőrzés
    'maintenance',     // Karbantartás
    'api-gateway',     // REST/webhook integráció
    'multi-site',      // Több telephely
  ],
  dev: ['*'],  // Minden modul engedélyezve (fejlesztéshez)
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
  enterprise: 0,     // 0 = korlátlan
  dev: 999,
};

export const TIER_COLORS: Record<string, string> = {
  basic: 'bg-green-600',
  professional: 'bg-blue-600',
  enterprise: 'bg-purple-600',
  dev: 'bg-gray-600',
};
