import { apiClient } from "../lib/apiClient";
import type { Institution, CreateInstitutionPayload, UpdateInstitutionPayload, RemarkPayload as InstRemarkPayload } from "./institution/institution.types";
import type { Profile, CreateProfilePayload, UpdateProfilePayload, SetPermissionsPayload } from "./profiles/profile.types";
import type { User, CreateUserPayload, UpdateUserPayload, RemarkPayload as UserRemarkPayload } from "./users/user.types";
import type { Application, CreateApplicationPayload, UpdateApplicationPayload } from "./applications/application.types";
import type { InstitutionKycRecord, InstitutionKycPayload, UserKycRecord, UserKycPayload } from "./kyc/kyc.types";
import type { PendingRequestOut, AuditEntryOut, MakerCheckerResponse, CheckerDecisionRequest } from "./maker-checker.types";

export type { CheckerDecisionRequest, MakerCheckerResponse, PendingRequestOut, AuditEntryOut };

export interface Permission {
  menu_code: string;
  action_code: string;
}

type Envelope<T> = { success: boolean; message?: string; data: T };

function unwrap<T>(res: Envelope<T> | T, fallback: T): T {
  if (
    res !== null &&
    typeof res === "object" &&
    "success" in (res as object) &&
    "data" in (res as object)
  ) {
    const d = (res as Envelope<T>).data;
    return d ?? fallback;
  }
  return (res as T) ?? fallback;
}

async function get<T>(path: string, fallback: T): Promise<T> {
  const res = await apiClient<Envelope<T> | T>(path);
  return unwrap(res as Envelope<T> | T, fallback);
}

async function post<T>(path: string, body?: unknown, fallback?: T): Promise<T> {
  const res = await apiClient<Envelope<T> | T>(path, {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return unwrap(res as Envelope<T> | T, fallback as T);
}

async function put<T>(path: string, body: unknown, fallback?: T): Promise<T> {
  const res = await apiClient<Envelope<T> | T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return unwrap(res as Envelope<T> | T, fallback as T);
}

async function del<T>(path: string, body?: unknown, fallback?: T): Promise<T> {
  const res = await apiClient<Envelope<T> | T>(path, {
    method: "DELETE",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return unwrap(res as Envelope<T> | T, fallback as T);
}

export const apiService = {
  // ─── Institutions ─────────────────────────────────────────────────────────

  getInstitutions: () => get<Institution[]>("/institutions", []),

  getPendingInstitutions: () => get<PendingRequestOut[]>("/institutions/pending", []),

  getInstitutionById: (id: string | number) =>
    get<Institution | null>(`/institutions/${id}`, null),

  createInstitution: (payload: CreateInstitutionPayload) =>
    post<MakerCheckerResponse>("/institutions", payload),

  updateInstitution: (id: string | number, payload: UpdateInstitutionPayload) =>
    put<MakerCheckerResponse>(`/institutions/${id}`, payload),

  deleteInstitution: (id: string | number, payload?: InstRemarkPayload) =>
    del<MakerCheckerResponse>(`/institutions/${id}`, payload),

  activateInstitution: (id: string | number, payload?: InstRemarkPayload) =>
    post<MakerCheckerResponse>(`/institutions/${id}/activate`, payload),

  deactivateInstitution: (id: string | number, payload?: InstRemarkPayload) =>
    post<MakerCheckerResponse>(`/institutions/${id}/deactivate`, payload),

  getInstitutionAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/institutions/${id}/audit`, []),

  approveInstitution: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institutions/requests/${request_id}/approve`, payload ?? {}),

  rejectInstitution: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institutions/requests/${request_id}/reject`, payload ?? {}),

  // ─── Profiles ─────────────────────────────────────────────────────────────

  getProfiles: () => get<Profile[]>("/profiles", []),

  getPendingProfiles: () => get<PendingRequestOut[]>("/profiles/pending", []),

  getProfileById: (id: string | number) =>
    get<Profile | null>(`/profiles/${id}`, null),

  createProfile: (payload: CreateProfilePayload) =>
    post<MakerCheckerResponse>("/profiles", payload),

  updateProfile: (id: string | number, payload: UpdateProfilePayload) =>
    put<MakerCheckerResponse>(`/profiles/${id}`, payload),

  deleteProfile: (id: string | number, payload?: { remark?: string | null }) =>
    del<MakerCheckerResponse>(`/profiles/${id}`, payload),

  activateProfile: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/profiles/${id}/activate`, payload),

  deactivateProfile: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/profiles/${id}/deactivate`, payload),

  getProfileAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/profiles/${id}/audit`, []),

  setProfilePermissions: (id: string | number, payload: SetPermissionsPayload) =>
    post<MakerCheckerResponse>(`/profiles/${id}/permissions`, payload),

  approveProfile: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/profiles/requests/${request_id}/approve`, payload ?? {}),

  rejectProfile: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/profiles/requests/${request_id}/reject`, payload ?? {}),

  // ─── Users ────────────────────────────────────────────────────────────────

  getUsers: () => get<User[]>("/users", []),

  getPendingUsers: () => get<PendingRequestOut[]>("/users/pending", []),

  getUserById: (id: string | number) =>
    get<User | null>(`/users/${id}`, null),

  createUser: (payload: CreateUserPayload) =>
    post<MakerCheckerResponse>("/users", payload),

  updateUser: (id: string | number, payload: UpdateUserPayload) =>
    put<MakerCheckerResponse>(`/users/${id}`, payload),

  deleteUser: (id: string | number, payload?: UserRemarkPayload) =>
    del<MakerCheckerResponse>(`/users/${id}`, payload),

  activateUser: (id: string | number, payload?: UserRemarkPayload) =>
    post<MakerCheckerResponse>(`/users/${id}/activate`, payload),

  deactivateUser: (id: string | number, payload?: UserRemarkPayload) =>
    post<MakerCheckerResponse>(`/users/${id}/deactivate`, payload),

  getUserAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/users/${id}/audit`, []),

  approveUser: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/users/requests/${request_id}/approve`, payload ?? {}),

  rejectUser: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/users/requests/${request_id}/reject`, payload ?? {}),

  // ─── Applications ─────────────────────────────────────────────────────────

  getApplications: () => get<Application[]>("/applications", []),

  getPendingApplications: () => get<PendingRequestOut[]>("/applications/pending", []),

  getApplicationById: (id: string | number) =>
    get<Application | null>(`/applications/${id}`, null),

  createApplication: (payload: CreateApplicationPayload) =>
    post<MakerCheckerResponse>("/applications", payload),

  updateApplication: (id: string | number, payload: UpdateApplicationPayload) =>
    put<MakerCheckerResponse>(`/applications/${id}`, payload),

  deleteApplication: (id: string | number, payload?: { remark?: string | null }) =>
    del<MakerCheckerResponse>(`/applications/${id}`, payload),

  activateApplication: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/applications/${id}/activate`, payload),

  deactivateApplication: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/applications/${id}/deactivate`, payload),

  getApplicationAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/applications/${id}/audit`, []),

  approveApplication: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/applications/requests/${request_id}/approve`, payload ?? {}),

  rejectApplication: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/applications/requests/${request_id}/reject`, payload ?? {}),

  assignApplication: (institution_id: string | number, application_id: string | number, remark?: string | null) =>
    post<MakerCheckerResponse>(`/institutions/${institution_id}/assign-application`, { application_id, remark }),

  getPendingInstitutionApplications: (institution_id: string | number) =>
    get<PendingRequestOut[]>(`/institutions/${institution_id}/applications/pending`, []),

  approveInstitutionApplication: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institution-applications/requests/${request_id}/approve`, payload ?? {}),

  rejectInstitutionApplication: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institution-applications/requests/${request_id}/reject`, payload ?? {}),

  // ─── KYC ──────────────────────────────────────────────────────────────────

  getInstitutionKyc: (institution_id: string | number) =>
    get<InstitutionKycRecord | null>(`/institutions/${institution_id}/kyc`, null),

  saveInstitutionKyc: (institution_id: string | number, payload: InstitutionKycPayload) =>
    post<MakerCheckerResponse>(`/institutions/${institution_id}/kyc`, payload),

  getPendingInstitutionKyc: () =>
    get<PendingRequestOut[]>("/institution-kyc/pending", []),

  approveInstitutionKyc: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institution-kyc/requests/${request_id}/approve`, payload ?? {}),

  rejectInstitutionKyc: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/institution-kyc/requests/${request_id}/reject`, payload ?? {}),

  getUserKyc: (user_id: string | number) =>
    get<UserKycRecord | null>(`/users/${user_id}/kyc`, null),

  saveUserKyc: (user_id: string | number, payload: UserKycPayload) =>
    post<MakerCheckerResponse>(`/users/${user_id}/kyc`, payload),

  getPendingUserKyc: () =>
    get<PendingRequestOut[]>("/user-kyc/pending", []),

  approveUserKyc: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/user-kyc/requests/${request_id}/approve`, payload ?? {}),

  rejectUserKyc: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/user-kyc/requests/${request_id}/reject`, payload ?? {}),

  // ─── Pending Dashboard ────────────────────────────────────────────────────

  getAllPending: () => get<PendingRequestOut[]>("/pending/all", []),
  getPendingByInstitutions: () => get<PendingRequestOut[]>("/pending/institutions", []),
  getPendingByUsers: () => get<PendingRequestOut[]>("/pending/users", []),
  getPendingByProfiles: () => get<PendingRequestOut[]>("/pending/profiles", []),
  getPendingByApplications: () => get<PendingRequestOut[]>("/pending/applications", []),

  // ─── Audit ────────────────────────────────────────────────────────────────

  getAuditInstitution: (id: string | number) =>
    get<AuditEntryOut[]>(`/audit/institutions/${id}`, []),

  getAuditUser: (id: string | number) =>
    get<AuditEntryOut[]>(`/audit/users/${id}`, []),

  getAuditProfile: (id: string | number) =>
    get<AuditEntryOut[]>(`/audit/profiles/${id}`, []),

  getAuditApplication: (id: string | number) =>
    get<AuditEntryOut[]>(`/audit/applications/${id}`, []),

  // ─── Modules ──────────────────────────────────────────────────────────────

  getModules: (application_id?: number) =>
    get<unknown[]>(`/modules${application_id ? `?application_id=${application_id}` : ""}`, []),

  getPendingModules: () => get<PendingRequestOut[]>("/modules/pending", []),

  createModule: (payload: { application_id: number; code: string; name: string; remark?: string | null }) =>
    post<MakerCheckerResponse>("/modules", payload),

  updateModule: (id: string | number, payload: { name?: string; remark?: string | null }) =>
    put<MakerCheckerResponse>(`/modules/${id}`, payload),

  deleteModule: (id: string | number, payload?: { remark?: string | null }) =>
    del<MakerCheckerResponse>(`/modules/${id}`, payload),

  activateModule: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/modules/${id}/activate`, payload),

  deactivateModule: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/modules/${id}/deactivate`, payload),

  getModuleAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/modules/${id}/audit`, []),

  approveModule: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/modules/requests/${request_id}/approve`, payload ?? {}),

  rejectModule: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/modules/requests/${request_id}/reject`, payload ?? {}),

  // ─── Menus ────────────────────────────────────────────────────────────────

  getMenus: (module_id?: number) =>
    get<unknown[]>(`/menus${module_id ? `?module_id=${module_id}` : ""}`, []),

  getPendingMenus: () => get<PendingRequestOut[]>("/menus/pending", []),

  createMenu: (payload: { module_id: number; code: string; name: string; remark?: string | null }) =>
    post<MakerCheckerResponse>("/menus", payload),

  updateMenu: (id: string | number, payload: { name?: string; remark?: string | null }) =>
    put<MakerCheckerResponse>(`/menus/${id}`, payload),

  deleteMenu: (id: string | number, payload?: { remark?: string | null }) =>
    del<MakerCheckerResponse>(`/menus/${id}`, payload),

  activateMenu: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/menus/${id}/activate`, payload),

  deactivateMenu: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/menus/${id}/deactivate`, payload),

  getMenuAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/menus/${id}/audit`, []),

  approveMenu: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/menus/requests/${request_id}/approve`, payload ?? {}),

  rejectMenu: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/menus/requests/${request_id}/reject`, payload ?? {}),

  // ─── Menu Actions ─────────────────────────────────────────────────────────

  getMenuActions: () => get<unknown[]>("/menu-actions", []),

  getPendingMenuActions: () => get<PendingRequestOut[]>("/menu-actions/pending", []),

  createMenuAction: (payload: { menu_id: number; code: string; name: string; remark?: string | null }) =>
    post<MakerCheckerResponse>("/menu-actions", payload),

  updateMenuAction: (id: string | number, payload: { name?: string; remark?: string | null }) =>
    put<MakerCheckerResponse>(`/menu-actions/${id}`, payload),

  deleteMenuAction: (id: string | number, payload?: { remark?: string | null }) =>
    del<MakerCheckerResponse>(`/menu-actions/${id}`, payload),

  activateMenuAction: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/menu-actions/${id}/activate`, payload),

  deactivateMenuAction: (id: string | number, payload?: { remark?: string | null }) =>
    post<MakerCheckerResponse>(`/menu-actions/${id}/deactivate`, payload),

  getMenuActionAudit: (id: string | number) =>
    get<AuditEntryOut[]>(`/menu-actions/${id}/audit`, []),

  approveMenuAction: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/menu-actions/requests/${request_id}/approve`, payload ?? {}),

  rejectMenuAction: (request_id: string, payload?: CheckerDecisionRequest) =>
    post<MakerCheckerResponse>(`/menu-actions/requests/${request_id}/reject`, payload ?? {}),
};
