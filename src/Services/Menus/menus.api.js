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
  modules: () => request(API_ENDPOINTS.MENUS.MODULES, undefined, []),
  menus: () => request(API_ENDPOINTS.MENUS.MENUS, undefined, []),
  menuActions: () => request(API_ENDPOINTS.MENUS.MENU_ACTIONS, undefined, []),
  pending: (entity) => request(API_ENDPOINTS.PENDING.BY_ENTITY(entity), undefined, []),
  createModule: (payload) => post(API_ENDPOINTS.MENUS.MODULES, payload),
  createMenu: (payload) => post(API_ENDPOINTS.MENUS.MENUS, payload),
  createMenuAction: (payload) => post(API_ENDPOINTS.MENUS.MENU_ACTIONS, payload),
  updateModule: (id, payload) => update(API_ENDPOINTS.MENUS.MODULE_BY_ID(id), payload),
  updateMenu: (id, payload) => update(API_ENDPOINTS.MENUS.MENU_BY_ID(id), payload),
  updateMenuAction: (id, payload) => update(API_ENDPOINTS.MENUS.MENU_ACTION_BY_ID(id), payload),
  deleteModule: (id, payload) => remove(API_ENDPOINTS.MENUS.MODULE_BY_ID(id), payload),
  deleteMenu: (id, payload) => remove(API_ENDPOINTS.MENUS.MENU_BY_ID(id), payload),
  deleteMenuAction: (id, payload) => remove(API_ENDPOINTS.MENUS.MENU_ACTION_BY_ID(id), payload),
  activateModule: (id, payload) => post(API_ENDPOINTS.MENUS.MODULE_ACTIVATE(id), payload),
  activateMenu: (id, payload) => post(API_ENDPOINTS.MENUS.MENU_ACTIVATE(id), payload),
  activateMenuAction: (id, payload) => post(API_ENDPOINTS.MENUS.MENU_ACTION_ACTIVATE(id), payload),
  deactivateModule: (id, payload) => post(API_ENDPOINTS.MENUS.MODULE_DEACTIVATE(id), payload),
  deactivateMenu: (id, payload) => post(API_ENDPOINTS.MENUS.MENU_DEACTIVATE(id), payload),
  deactivateMenuAction: (id, payload) =>
    post(API_ENDPOINTS.MENUS.MENU_ACTION_DEACTIVATE(id), payload),
  approve: (requestId, payload) => post(API_ENDPOINTS.PENDING.APPROVE(requestId), payload ?? {}),
  reject: (requestId, payload) => post(API_ENDPOINTS.PENDING.REJECT(requestId), payload ?? {}),
  audit: (entity, id) =>
    request(API_ENDPOINTS.PENDING.ENTITY_HISTORY(entity, id), undefined, []),
  continueRejectedAdd: (entity, requestId, payload, mode) =>
    mode === "edit"
      ? post(API_ENDPOINTS.PENDING.CONTINUE_ADD_EDIT(entity, requestId), payload)
      : post(API_ENDPOINTS.PENDING.CONTINUE_ADD_DELETE(entity, requestId), {
          remark: payload.remark,
        }),
};
