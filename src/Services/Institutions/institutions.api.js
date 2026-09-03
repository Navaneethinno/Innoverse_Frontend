import { API_BASE_URL, NON_LOGIN_APIS_ENABLED } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { unwrapApiResponse } from "@/Services/api/response";
const DEFAULT_TIMEOUT = 10000;
function handleUnauthorized() {
  clearAuthSession();
  window.dispatchEvent(new Event("auth:unauthorized"));
}
async function request(path, init, fallback) {
  if (!NON_LOGIN_APIS_ENABLED) {
    if (init?.method && init.method !== "GET") throw new Error("API not enabled");
    return fallback;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
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
      handleUnauthorized();
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
export const institutionsApi = {
  list: async () => {
    const response = await request("/institutions", undefined, []);
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
  },
  getById: (id) => request(`/institutions/${id}`, undefined, null),
  create: (payload) =>
    request("/institutions", { method: "POST", body: JSON.stringify(payload) }, undefined),
  update: (id, payload) =>
    request(`/institutions/${id}`, { method: "PUT", body: JSON.stringify(payload) }, undefined),
  delete: (id, payload) =>
    request(
      `/institutions/${id}`,
      { method: "DELETE", ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}) },
      undefined,
    ),
  activate: (id, payload) =>
    request(
      `/institutions/${id}/activate`,
      { method: "POST", ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}) },
      undefined,
    ),
  deactivate: (id, payload) =>
    request(
      `/institutions/${id}/deactivate`,
      { method: "POST", ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}) },
      undefined,
    ),
  listPending: () => request("/pending/entities/institutions/pending", undefined, []),
  getHistory: (id) => request(`/pending/entities/institutions/${id}/history`, undefined, []),
  getLifecycle: (auditKey) =>
    request(`/pending/entities/institutions/lifecycle/${auditKey}`, undefined, []),
  approve: (requestId, payload) =>
    request(
      `/pending/requests/${requestId}/approve`,
      { method: "POST", body: JSON.stringify(payload ?? {}) },
      undefined,
    ),
  reject: (requestId, payload) =>
    request(
      `/pending/requests/${requestId}/reject`,
      { method: "POST", body: JSON.stringify(payload ?? {}) },
      undefined,
    ),
  continueRejectedAdd: (requestId, payload, mode) =>
    mode === "edit"
      ? request(
          `/pending/adds/institutions/${requestId}/edit`,
          { method: "POST", body: JSON.stringify(payload) },
          undefined,
        )
      : request(
          `/pending/adds/institutions/${requestId}/delete`,
          { method: "POST", body: JSON.stringify({ remark: payload.remark }) },
          undefined,
        ),
};
