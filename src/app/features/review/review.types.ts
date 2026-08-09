export type ChangeStatus = "pending" | "approved" | "rejected";

export interface PendingChange {
  id: string;
  institutionId: string;
  institutionName: string;
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: ChangeStatus;
}

