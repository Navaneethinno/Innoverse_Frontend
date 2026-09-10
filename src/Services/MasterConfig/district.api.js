import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

async function request(path, body = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Deviceinfo: JSON.stringify(DEVICE_INFO), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...apiLanguageHeader() },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const payload = (response.headers.get("content-type") ?? "").includes("application/json") ? await response.json().catch(() => null) : null;
    if (response.status === 401) { clearAuthSession(); window.dispatchEvent(new Event("auth:unauthorized")); throw new Error("Session expired. Please sign in again."); }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(statusError);
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") throw new Error(getApiErrorMessage(payload, payload?.remark || "Request failed"));
    return payload;
  } finally { window.clearTimeout(timeout); }
}

const DISTRICT = API_ENDPOINTS.MASTER_CONFIG.DISTRICT;
const PROVINCE = API_ENDPOINTS.MASTER_CONFIG.PROVINCE;
const VILLAGE = API_ENDPOINTS.MASTER_CONFIG.VILLAGE;
const ACCOUNT_PURPOSE = API_ENDPOINTS.MASTER_CONFIG.ACCOUNT_PURPOSE;
const CATEGORY = API_ENDPOINTS.MASTER_CONFIG.CATEGORY;
const CITIZENSHIP = API_ENDPOINTS.MASTER_CONFIG.CITIZENSHIP;
const DESIGNATION = API_ENDPOINTS.MASTER_CONFIG.DESIGNATION;
const DISABILITY = API_ENDPOINTS.MASTER_CONFIG.DISABILITY;
const EMPLOYMENT = API_ENDPOINTS.MASTER_CONFIG.EMPLOYMENT;
const OCCUPATION = API_ENDPOINTS.MASTER_CONFIG.OCCUPATION;
const QUALIFICATION = API_ENDPOINTS.MASTER_CONFIG.QUALIFICATION;
const RELIGION = API_ENDPOINTS.MASTER_CONFIG.RELIGION;
const TURNOVER = API_ENDPOINTS.MASTER_CONFIG.TURNOVER;
const lifecycleApi = (endpoints) => ({
  add: (payload) => request(endpoints.ADD, payload), submit: (payload) => request(endpoints.SUBMIT, payload),
  list: (payload = { page: 1, limit: 10 }) => request(endpoints.LIST, payload), getActive: () => request(endpoints.GET_ACTIVE),
  audit: (payload) => request(endpoints.AUDIT, payload), auth: (payload) => request(endpoints.AUTH, payload),
  deauth: (payload) => request(endpoints.DEAUTH, payload), edit: (payload) => request(endpoints.EDIT, payload),
  delete: (payload) => request(endpoints.DELETE, payload), deleteAuth: (payload) => request(endpoints.DELETE_AUTH, payload),
});
export const districtApi = {
  add: (payload) => request(DISTRICT.ADD, payload), submit: (payload) => request(DISTRICT.SUBMIT, payload),
  list: (payload = { page: 1, limit: 10 }) => request(DISTRICT.LIST, payload), getActive: () => request(DISTRICT.GET_ACTIVE),
  audit: (payload) => request(DISTRICT.AUDIT, payload), auth: (payload) => request(DISTRICT.AUTH, payload),
  deauth: (payload) => request(DISTRICT.DEAUTH, payload), edit: (payload) => request(DISTRICT.EDIT, payload),
  delete: (payload) => request(DISTRICT.DELETE, payload), deleteAuth: (payload) => request(DISTRICT.DELETE_AUTH, payload),
  activeProvinces: () => request(PROVINCE.GET_ACTIVE),
};
export const provinceApi = {
  add: (payload) => request(PROVINCE.ADD, payload), submit: (payload) => request(PROVINCE.SUBMIT, payload),
  list: (payload = { page: 1, limit: 10 }) => request(PROVINCE.LIST, payload), getActive: () => request(PROVINCE.GET_ACTIVE),
  audit: (payload) => request(PROVINCE.AUDIT, payload), auth: (payload) => request(PROVINCE.AUTH, payload),
  deauth: (payload) => request(PROVINCE.DEAUTH, payload), edit: (payload) => request(PROVINCE.EDIT, payload),
  delete: (payload) => request(PROVINCE.DELETE, payload), deleteAuth: (payload) => request(PROVINCE.DELETE_AUTH, payload),
};
export const villageApi = {
  add: (payload) => request(VILLAGE.ADD, payload), submit: (payload) => request(VILLAGE.SUBMIT, payload),
  list: (payload = { page: 1, limit: 10 }) => request(VILLAGE.LIST, payload), getActive: () => request(VILLAGE.GET_ACTIVE),
  audit: (payload) => request(VILLAGE.AUDIT, payload), auth: (payload) => request(VILLAGE.AUTH, payload),
  deauth: (payload) => request(VILLAGE.DEAUTH, payload), edit: (payload) => request(VILLAGE.EDIT, payload),
  delete: (payload) => request(VILLAGE.DELETE, payload), deleteAuth: (payload) => request(VILLAGE.DELETE_AUTH, payload),
};
export const accountPurposeApi = lifecycleApi(ACCOUNT_PURPOSE);
export const categoryApi = lifecycleApi(CATEGORY);
export const citizenshipApi = lifecycleApi(CITIZENSHIP);
export const designationApi = lifecycleApi(DESIGNATION);
export const disabilityApi = lifecycleApi(DISABILITY);
export const employmentApi = lifecycleApi(EMPLOYMENT);
export const occupationApi = lifecycleApi(OCCUPATION);
export const qualificationApi = lifecycleApi(QUALIFICATION);
export const religionApi = lifecycleApi(RELIGION);
export const turnoverApi = lifecycleApi(TURNOVER);
