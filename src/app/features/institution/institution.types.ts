export type InstStatus = "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED" | "DRAFT" | "active" | "pending" | "rejected" | "suspended" | "draft";

export interface NamedUser {
  id: string | number;
  name: string;
  username?: string;
}

// Nested KYC as returned inside pending institution responses
export interface InstitutionKycCreate {
  id?: string | number;
  institution_id?: string | number;
  legal_name?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  kyc_status?: string | null;
}

export interface Institution {
  id: string | number;
  code: string;
  name: string;
  type: string;
  status?: InstStatus;
  auth_status?: string;
  created_by?: NamedUser | null;
  approved_by?: NamedUser | null;
  // present on pending records
  kyc?: InstitutionKycCreate | null;
}

// Payload for POST /institutions — code, name, type + nested kyc only
export interface CreateInstitutionPayload {
  code: string;
  name: string;
  type: string;
  kyc: InstitutionKycCreate;
}
