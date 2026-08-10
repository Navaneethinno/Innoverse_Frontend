export interface NamedUser {
  id: string | number;
  name: string;
}

export interface PlatformUser {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  address: string;
  status: "ACTIVE" | "PENDING" | "REJECTED";
  owner?: NamedUser | null;
  created_by?: NamedUser | null;
  approved_by?: NamedUser | null;
  created_at: string;
}

export interface CreatePlatformUserPayload {
  code: string;
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  address: string;
}
