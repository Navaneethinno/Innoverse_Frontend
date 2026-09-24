import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const REQUEST_TIMEOUT = 10000;
const ENDPOINTS = API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE;

async function request(path, body = {}) {
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
    const type = response.headers.get("content-type") ?? "";
    const payload = type.includes("application/json") ? await response.json().catch(() => null) : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(statusError);
    if (!response.ok) throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

export const institutionModuleApi = {
  add: (payload) => request(ENDPOINTS.ADD, payload),
  submit: (payload) => request(ENDPOINTS.SUBMIT, payload),
  edit: (payload) => request(ENDPOINTS.EDIT, payload),
  auth: (payload) => request(ENDPOINTS.AUTH, payload),
  deauth: (payload) => request(ENDPOINTS.DEAUTH, payload),
  delete: (payload) => request(ENDPOINTS.DELETE, payload),
  deleteAuth: (payload) => request(ENDPOINTS.DELETE_AUTH, payload),
  deactivate: (payload) => request(ENDPOINTS.DEACTIVATE, payload),
  reactivate: (payload) => request(ENDPOINTS.REACTIVATE, payload),
  list: (payload = { page: 1, limit: 10 }) => request(ENDPOINTS.LIST, payload),
  getActive: (payload = { view: "dropdown" }) => request(ENDPOINTS.GET_ACTIVE, payload),
  audit: (payload) => request(ENDPOINTS.AUDIT, payload),
  pending: (payload) => request(ENDPOINTS.PENDING, payload),
};
