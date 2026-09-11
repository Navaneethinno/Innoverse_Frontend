import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL } from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const REQUEST_TIMEOUT = 10000;

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

export const digitalProductApi = (entity) => {
  const base = `/digital_product/${entity}`;
  return {
    add: (payload) => request(`${base}/add`, payload),
    submit: (payload) => request(`${base}/submit`, payload),
    edit: (payload) => request(`${base}/edit`, payload),
    auth: (payload) => request(`${base}/auth`, payload),
    deauth: (payload) => request(`${base}/deauth`, payload),
    delete: (payload) => request(`${base}/delete`, payload),
    deleteAuth: (payload) => request(`${base}/delete_auth`, payload),
    list: (payload = { page: 1, limit: 10 }) => request(`${base}/list`, payload),
    getActive: (payload = {}) => request(`${base}/get_active`, payload),
    audit: (payload) => request(`${base}/audit`, payload),
    deactivate: (payload) => request(`${base}/deactivate`, payload),
    reactivate: (payload) => request(`${base}/reactivate`, payload),
  };
};
