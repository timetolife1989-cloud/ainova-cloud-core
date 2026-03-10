export interface TrackingItem {
  id: number;
  referenceCode: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  quantity: number | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingHistory {
  id: number;
  itemId: number;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface TrackingItemInput {
  referenceCode?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  quantity?: number;
  dueDate?: string;
}
