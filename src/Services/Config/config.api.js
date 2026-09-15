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

// Every path here comes from API_ENDPOINTS.CONFIG_KYC or .CONFIG_ACCT
// (Constant.jsx) — no path is ever built from a template string at request
// time. `entity` maps to the matching UPPER_SNAKE_CASE key in whichever of
// those two groups defines it: kyc_group, kyc_group_level,
// kyc_group_level_data, kyc_group_level_process, kyc_group_level_document
// live under CONFIG_KYC (10-route lifecycle, no deactivate/reactivate/
// pending); acct_product and its 16 sub-configs live under CONFIG_ACCT
// (full 13-route lifecycle). The method set below is a superset of both —
// only methods whose KEY actually exists on the resolved endpoints object
// are exposed, so calling e.g. .pending() on a CONFIG_KYC entity throws
// instead of silently hitting a guessed URL.
const METHOD_TO_KEY = {
  add: "ADD", submit: "SUBMIT", edit: "EDIT", auth: "AUTH", deauth: "DEAUTH", delete: "DELETE", deleteAuth: "DELETE_AUTH",
  list: "LIST", getActive: "GET_ACTIVE", audit: "AUDIT", pending: "PENDING", deactivate: "DEACTIVATE", reactivate: "REACTIVATE",
};
export const configKycApi = (entity) => {
  const constantKey = entity.toUpperCase();
  const endpoints = API_ENDPOINTS.CONFIG_KYC?.[constantKey] ?? API_ENDPOINTS.CONFIG_ACCT?.[constantKey];
  if (!endpoints) throw new Error(`No API_ENDPOINTS.CONFIG_KYC/CONFIG_ACCT entry for entity "${entity}"`);
  return Object.fromEntries(
    Object.entries(METHOD_TO_KEY)
      .filter(([, key]) => endpoints[key])
      .map(([method, key]) => [
        method,
        (payload = method === "getActive" ? { view: "dropdown" } : undefined) => request(endpoints[key], payload),
      ]),
  );
};
