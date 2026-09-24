import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Customer Onboarding (Corporate) runtime API — "Customer Onboarding
// (Corporate) — Frontend Guide", 2026-09. Identical shape to
// customerOnboarding.api.js (individual): same envelope, same maker-checker
// verb set, same conflict/error handling — only the base path and the
// add/options payload shape differ (party type + company type, no
// ownership/sub-type axis, no level_no anywhere since corporate customer
// types have no KYC levels).
async function request(path, body = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (response.headers.get("content-type") ?? "").includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    if (response.status === 409) {
      const error = new Error(getApiErrorMessage(payload, "Someone else updated this onboarding. Reloading the latest version."));
      error.conflict = true;
      throw error;
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(getApiErrorMessage(payload, statusError));
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      throw new Error(getApiErrorMessage(payload, "Request failed"));
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

const first = (response) => (Array.isArray(response?.data) ? response.data[0] : response?.data) ?? null;
export const corpOnboardingRowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

const routes = API_ENDPOINTS.CUSTOMER.CORPORATE;
export const corpCustomerOnboardingApi = {
  options: (payload = {}) => request(routes.OPTIONS, payload),
  add: (payload) => request(routes.ADD, payload),
  edit: (payload) => request(routes.EDIT, payload),
  get: (referenceId) => request(routes.GET, { reference_id: referenceId }),
  submit: (payload) => request(routes.SUBMIT, payload),
  auth: (payload) => request(routes.AUTH, payload),
  deauth: (payload) => request(routes.DEAUTH, payload),
  delete: (payload) => request(routes.DELETE, payload),
  deleteAuth: (payload) => request(routes.DELETE_AUTH, payload),
  deactivate: (payload) => request(routes.DEACTIVATE, payload),
  reactivate: (payload) => request(routes.REACTIVATE, payload),
  list: (payload = { page: 1, limit: 10 }) => request(routes.LIST, payload),
  getActive: (payload = { view: "dropdown" }) => request(routes.GET_ACTIVE, payload),
  pending: (payload) => request(routes.PENDING, payload),
  audit: (payload) => request(routes.AUDIT, payload),
};

export const startCorpOnboarding = async (payload) => first(await corpCustomerOnboardingApi.add(payload));
export const loadCorpWizard = async (referenceId) => first(await corpCustomerOnboardingApi.get(referenceId));
export const saveCorpSection = async (payload) => first(await corpCustomerOnboardingApi.edit(payload));
