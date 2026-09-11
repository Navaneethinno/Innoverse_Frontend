import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
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
      headers: { "Content-Type": "application/json", Deviceinfo: JSON.stringify(DEVICE_INFO), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...apiLanguageHeader() },
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
    if (String(payload?.status).toLowerCase() === "fail") throw new Error(getApiErrorMessage(payload, "Request failed"));
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

export const configKycApi = (entity) => {
  const base = `/config/${entity}`;
  const constantKey = entity.toUpperCase();
  const configuredEndpoints = API_ENDPOINTS.CONFIG_KYC?.[constantKey] ?? {};
  const methods = ["add", "submit", "edit", "auth", "deauth", "delete", "deleteAuth", "list", "getActive", "audit"];
  return Object.fromEntries(methods.map((method) => [method, (payload = method === "getActive" ? { view: "dropdown" } : undefined) => {
    const path = configuredEndpoints[method === "getActive" ? "GET_ACTIVE" : method.toUpperCase()] ??
      `${base}/${method === "deleteAuth" ? "delete_auth" : method === "getActive" ? "get_active" : method}`;
    return request(path.startsWith("/") ? path : `${base}/${path}`, payload);
  }]));
};
