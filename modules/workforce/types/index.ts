export interface WorkforceDaily {
  id: number;
  recordDate: string;
  shiftName: string | null;
  areaName: string | null;
  plannedCount: number;
  actualCount: number;
  absentCount: number;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceDailyInput {
  recordDate: string;
  shiftName?: string;
  areaName?: string;
  plannedCount: number;
  actualCount: number;
  absentCount?: number;
  notes?: string;
}

export interface WorkforceSummary {
  totalPlanned: number;
  totalActual: number;
  totalAbsent: number;
  attendanceRate: number;
}
