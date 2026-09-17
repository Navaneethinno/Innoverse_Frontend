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

// Every path here comes from API_ENDPOINTS.DIGITAL_PRODUCT (Constant.jsx) —
// no path is ever built from a template string at request time. `entity` is
// one of the keys digitalProductRoutes.jsx passes (product, product_map,
// security_config, kyc_config, kyc_level, channel_config,
// channel_transaction, eligibility_config, residency); it maps to the
// matching UPPER_SNAKE_CASE key in that constant.
const METHOD_TO_KEY = {
  add: "ADD", submit: "SUBMIT", edit: "EDIT", get: "GET", auth: "AUTH", deauth: "DEAUTH", delete: "DELETE", deleteAuth: "DELETE_AUTH",
  list: "LIST", getActive: "GET_ACTIVE", audit: "AUDIT", pending: "PENDING", deactivate: "DEACTIVATE", reactivate: "REACTIVATE",
};
export const digitalProductApi = (entity) => {
  const endpoints = API_ENDPOINTS.DIGITAL_PRODUCT[entity.toUpperCase()];
  if (!endpoints) throw new Error(`No API_ENDPOINTS.DIGITAL_PRODUCT entry for entity "${entity}"`);
  return Object.fromEntries(
    Object.entries(METHOD_TO_KEY).map(([method, key]) => [
      method,
      (p = method === "list" ? { page: 1, limit: 10 } : method === "getActive" ? { view: "dropdown" } : undefined) => {
        const path = endpoints[key];
        if (!path) throw new Error(`No API_ENDPOINTS.DIGITAL_PRODUCT.${entity.toUpperCase()}.${key} defined`);
        return request(path, p);
      },
    ]),
  );
};
