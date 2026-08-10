import { apiClient } from "../lib/apiClient";
import type { Institution } from "./institution/institution.types";
import type { PendingChange } from "./review/review.types";
import type { PlatformUser, CreatePlatformUserPayload } from "./platform-users/platformUser.types";

type Envelope<T> = { success: boolean; data: T } | T;

// Only unwrap if response has BOTH success + data keys (strict envelope check)
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

export const apiService = {
  // --- Auth ---
  // login is handled by auth.service.ts directly (no token needed)

  // --- Institutions ---
  getInstitutions: async (): Promise<Institution[]> => {
    const res = await apiClient<Envelope<Institution[]>>("/institutions");
    console.log("API RESPONSE /institutions:", res);
    return unwrap(res, []);
  },

  createInstitution: async (payload: Partial<Institution>): Promise<Institution> => {
    const res = await apiClient<Envelope<Institution>>("/institutions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as Institution);
  },

  // --- Reviews ---
  getReviews: async (): Promise<PendingChange[]> => {
    const res = await apiClient<Envelope<PendingChange[]>>("/reviews");
    console.log("API RESPONSE /reviews:", res);
    const data = unwrap(res, []);
    // Normalize: ensure status mirrors auth_status
    return data.map((item) => ({ ...item, status: item.auth_status ?? item.status ?? "PENDING" }));
  },

  updateReviewStatus: async (id: string, status: PendingChange["status"]): Promise<PendingChange | null> => {
    const action = status.toLowerCase() === "approved" || status.toLowerCase() === "approve" ? "approve" : "reject";
    await apiClient(`/reviews/${id}/${action}`, { method: "POST" });
    return null;
  },

  // --- Platform Users ---
  getPlatformUsers: async (): Promise<PlatformUser[]> => {
    const res = await apiClient<Envelope<PlatformUser[]>>("/platform-users");
    console.log("API RESPONSE /platform-users:", res);
    return unwrap(res, []);
  },

  getPendingPlatformUsers: async (): Promise<PlatformUser[]> => {
    const res = await apiClient<Envelope<PlatformUser[]>>("/platform-users/pending");
    console.log("API RESPONSE /platform-users/pending:", res);
    return unwrap(res, []);
  },

  createPlatformUser: async (payload: CreatePlatformUserPayload): Promise<PlatformUser> => {
    const res = await apiClient<Envelope<PlatformUser>>("/platform-users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap(res, payload as unknown as PlatformUser);
  },

  approvePlatformUser: async (id: string): Promise<void> => {
    await apiClient(`/platform-users/${id}/approve`, { method: "POST" });
  },

  rejectPlatformUser: async (id: string): Promise<void> => {
    await apiClient(`/platform-users/${id}/reject`, { method: "POST" });
  },
};
