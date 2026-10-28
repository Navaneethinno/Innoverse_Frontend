import { scopedBody } from "@/Utils/Lib/institutionScope";
import { authFetch } from "@/Services/api/authFetch";
import { scopedPath } from "@/Utils/Lib/apiScope";
import { API_BASE_URL } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getApiProblemKeys, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Customer Onboarding Configuration API (Frontend Guide, 2026-09): masters,
// KYC scheme (/config/kyc/group) and the customer-type definition
// wizard (/master_config/onboarding_*). Every call is a POST with a JSON body
// and the standard {status, message, remark, data[]} envelope; a failure
// throws an Error built by getApiErrorMessage (`message` + `problems`,
// never `remark` — see apiErrors.js).
// The signed POST every admin call makes (headers, scope, session renewal).
function post(path, body, signal) {
  const token = getAccessToken();
  return authFetch(`${API_BASE_URL}${scopedPath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Deviceinfo: JSON.stringify(DEVICE_INFO),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...apiLanguageHeader(),
    },
    body: JSON.stringify(scopedBody(body)),
    signal,
  });
}

// A call that answers with server-sent events (text/event-stream): each
// event goes to onEvent(kind, data, id) as it arrives; ": ping" lines are
// skipped. Resolves when the server closes the stream. A refusal comes back
// as ordinary JSON and is thrown like any other.
export async function requestStream(path, body, onEvent, signal) {
  const response = await post(path, body, signal);
  if (!(response.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new Error(getApiErrorMessage(payload, getStatusErrorMessage(response.status, payload) || "Request failed"));
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value.replace(/\r\n/g, "\n");
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let id, kind;
      const data = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("id:")) id = Number(line.slice(3).trim());
        else if (line.startsWith("event:")) kind = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (kind) onEvent(kind, data.length ? JSON.parse(data.join("\n")) : null, id);
    }
  }
}

export async function request(path, body = {}) {
  const controller = new AbortController();
  // save_config carries a whole configuration tree — allow more than the 10s
  // the small master calls use.
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await post(path, body, controller.signal);
    const payload = (response.headers.get("content-type") ?? "").includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusError = getStatusErrorMessage(response.status, payload);
    // getApiErrorMessage shows payload.message (+ data problems), never remark/
    // etc internally — checking payload?.remark first, as this used to,
    // bypassed that priority and always surfaced the backend's internal
    // field-name remark ("field 'max_value' must be...") in the toast
    // instead of its own user-facing message ("Maximum Value Must Be...").
    // `code`: the reply's error_code, for screens that branch on it.
    if (statusError) throw Object.assign(new Error(getApiErrorMessage(payload, statusError)), { code: payload?.error_code, status: response.status, data: Array.isArray(payload?.data) ? payload.data[0] : payload?.data });
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      // problemKeys: where each problem is, for wizards to open that step.
      // data: the reply's first data row (e.g. the texts a submit found untranslated).
      throw Object.assign(new Error(getApiErrorMessage(payload, "Request failed")), { problemKeys: getApiProblemKeys(payload), code: payload?.error_code, status: response.status, data: Array.isArray(payload?.data) ? payload.data[0] : payload?.data });
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

// Form builder (Admin portal handoff: onboarding form builder): the
// institution's own field library and sections. Plain create / edit /
// delete, no maker-checker: they are approved as part of the definition
// that uses them. The /customer prefix becomes /merchant on MMS pages
// (apiScope).
function createBuilderApi(base) {
  const call = (verb) => (payload = {}) => request(`${base}/${verb}`, payload);
  return { listPath: `${base}/list`, add: call("add"), edit: call("edit"), get: call("get"), list: call("list"), delete: call("delete"), types: call("types") };
}
export const formFieldApi = createBuilderApi("/customer/master_config/form_field");
export const formSectionApi = createBuilderApi("/customer/master_config/form_section");

// Onboarding texts in the institution's other languages (Form Builder's
// View / Edit). English is the base text; no maker-checker: a change
// applies at once. /customer becomes /merchant on MMS pages.
const translationCall = (path) => (payload = {}) => request(`/customer/master_config/${path}`, payload);
export const translationApi = {
  languages: translationCall("translations/languages"),
  missing: translationCall("translations/missing"),
  exportCsv: translationCall("translations/export"),
  importCsv: translationCall("translations/import"),
  sources: translationCall("list_translation/sources"),
  listGet: translationCall("list_translation/get"),
  listEdit: translationCall("list_translation/edit"),
};

export const onboardingDefinitionApi = { ...createLifecycle("/customer/master_config/indv_onboarding_definition") };
export const kycSchemeApi = createLifecycle("/config/kyc/group");

// The definition holds a `form` (ordered sections, rules, uses) saved by
// save_form while it is Draft or Rejected; `get` returns the form and the
// resolved `snapshot` the customer is asked.
export const onboardingDefinitionOps = {
  get: (payload) => onboardingDefinitionApi.call("get", payload),
  saveForm: (payload) => onboardingDefinitionApi.call("save_form", payload),
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
  ownership_sub_type: createLifecycle("/customer/master_config/ownership_sub_type"),
  document_type: createLifecycle("/customer/master_config/indv_document_type"),
  address_type: createLifecycle("/customer/master_config/indv_address_type"),
  employment: createLifecycle("/customer/master_config/indv_employment"),
  relationship_type: createLifecycle("/customer/master_config/indv_relationship_type"),
  source_of_fund: createLifecycle("/customer/master_config/indv_source_of_fund"),
  validation_rule: createLifecycle("/customer/master_config/validation_rule"),
  verification_method: createLifecycle("/customer/master_config/verification_method"),
};

export async function activeMasterOptions(name) {
  const response = await masterApis[name].list({ page: 1, limit: 200 });
  return rowsOf(response)
    .filter((row) => Number(row.status) === 1)
    .map((row) => ({ id: row.id, code: row.code, name: row.name ?? row.code }));
}

// --- Corporate Onboarding Configuration (Corporate_Onboarding_
// Configuration_API.md, 2026-09) — runs alongside the individual framework
// above with the same conventions (maker-checker verbs, envelope, response
// shape), a separate catalog and definition base, and its own set of
// corp_-prefixed masters. province/district/gender/validation_rule/
// verification_method/verification_status keep their existing (individual/
// shared) routes — not duplicated here.
export const corpOnboardingDefinitionApi = { ...createLifecycle("/customer/master_config/corp_onboarding_definition") };
export const corpOnboardingDefinitionOps = {
  get: (payload) => corpOnboardingDefinitionApi.call("get", payload),
  saveForm: (payload) => corpOnboardingDefinitionApi.call("save_form", payload),
  validate: (payload) => corpOnboardingDefinitionApi.call("validate", payload),
};

export const corpMasterApis = {
  corp_company_type: createLifecycle("/customer/master_config/corp_company_type"),
  corp_address_type: createLifecycle("/customer/master_config/corp_address_type"),
  corp_relationship_type: createLifecycle("/customer/master_config/corp_relationship_type"),
  corp_document_type: createLifecycle("/customer/master_config/corp_document_type"),
  corp_identification_type: createLifecycle("/customer/master_config/corp_identification_type"),
  corp_tax_type: createLifecycle("/customer/master_config/corp_tax_type"),
  corp_screening_type: createLifecycle("/customer/master_config/corp_screening_type"),
  corp_business_nature: createLifecycle("/customer/master_config/corp_business_nature"),
  corp_industry_sector: createLifecycle("/customer/master_config/corp_industry_sector"),
  corp_merchant_category: createLifecycle("/customer/master_config/corp_merchant_category"),
  corp_merchant_group: createLifecycle("/customer/master_config/corp_merchant_group"),
  corp_gst_registration_status: createLifecycle("/customer/master_config/corp_gst_registration_status"),
  corp_tax_exemption_status: createLifecycle("/customer/master_config/corp_tax_exemption_status"),
  bank: createLifecycle("/customer/master_config/bank"),
  bank_branch: createLifecycle("/customer/master_config/bank_branch"),
};

export async function activeCorpMasterOptions(name) {
  const response = await corpMasterApis[name].list({ page: 1, limit: 200 });
  return rowsOf(response)
    .filter((row) => Number(row.status) === 1)
    .map((row) => ({ id: row.id, code: row.code, name: row.name ?? row.code }));
}

// Global Settings > Limit (limit groups): the usual maker-checker verbs plus
// the rules (`config`, replaced whole by save_config), clone, moving
// customers / merchants between groups, and a dry-run `evaluate`.
export const limitGroupApi = createLifecycle("/config/global/limit");
export const limitGroupOps = {
  get: (payload) => limitGroupApi.call("get", payload),
  saveConfig: (payload) => limitGroupApi.call("save_config", payload),
  validate: (payload) => limitGroupApi.call("validate", payload),
  clone: (payload) => limitGroupApi.call("clone", payload),
  assign: (payload) => limitGroupApi.call("assign", payload),
  members: (payload) => limitGroupApi.call("members", payload),
  evaluate: (payload) => limitGroupApi.call("evaluate", payload),
  // A party's limits with what is used and left: { reference_id } or
  // { entity_type, entity_id }, currency_code?.
  usage: (payload) => limitGroupApi.call("usage", payload),
};

// Platform lists the limit screens pick from (no menu permission needed).
export const masterRows = (path) => request(path, {}).then(rowsOf);
