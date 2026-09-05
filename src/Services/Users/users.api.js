import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";

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

export const usersApi = {
  list: (payload = { page: 1, limit: 10, search: "", status: 0 }) =>
    request(API_ENDPOINTS.USERS.LIST, payload),
  audit: (payload) => request(API_ENDPOINTS.USERS.AUDIT_LIST, payload),
  add: (payload) => request(API_ENDPOINTS.USERS.ADD, payload),
  edit: (payload) => request(API_ENDPOINTS.USERS.EDIT, payload),
  auth: (payload) => request(API_ENDPOINTS.USERS.AUTH, payload),
  deauth: (payload) => request(API_ENDPOINTS.USERS.DEAUTH, payload),
  delete: (payload) => request(API_ENDPOINTS.USERS.DELETE, payload),
  deleteAuth: (payload) => request(API_ENDPOINTS.USERS.DELETE_AUTH, payload),
  getActiveInstitutions: (payload = { view: "dropdown" }) =>
    request(API_ENDPOINTS.INSTITUTIONS.GET_ACTIVE, payload),
  getAllProfiles: () => request(API_ENDPOINTS.USERS.ALL_PROFILES, {}),
};
