import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL } from "@/Utils/Constant";

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
  list: (payload = { page: 1, limit: 10, search: "", status: 0 }) => request("/user/list", payload),
  audit: (payload) => request("/user/audit_list", payload),
  add: (payload) => request("/user/add", payload),
  edit: (payload) => request("/user/edit", payload),
  auth: (payload) => request("/user/auth", payload),
  deauth: (payload) => request("/user/deauth", payload),
  delete: (payload) => request("/user/delete", payload),
  deleteAuth: (payload) => request("/user/delete_auth", payload),
  getActiveInstitutions: () => request("/institution/profile/get_active", {}),
  getAllProfiles: () => request("/profile/getall", {}),
};
