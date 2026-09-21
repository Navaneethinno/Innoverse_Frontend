import { API_BASE_URL } from "@/Utils/Constant";
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
      const error = new Error(payload?.remark || "Someone else updated this onboarding. Reloading the latest version.");
      error.conflict = true;
      throw error;
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(payload?.remark || statusError);
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      throw new Error(payload?.remark || getApiErrorMessage(payload, payload?.message || "Request failed"));
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

const first = (response) => (Array.isArray(response?.data) ? response.data[0] : response?.data) ?? null;
export const onboardingRowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

export const customerOnboardingApi = {
  options: (payload = {}) => request("/customer/individual/options", payload),
  start: (payload) => request("/customer/individual/start", payload),
  wizard: (referenceId) => request("/customer/individual/wizard", { reference_id: referenceId }),
  saveSection: (payload) => request("/customer/individual/save_section", payload),
  list: (payload = { page: 1, limit: 10 }) => request("/customer/individual/list", payload),
};

export const startOnboarding = async (payload) => first(await customerOnboardingApi.start(payload));
export const loadWizard = async (referenceId) => first(await customerOnboardingApi.wizard(referenceId));
export const saveSection = async (payload) => first(await customerOnboardingApi.saveSection(payload));
