import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const REQUEST_TIMEOUT = 10000;
const DEVICE_INFO = {
  device_type: "POS",
  device_id: "98251030780003",
  app_version: "1.0.0",
  device_model: "PAX-A920",
  device_os: "Android",
  device_name: "Store-1-POS",
};

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
        ...apiLanguageHeader(),
      },
      body: JSON.stringify(body),
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

const USER = API_ENDPOINTS.USER_MANAGEMENT.USER;

export const usersApi = {
  list: (payload = { page: 1, limit: 10, search: "", status: 0 }) => request(USER.LIST, payload),
  get: (payload) => request(USER.GET, payload),
  getActive: (payload = {}) => request(USER.GET_ACTIVE, payload),
  audit: (payload) => request(USER.AUDIT, payload),
  pending: (payload = {}) => request(USER.PENDING, payload),
  add: (payload) => request(USER.ADD, payload),
  edit: (payload) => request(USER.EDIT, payload),
  auth: (payload) => request(USER.AUTH, payload),
  deauth: (payload) => request(USER.DEAUTH, payload),
  delete: (payload) => request(USER.DELETE, payload),
  deleteAuth: (payload) => request(USER.DELETE_AUTH, payload),
  deactivate: (payload) => request(USER.DEACTIVATE, payload),
  reactivate: (payload) => request(USER.REACTIVATE, payload),
  getKyc: (payload) => request(API_ENDPOINTS.USER_MANAGEMENT.KYC.GET, payload),
  getActiveInstitutions: (payload = { view: "dropdown" }) =>
    request(API_ENDPOINTS.INSTITUTION.INSTITUTION_PROFILE.GET_ACTIVE, payload),
  // /profile/getall was removed by the backend — reuse /user/profile/list
  // with a large limit instead (same tradeoff as profilesApi.getAll()).
  getAllProfiles: () =>
    request(API_ENDPOINTS.USER_MANAGEMENT.PROFILE.LIST, { page: 1, limit: 500 }),
  getPasswordPolicies: (payload = {}) => request(USER.PASSWORD_POLICY_LIST, payload),
};
