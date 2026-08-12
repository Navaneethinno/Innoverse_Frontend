export type AuthStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DELETED"
  | "ADD_AUTH"
  | "EDIT_AUTH"
  | "DEL_AUTH"
  | "DEAUTH"
  | "EDIT_DEAUTH";

// Keep InstStatus as alias for backward compat with StatusBadge
export type InstStatus = AuthStatus | string;

export interface NamedUser {
  id: string | number;
  name: string;
  username?: string;
}

export interface InstitutionKycCreate {
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
}

export interface Institution {
  id: string | number;
  code: string;
  name: string;
  type: string;
  status?: string;
  auth_status?: string;
  created_by?: NamedUser | null;
  approved_by?: NamedUser | null;
  kyc?: InstitutionKycCreate | null;
}

export interface CreateInstitutionPayload {
  code: string;
  name: string;
  type: string;
  remark?: string | null;
  kyc: InstitutionKycCreate;
}

export interface UpdateInstitutionPayload {
  name?: string;
  remark?: string | null;
}

export interface RemarkPayload {
  remark?: string | null;
}
