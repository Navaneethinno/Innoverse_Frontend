import type { CheckerConfigPayload } from "../maker-checker.types";

export interface InstitutionKycRecord {
  id: string | number;
  institution_id: string | number;
  legal_name: string | null;
  registration_number: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  kyc_status: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface InstitutionKycPayload extends CheckerConfigPayload {
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface UserKycRecord {
  id: string | number;
  user_id: string | number;
  full_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  id_type: string | null;
  id_number: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  kyc_status: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface UserKycPayload extends CheckerConfigPayload {
  full_name?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  id_type?: string;
  id_number?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

// Legacy alias kept for any remaining usages
export type KycRecord = InstitutionKycRecord | UserKycRecord;
export type CreateKycPayload = InstitutionKycPayload | UserKycPayload;
