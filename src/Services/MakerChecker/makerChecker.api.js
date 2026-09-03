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
export const makerCheckerApi = {
  getAllPending: () => request("/pending/all", undefined, []),
  getPendingByEntity: (entityKey) =>
    request(`/pending/entities/${entityKey}/pending`, undefined, []),
  getEntityHistory: (entityKey, entityId) =>
    request(`/pending/entities/${entityKey}/${entityId}/history`, undefined, []),
  getLifecycle: (entityKey, auditKey) =>
    request(`/pending/entities/${entityKey}/lifecycle/${auditKey}`, undefined, []),
  approveRequest: (requestId, payload) =>
    request(`/pending/requests/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  rejectRequest: (requestId, payload) =>
    request(`/pending/requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  continueRejectedAdd: (entityKey, requestId, payload) =>
    request(`/pending/adds/${entityKey}/${requestId}/edit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteRejectedAdd: (entityKey, requestId, payload) =>
    request(`/pending/adds/${entityKey}/${requestId}/delete`, {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
};
