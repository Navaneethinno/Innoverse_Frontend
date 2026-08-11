import { apiClient } from "../lib/apiClient";
import type { Institution, CreateInstitutionPayload } from "./institution/institution.types";
import type { Profile, CreateProfilePayload } from "./profiles/profile.types";
import type { User, CreateUserPayload } from "./users/user.types";
import type { Application } from "./applications/application.types";
import type {
  InstitutionKycRecord,
  InstitutionKycPayload,
  UserKycRecord,
  UserKycPayload,
} from "./kyc/kyc.types";

type Envelope<T> = { success: boolean; message?: string; data: T } | T;

function unwrap<T>(res: Envelope<T>, fallback: T): T {
  if (
    res !== null &&
    typeof res === "object" &&
    "success" in (res as object) &&
    "data" in (res as object)
  ) {
    const d = (res as { success: boolean; data: T }).data;
    return d ?? fallback;
  }
  return (res as T) ?? fallback;
}

export interface Permission {
  menu_code: string;
  action_code: string;
}

export const apiService = {
  // ─── Institutions ─────────────────────────────────────────────────────────

  getInstitutions: async (): Promise<Institution[]> => {
    const res = await apiClient<Envelope<Institution[]>>("/institutions");
    return unwrap(res, []);
  },

  getPendingInstitutions: async (): Promise<Institution[]> => {
    const res = await apiClient<Envelope<Institution[]>>("/institutions/pending");
    return unwrap(res, []);
  },

  getInstitutionById: async (institution_id: string | number): Promise<Institution | null> => {
    const res = await apiClient<Envelope<Institution>>(`/institutions/${institution_id}`);
    return unwrap(res, null as unknown as Institution);
  },

  createInstitution: async (payload: CreateInstitutionPayload): Promise<Institution> => {
    const res = await apiClient<Envelope<Institution>>("/institutions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as Institution);
  },

  approveInstitution: async (pending_id: string | number): Promise<void> => {
    await apiClient(`/institutions/${pending_id}/approve`, { method: "POST" });
  },

  rejectInstitution: async (pending_id: string | number): Promise<void> => {
    await apiClient(`/institutions/${pending_id}/reject`, { method: "POST" });
  },

  assignApplication: async (institution_id: string | number, application_id: string | number): Promise<void> => {
    await apiClient(`/institutions/${institution_id}/assign-application`, {
      method: "POST",
      body: JSON.stringify({ application_id }),
    });
  },

  // ─── Profiles ─────────────────────────────────────────────────────────────

  getProfiles: async (): Promise<Profile[]> => {
    const res = await apiClient<Envelope<Profile[]>>("/profiles");
    return unwrap(res, []);
  },

  getProfileById: async (profile_id: string | number): Promise<Profile | null> => {
    const res = await apiClient<Envelope<Profile>>(`/profiles/${profile_id}`);
    return unwrap(res, null as unknown as Profile);
  },

  createProfile: async (payload: CreateProfilePayload): Promise<Profile> => {
    const res = await apiClient<Envelope<Profile>>("/profiles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as Profile);
  },

  // permissions must be the full desired set — backend does a full replace
  setProfilePermissions: async (profile_id: string | number, permissions: Permission[]): Promise<void> => {
    await apiClient(`/profiles/${profile_id}/permissions`, {
      method: "POST",
      body: JSON.stringify({ permissions }),
    });
  },

  // ─── Users ────────────────────────────────────────────────────────────────

  getUsers: async (): Promise<User[]> => {
    const res = await apiClient<Envelope<User[]>>("/users");
    return unwrap(res, []);
  },

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    const res = await apiClient<Envelope<User>>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as User);
  },

  // ─── Applications ─────────────────────────────────────────────────────────

  getApplications: async (): Promise<Application[]> => {
    const res = await apiClient<Envelope<Application[]>>("/applications");
    return unwrap(res, []);
  },

  createApplication: async (payload: { code: string; name: string }): Promise<Application> => {
    const res = await apiClient<Envelope<Application>>("/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as Application);
  },

  // ─── KYC ──────────────────────────────────────────────────────────────────

  getInstitutionKyc: async (institution_id: string | number): Promise<InstitutionKycRecord | null> => {
    const res = await apiClient<Envelope<InstitutionKycRecord>>(`/institutions/${institution_id}/kyc`);
    return unwrap(res, null as unknown as InstitutionKycRecord);
  },

  saveInstitutionKyc: async (institution_id: string | number, payload: InstitutionKycPayload): Promise<InstitutionKycRecord> => {
    const res = await apiClient<Envelope<InstitutionKycRecord>>(`/institutions/${institution_id}/kyc`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as InstitutionKycRecord);
  },

  getUserKyc: async (user_id: string | number): Promise<UserKycRecord | null> => {
    const res = await apiClient<Envelope<UserKycRecord>>(`/users/${user_id}/kyc`);
    return unwrap(res, null as unknown as UserKycRecord);
  },

  saveUserKyc: async (user_id: string | number, payload: UserKycPayload): Promise<UserKycRecord> => {
    const res = await apiClient<Envelope<UserKycRecord>>(`/users/${user_id}/kyc`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as UserKycRecord);
  },
};
