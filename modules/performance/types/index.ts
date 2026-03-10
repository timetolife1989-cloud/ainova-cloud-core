export interface PerformanceEntry {
  id: number;
  entryDate: string;
  workerName: string;
  teamName: string | null;
  taskCode: string | null;
  taskName: string | null;
  quantity: number;
  normTime: number | null;
  actualTime: number | null;
  efficiency: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface PerformanceTarget {
  id: number;
  targetType: 'worker' | 'team' | 'global';
  targetName: string | null;
  periodType: 'daily' | 'weekly' | 'monthly';
  targetValue: number;
  targetUnit: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface PerformanceSummary {
  totalQuantity: number;
  totalNormTime: number;
  totalActualTime: number;
  avgEfficiency: number;
  entriesCount: number;
}
