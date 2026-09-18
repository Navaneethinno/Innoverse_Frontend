import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const REQUEST_TIMEOUT = 10000;

async function request(path, body = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Deviceinfo: JSON.stringify(DEVICE_INFO), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...apiLanguageHeader() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const type = response.headers.get("content-type") ?? "";
    const payload = type.includes("application/json") ? await response.json().catch(() => null) : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(statusError);
    if (!response.ok) throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
    if (String(payload?.status).toLowerCase() === "fail") throw new Error(getApiErrorMessage(payload, "Request failed"));
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

// indv_profile — the composite maker-checker root (13 routes, same shape
// as digitalProductApi("product")): sections are merged into `add`/`edit`
// rather than each having their own endpoint. Every path comes from
// API_ENDPOINTS.CUSTOMER.INDV_PROFILE (Constant.jsx) — nothing built from a
// template string at request time.
const PROFILE_METHOD_TO_KEY = {
  add: "ADD", submit: "SUBMIT", edit: "EDIT", get: "GET", auth: "AUTH", deauth: "DEAUTH", delete: "DELETE", deleteAuth: "DELETE_AUTH",
  list: "LIST", getActive: "GET_ACTIVE", audit: "AUDIT", pending: "PENDING", deactivate: "DEACTIVATE", reactivate: "REACTIVATE",
};
export const indvProfileApi = () => ({
  ...Object.fromEntries(
    Object.entries(PROFILE_METHOD_TO_KEY).map(([method, key]) => [
      method,
      (p = method === "list" ? { page: 1, limit: 10 } : method === "getActive" ? { view: "dropdown" } : undefined) => {
        const path = API_ENDPOINTS.CUSTOMER.INDV_PROFILE[key];
        if (!path) throw new Error(`No API_ENDPOINTS.CUSTOMER.INDV_PROFILE.${key} defined`);
        return request(path, p);
      },
    ]),
  ),
  // Fetches the whole self-onboarding wizard's shape (ownership sub types,
  // identification/address types, employment statuses, document
  // requirements/types) for this institution in one call — see
  // customerWizardConfig.js for the hook that consumes this.
  wizardConfig: (p) => {
    const path = API_ENDPOINTS.CUSTOMER.INDV_PROFILE.WIZARD_CONFIG;
    if (!path) throw new Error("No API_ENDPOINTS.CUSTOMER.INDV_PROFILE.WIZARD_CONFIG defined");
    return request(path, p);
  },
});

// indv_onboarding — the separate pre-profile self-serve lookup (no
// maker-checker: no add/edit/submit/auth/deauth/audit/pending, just these
// 5 plain routes).
const ONBOARDING_METHOD_TO_KEY = {
  start: "START", resume: "RESUME", updateStep: "UPDATE_STEP", get: "GET", list: "LIST",
};
export const indvOnboardingApi = () =>
  Object.fromEntries(
    Object.entries(ONBOARDING_METHOD_TO_KEY).map(([method, key]) => [
      method,
      (p = method === "list" ? { page: 1, limit: 10 } : undefined) => {
        const path = API_ENDPOINTS.CUSTOMER.INDV_ONBOARDING[key];
        if (!path) throw new Error(`No API_ENDPOINTS.CUSTOMER.INDV_ONBOARDING.${key} defined`);
        return request(path, p);
      },
    ]),
  );
