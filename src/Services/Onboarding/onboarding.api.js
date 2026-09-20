import { API_BASE_URL } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Customer Onboarding Configuration API (Frontend Guide, 2026-09): masters,
// KYC scheme (/config/kyc/group) and the customer-type definition/version
// wizard (/master_config/onboarding_*). Every call is a POST with a JSON body
// and the standard {status, message, remark, data[]} envelope; a failure
// throws an Error whose message prefers the specific `remark`.
async function request(path, body = {}) {
  const controller = new AbortController();
  // save_config carries a whole configuration tree — allow more than the 10s
  // the small master calls use.
  const timeout = window.setTimeout(() => controller.abort(), 30000);
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

export const rowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

// The maker-checker verbs shared by every master, KYC scheme and onboarding
// version (guide §4.2).
function lifecycleApi(base) {
  const call = (verb) => (payload = {}) => request(`${base}/${verb}`, payload);
  return {
    base,
    listPath: `${base}/list`,
    add: call("add"),
    edit: call("edit"),
    submit: call("submit"),
    auth: call("auth"),
    deauth: (payload = {}) => request(`${base}/deauth`, { ...payload, narration: payload.narration ?? "" }),
    delete: call("delete"),
    deleteAuth: call("delete_auth"),
    deactivate: call("deactivate"),
    reactivate: call("reactivate"),
    list: (payload = { page: 1, limit: 10 }) => request(`${base}/list`, payload),
    // `view` is required by the backend for dropdown lists.
    getActive: (payload = { view: "dropdown" }) => request(`${base}/get_active`, payload),
    pending: call("pending"),
    audit: call("audit"),
    call: (verb, payload = {}) => request(`${base}/${verb}`, payload),
  };
}

export const onboardingCatalog = () => request("/master_config/onboarding_catalog", {});

export const onboardingDefinitionApi = { ...lifecycleApi("/master_config/onboarding_definition") };
export const onboardingVersionApi = lifecycleApi("/master_config/onboarding_version");
export const kycSchemeApi = lifecycleApi("/config/kyc/group");

// A customer type's `config` (sections/fields/documents/...) is edited as one
// object and replaced whole by save_config (guide §8.11).
export const onboardingVersionOps = {
  newVersion: (payload) => onboardingVersionApi.call("new_version", payload),
  get: (payload) => onboardingVersionApi.call("get", payload),
  saveConfig: (payload) => onboardingVersionApi.call("save_config", payload),
  validate: (payload) => onboardingVersionApi.call("validate", payload),
};
export const onboardingDefinitionOps = {
  get: (payload) => onboardingDefinitionApi.call("get", payload),
};
export const kycSchemeOps = {
  get: (payload) => kycSchemeApi.call("get", payload),
  saveConfig: (payload) => kycSchemeApi.call("save_config", payload),
  validate: (payload) => kycSchemeApi.call("validate", payload),
  clone: (payload) => kycSchemeApi.call("clone", payload),
};

// Institution masters the wizard refers to BY CODE (guide §8). `get_active`
// with view=dropdown only returns {id, name}, so pickers that must send a
// code read the plain list instead and keep Active rows.
export const masterApis = {
  ownership_sub_type: lifecycleApi("/master_config/ownership_sub_type"),
  document_type: lifecycleApi("/master_config/document_type"),
  address_type: lifecycleApi("/master_config/address_type"),
  employment: lifecycleApi("/master_config/employment"),
  relationship_type: lifecycleApi("/master_config/relationship_type"),
  source_of_fund: lifecycleApi("/master_config/source_of_fund"),
  validation_rule: lifecycleApi("/master_config/validation_rule"),
  verification_method: lifecycleApi("/master_config/verification_method"),
};

export async function activeMasterOptions(name) {
  const response = await masterApis[name].list({ page: 1, limit: 200 });
  return rowsOf(response)
    .filter((row) => Number(row.status) === 1)
    .map((row) => ({ id: row.id, code: row.code, name: row.name ?? row.code }));
}
