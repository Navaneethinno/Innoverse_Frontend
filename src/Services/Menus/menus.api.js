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
function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}
function update(path, body) {
  return request(path, { method: "PUT", body: JSON.stringify(body) });
}
function remove(path, payload) {
  return request(path, {
    method: "DELETE",
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
}
export const menusApi = {
  modules: () => request("/modules", undefined, []),
  menus: () => request("/menus", undefined, []),
  menuActions: () => request("/menu-actions", undefined, []),
  pending: (entity) => request(`/pending/entities/${entity}/pending`, undefined, []),
  createModule: (payload) => post("/modules", payload),
  createMenu: (payload) => post("/menus", payload),
  createMenuAction: (payload) => post("/menu-actions", payload),
  updateModule: (id, payload) => update(`/modules/${id}`, payload),
  updateMenu: (id, payload) => update(`/menus/${id}`, payload),
  updateMenuAction: (id, payload) => update(`/menu-actions/${id}`, payload),
  deleteModule: (id, payload) => remove(`/modules/${id}`, payload),
  deleteMenu: (id, payload) => remove(`/menus/${id}`, payload),
  deleteMenuAction: (id, payload) => remove(`/menu-actions/${id}`, payload),
  activateModule: (id, payload) => post(`/modules/${id}/activate`, payload),
  activateMenu: (id, payload) => post(`/menus/${id}/activate`, payload),
  activateMenuAction: (id, payload) => post(`/menu-actions/${id}/activate`, payload),
  deactivateModule: (id, payload) => post(`/modules/${id}/deactivate`, payload),
  deactivateMenu: (id, payload) => post(`/menus/${id}/deactivate`, payload),
  deactivateMenuAction: (id, payload) => post(`/menu-actions/${id}/deactivate`, payload),
  approve: (requestId, payload) => post(`/pending/requests/${requestId}/approve`, payload ?? {}),
  reject: (requestId, payload) => post(`/pending/requests/${requestId}/reject`, payload ?? {}),
  audit: (entity, id) => request(`/pending/entities/${entity}/${id}/history`, undefined, []),
  continueRejectedAdd: (entity, requestId, payload, mode) =>
    mode === "edit"
      ? post(`/pending/adds/${entity}/${requestId}/edit`, payload)
      : post(`/pending/adds/${entity}/${requestId}/delete`, { remark: payload.remark }),
};
