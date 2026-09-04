// Institution/Profile endpoints — per the official Postman collection
// ("InnoVerse_ConfigProcessor" → "Institution/Profile"). These are the only
// 9 confirmed endpoints for this entity; sibling sub-entities (Institution
// Type/Legal/Branding/Channel/Currency/Module) are out of scope and are NOT
// implemented here.
//
// Follows the exact same request convention as src/Services/Users/users.api.js
// (itself the sibling maker-checker service in this codebase): a plain POST
// fetch with Content-Type/Deviceinfo/Authorization headers, an AbortController
// timeout, and 401 handling — NOT src/Services/Master/master.api.js's
// extractData() shape, and NOT src/Services/api/response.js's
// unwrapApiResponse() (documented in master.api.js as never validated against
// a live response). The response envelope confirmed from a real login capture
// is { api, code, data, message, remark, status } — this module returns the
// raw payload (like users.api.js does) so callers read payload.data directly,
// with the exact shape of that `data` object for each endpoint still unverified
// against a live backend (see institutionHooks.js normalization comments).
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";

const REQUEST_TIMEOUT = 10000;

async function request(path, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusMessage = getStatusErrorMessage(response.status);
    if (statusMessage) throw new Error(statusMessage);
    if (!response.ok)
      throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

export const institutionsApi = {
  // POST /institution/profile/list, body {page, limit} — the main list.
  // No documented server-side search/filter param in the Postman collection,
  // so search/status filtering is done client-side over this page's results
  // (see InstitutionListPage.jsx).
  list: (payload = { page: 1, limit: 10 }) => request(API_ENDPOINTS.INSTITUTIONS.LIST, payload),
  // POST /institution/profile/get_active, body {} — authorized/active records only.
  getActive: () => request(API_ENDPOINTS.INSTITUTIONS.GET_ACTIVE, {}),
  // POST /institution/profile/add, body: full profile shape — creates a pending-add record.
  add: (payload) => request(API_ENDPOINTS.INSTITUTIONS.ADD, payload),
  // POST /institution/profile/edit, body: full profile shape + {id} — creates a pending-edit record.
  edit: (payload) => request(API_ENDPOINTS.INSTITUTIONS.EDIT, payload),
  // POST /institution/profile/auth, body {id} — checker approves a pending add/edit.
  auth: (payload) => request(API_ENDPOINTS.INSTITUTIONS.AUTH, payload),
  // POST /institution/profile/deauth, body {id, description} — checker rejects, with a reason.
  deauth: (payload) => request(API_ENDPOINTS.INSTITUTIONS.DEAUTH, payload),
  // POST /institution/profile/delete, body {id} — creates a pending-delete.
  delete: (payload) => request(API_ENDPOINTS.INSTITUTIONS.DELETE, payload),
  // POST /institution/profile/delete_auth, body {id} — checker confirms the delete.
  deleteAuth: (payload) => request(API_ENDPOINTS.INSTITUTIONS.DELETE_AUTH, payload),
  // POST /institution/profile/audit, body {id, page, limit} — audit trail for one record.
  audit: (payload) => request(API_ENDPOINTS.INSTITUTIONS.AUDIT, payload),
};
