import { API_BASE_URL, API_ENDPOINTS, NON_LOGIN_APIS_ENABLED } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { unwrapApiResponse } from "@/Services/api/response";
const ENTITY_KEY = "profiles";
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
export const profilesApi = {
  list: () => request(API_ENDPOINTS.PROFILES.LIST, undefined, []),
  pending: () => request(API_ENDPOINTS.PENDING.BY_ENTITY(ENTITY_KEY), undefined, []),
  create: (payload) =>
    request(API_ENDPOINTS.PROFILES.LIST, { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(API_ENDPOINTS.PROFILES.BY_ID(id), { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id, payload) =>
    request(API_ENDPOINTS.PROFILES.BY_ID(id), {
      method: "DELETE",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  activate: (id, payload) =>
    request(API_ENDPOINTS.PROFILES.ACTIVATE(id), {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  deactivate: (id, payload) =>
    request(API_ENDPOINTS.PROFILES.DEACTIVATE(id), {
      method: "POST",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    }),
  permissions: (id, payload) =>
    request(API_ENDPOINTS.PROFILES.PERMISSIONS(id), {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  audit: (id) => request(API_ENDPOINTS.PENDING.ENTITY_HISTORY(ENTITY_KEY, id), undefined, []),
  continueRejectedAdd: (requestId, payload, mode) =>
    mode === "edit"
      ? request(API_ENDPOINTS.PENDING.CONTINUE_ADD_EDIT(ENTITY_KEY, requestId), {
          method: "POST",
          body: JSON.stringify(payload),
        })
      : request(API_ENDPOINTS.PENDING.CONTINUE_ADD_DELETE(ENTITY_KEY, requestId), {
          method: "POST",
          body: JSON.stringify({ remark: payload.remark }),
        }),
};
