// Institution/Profile endpoints — per the backend's confirmed spec
// (2026-09 "Institution Profile API Requests" doc): list, get_active, add,
// submit, edit, auth, deauth, delete, delete_auth, deactivate, reactivate,
// audit, pending. Sibling sub-entities (Institution Type/Legal/Branding/
// Channel/Currency/Module) are out of scope and are NOT implemented here.
//
// All maker-checker action calls (auth/deauth/delete/delete_auth/deactivate/
// reactivate/submit) take {id, narration} — narration is required only for
// deauth (a rejection must record a reason), optional elsewhere.
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

const INSTITUTION_PROFILE = API_ENDPOINTS.INSTITUTION.INSTITUTION_PROFILE;

export const institutionsApi = {
  // POST /institution/profile/list, body {page, limit} — the main list.
  // No documented server-side search/filter param in the Postman collection,
  // so search/status filtering is done client-side over this page's results
  // (see InstitutionProfile.jsx).
  list: (payload = { page: 1, limit: 10 }) => request(INSTITUTION_PROFILE.LIST, payload),
  // POST /institution/profile/get_active, body {} — authorized/active records only.
  getActive: () => request(INSTITUTION_PROFILE.GET_ACTIVE, {}),
  // POST /institution/profile/add, body: full profile shape + {narration, is_draft}.
  // is_draft:true starts a Draft (no checker yet); omitted/false submits
  // immediately to Pending Add in this one call (confirmed 2026-09 spec).
  add: (payload) => request(INSTITUTION_PROFILE.ADD, payload),
  // POST /institution/profile/submit, body {id, narration} — maker submits
  // their own Draft (Draft -> Pending Add) or Draft Edit (Draft -> Pending
  // Edit). Only the draft's own maker may call this.
  submit: (payload) => request(INSTITUTION_PROFILE.SUBMIT, payload),
  // POST /institution/profile/edit, body: full profile shape + {id, narration,
  // is_draft, expected_updated_time}. Behavior depends on the record's
  // current state (Draft/Active/Rejected) — see the confirmed 2026-09 spec:
  // editing a Draft applies immediately with no checker; editing Active/
  // Rejected Edit with is_draft:true stages a Draft Edit instead of
  // Pending Edit. expected_updated_time is an optional stale-write guard
  // (409 if it no longer matches the live record).
  edit: (payload) => request(INSTITUTION_PROFILE.EDIT, payload),
  // POST /institution/profile/auth, body {id, narration} — checker approves
  // whatever is currently pending (add/edit/deactivate/reactivate).
  auth: (payload) => request(INSTITUTION_PROFILE.AUTH, payload),
  // POST /institution/profile/deauth, body {id, narration} — checker rejects
  // whatever is currently pending; narration is required (a rejection must
  // always record a reason).
  deauth: (payload) => request(INSTITUTION_PROFILE.DEAUTH, payload),
  // POST /institution/profile/delete, body {id, narration} — creates a pending-delete.
  delete: (payload) => request(INSTITUTION_PROFILE.DELETE, payload),
  // POST /institution/profile/delete_auth, body {id, narration} — checker confirms the delete.
  deleteAuth: (payload) => request(INSTITUTION_PROFILE.DELETE_AUTH, payload),
  // POST /institution/profile/audit, body {id, page, limit} — audit trail for one record.
  audit: (payload) => request(INSTITUTION_PROFILE.AUDIT, payload),
  pending: (payload = {}) => request(INSTITUTION_PROFILE.PENDING, payload),
  // POST /institution/profile/deactivate, body {id, narration} — maker
  // requests deactivation of an Active record.
  deactivate: (payload) => request(INSTITUTION_PROFILE.DEACTIVATE, payload),
  // POST /institution/profile/reactivate, body {id, narration} — maker
  // requests reactivation of an Inactive record.
  reactivate: (payload) => request(INSTITUTION_PROFILE.REACTIVATE, payload),
};
