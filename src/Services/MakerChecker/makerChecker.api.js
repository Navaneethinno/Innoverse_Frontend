import { API_BASE_URL, API_ENDPOINTS, NON_LOGIN_APIS_ENABLED } from "@/Utils/Constant";
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
  getAllPending: () => request(API_ENDPOINTS.PENDING.ALL, undefined, []),
  getPendingByEntity: (entityKey) =>
    request(API_ENDPOINTS.PENDING.BY_ENTITY(entityKey), undefined, []),
  getEntityHistory: (entityKey, entityId) =>
    request(API_ENDPOINTS.PENDING.ENTITY_HISTORY(entityKey, entityId), undefined, []),
  getLifecycle: (entityKey, auditKey) =>
    request(API_ENDPOINTS.PENDING.LIFECYCLE(entityKey, auditKey), undefined, []),
  approveRequest: (requestId, payload) =>
    request(API_ENDPOINTS.PENDING.APPROVE(requestId), {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  rejectRequest: (requestId, payload) =>
    request(API_ENDPOINTS.PENDING.REJECT(requestId), {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  continueRejectedAdd: (entityKey, requestId, payload) =>
    request(API_ENDPOINTS.PENDING.CONTINUE_ADD_EDIT(entityKey, requestId), {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteRejectedAdd: (entityKey, requestId, payload) =>
    request(API_ENDPOINTS.PENDING.CONTINUE_ADD_DELETE(entityKey, requestId), {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
};
