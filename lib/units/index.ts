import { getDb } from '@/lib/db';

export interface UnitInfo {
  id: number;
  unitCode: string;
  unitLabel: string;
  unitType: string;
  symbol: string | null;
  decimals: number;
  isBuiltin: boolean;
  isActive: boolean;
}

interface UnitRow {
  id: number;
  unit_code: string;
  unit_label: string;
  unit_type: string;
  symbol: string | null;
  decimals: number;
  is_builtin: boolean;
  is_active: boolean;
}

let _cache: UnitInfo[] | null = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Get all active units.
 * Cached for 5 minutes.
 */
export async function getAllUnits(): Promise<UnitInfo[]> {
  const now = Date.now();
  if (_cache && (now - _cacheAt) < CACHE_TTL) return _cache;

  try {
    const rows = await getDb().query<UnitRow>(
      `SELECT id, unit_code, unit_label, unit_type, symbol, decimals, is_builtin, is_active
       FROM core_units WHERE is_active = 1 ORDER BY unit_type, unit_label`
    );

    _cache = rows.map(r => ({
      id: r.id,
      unitCode: r.unit_code,
      unitLabel: r.unit_label,
      unitType: r.unit_type,
      symbol: r.symbol,
      decimals: r.decimals,
      isBuiltin: Boolean(r.is_builtin),
      isActive: Boolean(r.is_active),
    }));
    _cacheAt = now;
    return _cache;
  } catch (err) {
    console.error('[Units] Failed to load units:', err);
    return [];
  }
}

/**
 * Get all units (active + inactive, for admin).
 */
export async function getAllUnitsAdmin(): Promise<UnitInfo[]> {
  try {
    const rows = await getDb().query<UnitRow>(
      `SELECT id, unit_code, unit_label, unit_type, symbol, decimals, is_builtin, is_active
       FROM core_units ORDER BY unit_type, unit_label`
    );

    return rows.map(r => ({
      id: r.id,
      unitCode: r.unit_code,
      unitLabel: r.unit_label,
      unitType: r.unit_type,
      symbol: r.symbol,
      decimals: r.decimals,
      isBuiltin: Boolean(r.is_builtin),
      isActive: Boolean(r.is_active),
    }));
  } catch (err) {
    console.error('[Units] Failed to load units (admin):', err);
    return [];
  }
}

/**
 * Get a unit by its code.
 */
export async function getUnitByCode(code: string): Promise<UnitInfo | null> {
  const units = await getAllUnits();
  return units.find(u => u.unitCode === code) ?? null;
}

/**
 * Format a value with the appropriate unit of measurement.
 */
export async function formatUnitValue(value: number, unitCode: string): Promise<string> {
  const unit = await getUnitByCode(unitCode);
  if (!unit) return value.toString();

  const formatted = value.toLocaleString('hu-HU', {
    minimumFractionDigits: unit.decimals,
    maximumFractionDigits: unit.decimals,
  });

  return unit.symbol ? `${formatted} ${unit.symbol}` : formatted;
}

/**
 * Clear cache (call after unit changes).
 */
export function clearUnitCache(): void {
  _cache = null;
  _cacheAt = 0;
}
