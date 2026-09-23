import { API_BASE_URL } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Customer Onboarding Configuration API (Frontend Guide, 2026-09): masters,
// KYC scheme (/config/kyc/group) and the customer-type definition
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
    // getApiErrorMessage already prefers payload.message over remark/error/
    // etc internally — checking payload?.remark first, as this used to,
    // bypassed that priority and always surfaced the backend's internal
    // field-name remark ("field 'max_value' must be...") in the toast
    // instead of its own user-facing message ("Maximum Value Must Be...").
    if (statusError) throw new Error(getApiErrorMessage(payload, statusError));
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      throw new Error(getApiErrorMessage(payload, "Request failed"));
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const rowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

// The maker-checker verbs shared by every master, KYC scheme and onboarding
// version (guide §4.2).
export function createLifecycle(base) {
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

// Individual-customer masters and onboarding config moved to /indv_* base
// paths (2026-09) — the old /master_config/onboarding_* routes now 404.
// Request/response bodies, field names and the maker-checker verb set are
// unchanged; only the path segment changed.
export const onboardingCatalog = () => request("/master_config/indv_onboarding_catalog", {});

export const onboardingDefinitionApi = { ...createLifecycle("/master_config/indv_onboarding_definition") };
export const kycSchemeApi = createLifecycle("/config/kyc/group");

// The definition itself IS the whole customer-type configuration now — no
// more separate "version" entity (Onboarding_Configuration_API.md §8.1).
// `config` (sections/fields/documents/...) is edited as one object and
// replaced whole by save_config (§8.11), directly on the definition's own
// id, while it is Draft or Rejected Add.
export const onboardingDefinitionOps = {
  get: (payload) => onboardingDefinitionApi.call("get", payload),
  saveConfig: (payload) => onboardingDefinitionApi.call("save_config", payload),
  validate: (payload) => onboardingDefinitionApi.call("validate", payload),
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
// ownership_sub_type/validation_rule/verification_method are shared masters
// that kept their old routes; the rest moved under indv_ (2026-09 route
// change — see onboardingCatalog/onboardingDefinitionApi above).
export const masterApis = {
  ownership_sub_type: createLifecycle("/master_config/ownership_sub_type"),
  document_type: createLifecycle("/master_config/indv_document_type"),
  address_type: createLifecycle("/master_config/indv_address_type"),
  employment: createLifecycle("/master_config/indv_employment"),
  relationship_type: createLifecycle("/master_config/indv_relationship_type"),
  source_of_fund: createLifecycle("/master_config/indv_source_of_fund"),
  validation_rule: createLifecycle("/master_config/validation_rule"),
  verification_method: createLifecycle("/master_config/verification_method"),
};

export async function activeMasterOptions(name) {
  const response = await masterApis[name].list({ page: 1, limit: 200 });
  return rowsOf(response)
    .filter((row) => Number(row.status) === 1)
    .map((row) => ({ id: row.id, code: row.code, name: row.name ?? row.code }));
}
