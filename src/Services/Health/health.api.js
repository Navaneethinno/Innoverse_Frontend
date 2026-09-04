import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { API_BASE_URL, API_ENDPOINTS, NON_LOGIN_APIS_ENABLED } from "@/Utils/Constant";
const HEALTH_ENDPOINT = API_BASE_URL + API_ENDPOINTS.HEALTH;
const HEALTH_TIMEOUT = 10000;
function isSuccessfulHealthResponse(value) {
  if (!value || typeof value !== "object") return false;
  const response = value;
  const data = response.data;
  return (
    response.api === "/health" &&
    response.code === 1 &&
    response.message === "Config processor healthcheck passed" &&
    response.status === "Success" &&
    !!data &&
    data.status === "SUCCESS" &&
    data.service === "ConfigProcessor" &&
    data.message === "Config processor healthcheck passed"
  );
}
export async function getHealth() {
  if (!NON_LOGIN_APIS_ENABLED) throw new Error("Health API not enabled");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
  const token = getAccessToken();
  try {
    const response = await fetch(HEALTH_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      signal: controller.signal,
    });
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusMessage = getStatusErrorMessage(response.status);
    if (statusMessage) throw new Error(statusMessage);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Request failed with status " + response.status));
    }
    if (!isSuccessfulHealthResponse(payload)) {
      throw new Error("Unexpected backend health response");
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}
