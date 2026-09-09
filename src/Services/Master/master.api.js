// Master (Reference Data) endpoints — per the official Postman collection
// ("InnoVerse_ConfigProcessor"), these live under the "Master (Reference
// Data)" folder and are distinct from the Institution/Module CONFIGURATION
// endpoints (/institution/module/list, /institution/module/get_active).
//
// All 22 /master/*/list endpoints confirmed in the collection are exposed
// below. Only moduleList/institutionTypeList/languageList have a live
// consumer today (the sidebar's module catalogue, per payseFrontend's
// Sidebar/useFetchModuleData.jsx equivalent, which likewise does not call
// menu/menu_action/action for navigation — that hierarchy comes entirely
// from the login response's data.menu_array). The rest are wired up as
// plain service calls for future features (Config - Acct forms, etc.) to
// consume without adding more plumbing later.
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// The real Innoverse backend wraps responses as { code, message, data },
// matching what src/Services/Auth/auth.service.js observes in practice
// (payload.data.user_session_info etc.) — NOT the { success, data } shape
// src/Services/api/response.js's unwrapApiResponse assumes. That helper is
// only exercised today by services gated behind NON_LOGIN_APIS_ENABLED
// (disabled), so it has never been validated against a live response. Master
// endpoints are live for this phase, so we extract `.data` directly instead.
function extractData(payload, fallback) {
  if (payload !== null && typeof payload === "object" && "data" in payload) {
    return payload.data ?? fallback;
  }
  return payload ?? fallback;
}

const REQUEST_TIMEOUT = 10000;

async function masterPost(path, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(API_BASE_URL + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusMessage = getStatusErrorMessage(response.status);
    if (statusMessage) throw new Error(statusMessage);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Request failed with status " + response.status));
    }
    return extractData(payload, []);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

// Generic unwrapper for every /master/<resource>/list response. The exact
// wrapper key isn't confirmed per-resource beyond module/institution_type/
// language (the only three actually exercised live so far) — rather than
// hardcoding a guessed key per new resource, this tries the plain array
// first, then the two naming conventions already observed in real responses
// (`<resource>_list` / `<resource>_array`), then the generic `list` key.
function toArray(data, resource) {
  if (Array.isArray(data)) return data;
  if (resource) {
    if (Array.isArray(data?.[`${resource}_list`])) return data[`${resource}_list`];
    if (Array.isArray(data?.[`${resource}_array`])) return data[`${resource}_array`];
  }
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

// Confirmed against a real /master/module/list response: each record is
// { id, name, status } — NOT { module_id, module_name } like menu_array's
// own module_id field. Normalized here, at the API boundary, so every other
// consumer (DynamicSidebar's allowedModuleIds match, ModuleDropdown) can
// keep comparing against a single `module_id`/`module_name` shape regardless
// of which endpoint the data came from.
function normalizeModule(raw) {
  return {
    module_id: raw?.module_id ?? raw?.id,
    module_name: raw?.module_name ?? raw?.name,
    status: raw?.status,
  };
}

export const masterApi = {
  // POST /master/module/list, body {} — the official generic module
  // reference-data source (NOT /institution/module/list or
  // /institution/module/get_active, which configure per-institution module
  // activation and are out of scope for the sidebar's module catalogue).
  moduleList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.MODULE_LIST, {}), "module").map(normalizeModule),
  institutionTypeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.INSTITUTION_TYPE_LIST, {}), "institution_type"),
  languageList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.LANGUAGE_LIST, {}), "language"),

  // The remaining /master/*/list endpoints confirmed in the Postman
  // collection but with no consumer in the app yet — exposed here so a
  // future feature (e.g. Config - Acct forms) can call them without adding
  // more service-layer plumbing first.
  actionList: async () => toArray(await masterPost(API_ENDPOINTS.MASTER.ACTION_LIST, {}), "action"),
  statusList: async () => toArray(await masterPost(API_ENDPOINTS.MASTER.STATUS_LIST, {}), "status"),
  menuList: async () => toArray(await masterPost(API_ENDPOINTS.MASTER.MENU_LIST, {}), "menu"),
  menuActionList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.MENU_ACTION_LIST, {}), "menu_action"),
  channelList: async () => toArray(await masterPost(API_ENDPOINTS.MASTER.CHANNEL_LIST, {}), "channel"),
  acctProdTypeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.ACCT_PROD_TYPE_LIST, {}), "acct_prod_type"),
  acctOperationModeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.ACCT_OPERATION_MODE_LIST, {}), "acct_operation_mode"),
  acctDormancyActionList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.ACCT_DORMANCY_ACTION_LIST, {}), "acct_dormancy_action"),
  acctSequenceList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.ACCT_SEQUENCE_LIST, {}), "acct_sequence"),
  transactionList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.TRANSACTION_LIST, {}), "transaction"),
  frequencyList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.FREQUENCY_LIST, {}), "frequency"),
  kycProcessList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.KYC_PROCESS_LIST, {}), "kyc_process"),
  kycDataFieldList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.KYC_DATA_FIELD_LIST, {}), "kyc_data_field"),
  kycDocumentTypeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.KYC_DOCUMENT_TYPE_LIST, {}), "kyc_document_type"),
  partyTypeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.PARTY_TYPE_LIST, {}), "party_type"),
  ownershipList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.OWNERSHIP_LIST, {}), "ownership"),
  residencyTypeList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.RESIDENCY_TYPE_LIST, {}), "residency_type"),
  countryList: async () => toArray(await masterPost(API_ENDPOINTS.MASTER.COUNTRY_LIST, {}), "country"),
  currencyList: async () =>
    toArray(await masterPost(API_ENDPOINTS.MASTER.CURRENCY_LIST, {}), "currency"),
};
