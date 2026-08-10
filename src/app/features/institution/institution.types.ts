export type InstStatus = "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED" | "DRAFT" | "active" | "pending" | "rejected" | "suspended" | "draft";

export interface NamedUser {
  id: string | number;
  name: string;
}

export interface Institution {
  id: string | number;
  code: string;
  name: string;
  legal_name: string | null;
  type: string;
  status: InstStatus;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  owner?: NamedUser | null;
  version?: number;
  created_by?: NamedUser | null;
  approved_by?: NamedUser | null;
  // Legacy / computed fields (kept for backward compat)
  address?: string;
  regNumber?: string;
  createdAt?: string;
  maker?: string;
  checker?: string;
  totalAccounts?: number;
  totalVolume?: string;
  tags?: string[];
}
