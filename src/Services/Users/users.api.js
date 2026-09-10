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
const KYC = API_ENDPOINTS.USER_MANAGEMENT.KYC;
const PASSWORD_POLICY = API_ENDPOINTS.USER_MANAGEMENT.PASSWORD_POLICY;

function userPayload(payload = {}) {
  const { user_name, user_pwd, inst_id, password_policy_id, ...rest } = payload;
  return {
    ...rest,
    ...(payload.username == null && user_name != null ? { username: user_name } : {}),
    ...(payload.password_hash == null && user_pwd != null ? { password_hash: user_pwd } : {}),
    ...(payload.inst_profile_id == null && inst_id != null ? { inst_profile_id: inst_id } : {}),
    ...(payload.pwd_policy == null && password_policy_id != null ? { pwd_policy: password_policy_id } : {}),
  };
}

export const usersApi = {
  list: (payload = { page: 1, limit: 10, search: "", status: 0 }) => request(USER.LIST, payload),
  get: (payload) => request(USER.GET, payload),
  getActive: (payload = {}) => request(USER.GET_ACTIVE, payload),
  audit: (payload) => request(USER.AUDIT, payload),
  pending: (payload = {}) => request(USER.PENDING, payload),
  add: (payload) => request(USER.ADD, userPayload(payload)),
  edit: (payload) => request(USER.EDIT, userPayload(payload)),
  submit: (payload) => request(USER.SUBMIT, payload),
  auth: (payload) => request(USER.AUTH, payload),
  deauth: (payload) => request(USER.DEAUTH, payload),
  delete: (payload) => request(USER.DELETE, payload),
  deleteAuth: (payload) => request(USER.DELETE_AUTH, payload),
  deactivate: (payload) => request(USER.DEACTIVATE, payload),
  reactivate: (payload) => request(USER.REACTIVATE, payload),
  getKyc: (payload) => request(KYC.GET, payload),
  kycList: (payload = { page: 1, limit: 10 }) => request(KYC.LIST, payload),
  kycGet: (payload) => request(KYC.GET, payload),
  kycGetActive: (payload = {}) => request(KYC.GET_ACTIVE, payload),
  kycAdd: (payload) => request(KYC.ADD, payload),
  kycSubmit: (payload) => request(KYC.SUBMIT ?? "/user/kyc/submit", payload),
  kycEdit: (payload) => request(KYC.EDIT, payload),
  kycAuth: (payload) => request(KYC.AUTH, payload),
  kycDeauth: (payload) => request(KYC.DEAUTH, payload),
  kycDelete: (payload) => request(KYC.DELETE, payload),
  kycDeleteAuth: (payload) => request(KYC.DELETE_AUTH, payload),
  kycDeactivate: (payload) => request(KYC.DEACTIVATE, payload),
  kycReactivate: (payload) => request(KYC.REACTIVATE, payload),
  kycAudit: (payload) => request(KYC.AUDIT, payload),
  kycPending: (payload) => request(KYC.PENDING, payload),
  getActiveInstitutions: (payload = { view: "dropdown" }) =>
    request(API_ENDPOINTS.INSTITUTION.INSTITUTION_PROFILE.GET_ACTIVE, payload),
  // /profile/getall was removed by the backend — reuse /user/profile/list
  // with a large limit instead (same tradeoff as profilesApi.getAll()).
  getAllProfiles: () =>
    request(API_ENDPOINTS.USER_MANAGEMENT.PROFILE.LIST, { page: 1, limit: 500 }),
  getPasswordPolicies: (payload = {}) => request(USER.PASSWORD_POLICY_LIST, payload),
  passwordPolicyList: (payload = { page: 1, limit: 10 }) => request(PASSWORD_POLICY.LIST, payload),
  passwordPolicyGet: (payload) => request(PASSWORD_POLICY.GET, payload),
  passwordPolicyGetActive: (payload = {}) => request(PASSWORD_POLICY.GET_ACTIVE, payload),
  passwordPolicyAdd: (payload) => request(PASSWORD_POLICY.ADD, payload),
  passwordPolicySubmit: (payload) => request(PASSWORD_POLICY.SUBMIT, payload),
  passwordPolicyEdit: (payload) => request(PASSWORD_POLICY.EDIT, payload),
  passwordPolicyAuth: (payload) => request(PASSWORD_POLICY.AUTH, payload),
  passwordPolicyDeauth: (payload) => request(PASSWORD_POLICY.DEAUTH, payload),
  passwordPolicyDelete: (payload) => request(PASSWORD_POLICY.DELETE, payload),
  passwordPolicyDeleteAuth: (payload) => request(PASSWORD_POLICY.DELETE_AUTH, payload),
  passwordPolicyDeactivate: (payload) => request(PASSWORD_POLICY.DEACTIVATE, payload),
  passwordPolicyReactivate: (payload) => request(PASSWORD_POLICY.REACTIVATE, payload),
  passwordPolicyAudit: (payload) => request(PASSWORD_POLICY.AUDIT, payload),
  passwordPolicyPending: (payload) => request(PASSWORD_POLICY.PENDING, payload),
};
