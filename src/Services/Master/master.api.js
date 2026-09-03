// Master (Reference Data) endpoints — per the official Postman collection
// ("InnoVerse_ConfigProcessor"), these live under the "Master (Reference
// Data)" folder and are distinct from the Institution/Module CONFIGURATION
// endpoints (/institution/module/list, /institution/module/get_active).
//
// Phase 24C only wires up POST /master/module/list, because that is the only
// master reference-data call the senior payseFrontend Sidebar actually makes
// (see payseFrontend src/Hooks/InstaEnroll/useFetchModuleData.jsx, which
// calls its own equivalent module list endpoint once per authenticated
// session and dispatches the result into Redux). payseFrontend's Sidebar
// does NOT call a separate master menu/menu-action/action endpoint for
// navigation — menu hierarchy and actions[] come entirely from the login
// response's data.menu_array. So /master/menu/list, /master/menu_action/list
// and /master/action/list are intentionally NOT called here; wiring them in
// without a concrete sidebar/consumer requirement would violate the "do not
// call every master endpoint unless the senior sidebar actually requires it"
// rule for this phase.
import { API_BASE_URL } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";

// The real Innoverse backend wraps responses as { code, message, data },
// matching what src/Services/Auth/auth.service.js observes in practice
// (payload.data.user_session_info etc.) — NOT the { success, data } shape
// src/Services/api/response.js's unwrapApiResponse assumes. That helper is
// only exercised today by services gated behind NON_LOGIN_APIS_ENABLED
// (disabled), so it has never been validated against a live response. Master
// endpoints are live for this phase, so we extract `.data` directly instead.
function extractData(payload, fallback) {
  if (payload !== null && typeof payload === "object" && "data" in payload) {
    return payload.data ?? fallback;
  }
  return payload ?? fallback;
}

const REQUEST_TIMEOUT = 10000;

async function masterPost(path, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(API_BASE_URL + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body ?? {}),
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
    return extractData(payload, []);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.module_list)) return data.module_list;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

export const masterApi = {
  // POST /master/module/list, body {} — the official generic module
  // reference-data source (NOT /institution/module/list or
  // /institution/module/get_active, which configure per-institution module
  // activation and are out of scope for the sidebar's module catalogue).
  moduleList: async () => toArray(await masterPost("/master/module/list", {})),
};
