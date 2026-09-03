import { API_BASE_URL, NON_LOGIN_APIS_ENABLED } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { unwrapApiResponse } from "@/Services/api/response";
async function request(path, init, fallback) {
  if (!NON_LOGIN_APIS_ENABLED) {
    if (init?.method && init.method !== "GET") throw new Error("API not enabled");
    return fallback;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const token = getAccessToken();
  try {
    const response = await fetch(API_BASE_URL + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusMessage = getStatusErrorMessage(response.status);
    if (statusMessage) throw new Error(statusMessage);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Request failed with status " + response.status));
    }
    return unwrapApiResponse(payload, fallback);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}
export const applicationsApi = {
  list: () => request("/applications", undefined, []),
  pending: () => request("/pending/entities/applications/pending", undefined, []),
  assignmentPending: () =>
    request("/pending/entities/institution-applications/pending", undefined, []),
  create: (payload) => request("/applications", { method: "POST", body: JSON.stringify(payload) }),
  assign: (institutionId, applicationId, remark) =>
    request(`/institutions/${institutionId}/assign-application`, {
      method: "POST",
      body: JSON.stringify({ application_id: applicationId, remark }),
    }),
  update: (id, payload) =>
    request(`/applications/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id, payload) =>
    request(`/applications/${id}`, {
      method: "DELETE",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  activate: (id, payload) =>
    request(`/applications/${id}/activate`, {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  deactivate: (id, payload) =>
    request(`/applications/${id}/deactivate`, {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  audit: (id) => request(`/pending/entities/applications/${id}/history`, undefined, []),
  approve: (requestId) =>
    request(`/pending/requests/${requestId}/approve`, { method: "POST", body: JSON.stringify({}) }),
  reject: (requestId) =>
    request(`/pending/requests/${requestId}/reject`, { method: "POST", body: JSON.stringify({}) }),
  continueRejectedAdd: (requestId, payload, mode) =>
    mode === "edit"
      ? request(`/pending/adds/applications/${requestId}/edit`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      : request(`/pending/adds/applications/${requestId}/delete`, {
          method: "POST",
          body: JSON.stringify({ remark: payload.remark }),
        }),
};
