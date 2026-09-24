import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Customer Onboarding (Individual) runtime API — "Customer Onboarding
// (Individual) — Frontend Guide", 2026-09. This drives the actual wizard a
// bank user fills in on a customer's behalf; the sections, fields, options
// and rules all come from the institution's published configuration
// (see Onboarding_Configuration_API.md / OnboardingConfig/*). Nothing here
// is hard-coded — render whatever `wizard.sections` returns.
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
    // getApiErrorMessage shows payload.message (+ data problems), never remark/
    // etc internally — checking payload?.remark first, as this used to,
    // bypassed that priority and always surfaced the backend's internal
    // field-name remark instead of its own user-facing message.
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
export const onboardingRowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

// The customer runtime now follows the same 13-call lifecycle as every
// other entity in the app (Customer_Onboarding_API.md §1): add/edit/get
// instead of the old start/save_section/wizard verbs, plus get_active,
// delete_auth, deactivate, reactivate that didn't exist before. There is
// no backwards-compatibility alias for the old names — they 404 now.
const routes = API_ENDPOINTS.CUSTOMER.INDIVIDUAL;
export const customerOnboardingApi = {
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

export const startOnboarding = async (payload) => first(await customerOnboardingApi.add(payload));
export const loadWizard = async (referenceId) => first(await customerOnboardingApi.get(referenceId));
export const saveSection = async (payload) => first(await customerOnboardingApi.edit(payload));
