// Profile (URMG) endpoints — per the official Postman collection
// ("InnoVerse_ConfigProcessor" -> "Profile (URMG)"). "Profile" here means a
// role/permission profile (a named set of menu_id/action_id grants), NOT
// src/Services/Institutions/institutions.api.js's Institution Profile entity.
//
// Follows the exact same request convention as institutions.api.js /
// users.api.js: a plain POST fetch with Content-Type/Deviceinfo/Authorization
// headers, an AbortController timeout, and 401 handling — replacing this
// file's previous NON_LOGIN_APIS_ENABLED / unwrapApiResponse-based fictional
// implementation entirely. The response envelope is assumed to be
// { api, code, data, message, pagination, remark, status } (pagination at
// the TOP level), matching every other confirmed-live endpoint in this
// codebase; this module returns the raw payload so callers read
// payload.data / payload.pagination directly, same as institutions.api.js.
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

export const profilesApi = {
  // POST /profile/list, body {page, limit} — the main list, all profiles
  // regardless of auth_status (same maker-checker convention as
  // institutions: a checker needs to see pending records too).
  list: (payload = { page: 1, limit: 10 }) => request(API_ENDPOINTS.PROFILES.LIST, payload),
  // POST /profile/getall, body {} — lightweight, unpaginated list used for
  // pickers. Already called elsewhere as usersApi.getAllProfiles() against
  // this same path (API_ENDPOINTS.USERS.ALL_PROFILES) for the user-form
  // profile dropdown; exposed here too under its natural home so
  // Profile-owned screens don't reach into the Users service for it.
  getAll: () => request(API_ENDPOINTS.PROFILES.GET_ALL, {}),
  // POST /profile/get, body {profile_id} — get one profile by id. Profile
  // has a real get-by-id endpoint (unlike Institution, which has none), so
  // detail/edit screens use this directly instead of scanning a list page.
  get: (payload) => request(API_ENDPOINTS.PROFILES.GET, payload),
  // POST /profile/add, body {profile_info: {profile_id: 0, profile_name,
  // inst_profile_id}, menu_info: [{menu_id, actions: [action_id...],
  // is_configuration_only}]} — creates a pending-add.
  add: (payload) => request(API_ENDPOINTS.PROFILES.ADD, payload),
  // POST /profile/edit — same shape as add, profile_info.profile_id is the
  // real id being edited; creates a pending-edit.
  edit: (payload) => request(API_ENDPOINTS.PROFILES.EDIT, payload),
  // POST /profile/auth, body {profile_id, inst_profile_id, menu_id,
  // action_id}. Unlike institutionsApi.auth ({id} approves the whole
  // record), this endpoint's contract is per menu+action grant. Per payse's
  // own AuthProfile.jsx (the reference UI), the checker screen calls this
  // ONCE per pending record using the CURRENT admin session's own Profiles
  // menu context (menu_id = the checker's own "Profiles" sidebar menu item,
  // action_id = the fixed "Authorize" action id, 5) — NOT once per grant
  // inside the profile being approved. Callers here pass menu_id/action_id
  // explicitly so this stays a literal pass-through of the endpoint
  // contract; see useProfileAuthMutation in profileHooks.js for how the
  // checker-context ids are supplied.
  auth: (payload) => request(API_ENDPOINTS.PROFILES.AUTH, payload),
  // POST /profile/deauth, body {profile_id, inst_profile_id, menu_id,
  // action_id, deauth_narration} — same per-call shape as auth, with a
  // required reason. payse's AuthProfile.jsx calls this with the fixed
  // "Deauthorize" action id (4).
  deauth: (payload) => request(API_ENDPOINTS.PROFILES.DEAUTH, payload),
  // POST /profile/delete, body {profile_id, inst_profile_id, del_narration}
  // — creates a pending-delete.
  delete: (payload) => request(API_ENDPOINTS.PROFILES.DELETE, payload),
  // POST /profile/delete_auth, body {profile_id, inst_profile_id} — checker
  // confirms the delete.
  deleteAuth: (payload) => request(API_ENDPOINTS.PROFILES.DELETE_AUTH, payload),
  // POST /profile/audit_list, body {profile_id, page, limit} — audit trail
  // for one profile, matching the pattern already built for Institutions.
  audit: (payload) => request(API_ENDPOINTS.PROFILES.AUDIT_LIST, payload),
};
