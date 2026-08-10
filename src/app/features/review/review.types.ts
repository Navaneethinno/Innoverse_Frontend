export type ChangeStatus = "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";

export interface NamedUser {
  id: number | string;
  name: string;
}

export interface PendingChange {
  id: number | string;
  ref_id: number | null;
  owner: NamedUser | null;
  code: string;
  name: string | null;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  process_type: string | null;
  auth_status: ChangeStatus;
  remarks: string | null;
  created_by: NamedUser | null;
  reviewed_by: NamedUser | null;
  // computed alias used by store/UI
  status: ChangeStatus;
}
