import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const ENDPOINTS = API_ENDPOINTS.INSTITUTION.INSTITUTION_LEGAL;
const REQUEST_TIMEOUT = 10000;
async function request(path, body = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Deviceinfo: JSON.stringify(DEVICE_INFO), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...apiLanguageHeader() }, body: JSON.stringify(body), signal: controller.signal });
    const type = response.headers.get("content-type") ?? "";
    const payload = type.includes("application/json") ? await response.json().catch(() => null) : null;
    if (response.status === 401) { clearAuthSession(); window.dispatchEvent(new Event("auth:unauthorized")); throw new Error("Session expired. Please sign in again."); }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(statusError);
    if (!response.ok) throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
    return payload;
  } catch (error) { if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out"); throw error instanceof Error ? error : new Error("Unexpected API error"); } finally { window.clearTimeout(timeout); }
}
export const institutionLegalApi = { add: (p) => request(ENDPOINTS.ADD, p), submit: (p) => request(ENDPOINTS.SUBMIT, p), edit: (p) => request(ENDPOINTS.EDIT, p), auth: (p) => request(ENDPOINTS.AUTH, p), deauth: (p) => request(ENDPOINTS.DEAUTH, p), delete: (p) => request(ENDPOINTS.DELETE, p), deleteAuth: (p) => request(ENDPOINTS.DELETE_AUTH, p), deactivate: (p) => request(ENDPOINTS.DEACTIVATE, p), reactivate: (p) => request(ENDPOINTS.REACTIVATE, p), list: (p = { page: 1, limit: 10 }) => request(ENDPOINTS.LIST, p), getActive: (p = {}) => request(ENDPOINTS.GET_ACTIVE, p), audit: (p) => request(ENDPOINTS.AUDIT, p), pending: (p) => request(ENDPOINTS.PENDING, p) };
