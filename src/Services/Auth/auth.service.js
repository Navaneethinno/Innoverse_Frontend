import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { unwrapApiResponse } from "@/Services/api/response";
import { getAccessToken, getRefreshToken } from "@/Services/api/authStorage";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  AUTH_BASIC_PASSWORD,
  AUTH_BASIC_USERNAME,
} from "@/Utils/Constant";
const LOGIN_TIMEOUT = 10000;
// Exported so other authenticated services (e.g. Master reference-data calls)
// send the same Deviceinfo header shape the backend expects for this session.
export const DEVICE_INFO = {
  device_type: "POS",
  device_id: "98251030780003",
  app_version: "1.0.0",
  device_model: "PAX-A920",
  device_os: "Android",
  device_name: "Store-1-POS",
};

function getBasicAuthorization() {
  if (!AUTH_BASIC_PASSWORD) {
    throw new Error("Basic authentication is not configured");
  }
  return `Basic ${window.btoa(`${AUTH_BASIC_USERNAME}:${AUTH_BASIC_PASSWORD}`)}`;
}

function parseSessionResponse(payload) {
  const data = payload?.data ?? unwrapApiResponse(payload, payload);
  const sessionInfo = data?.user_session_info;
  const accessToken = sessionInfo?.jwt_token;
  if (!accessToken) throw new Error("No access token in response");
  return {
    access_token: accessToken,
    refresh_token: sessionInfo?.refresh_token ?? null,
    user: data?.user_details ?? null,
    // The authenticated user's permission/navigation dataset (menu_id,
    // parent_menu_id, module_id, menu_name, priority, status, actions[]).
    // Kept separate from Master reference data per Phase 24C spec.
    menu_array: Array.isArray(data?.menu_array) ? data.menu_array : [],
  };
}

function getResponsePayload(response) {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json().catch(() => null)
    : response.text().catch(() => null);
}

async function request(endpoint, init) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT);
  try {
    const response = await fetch(API_BASE_URL + endpoint, {
      ...init,
      signal: controller.signal,
    });
    const statusMessage = getStatusErrorMessage(response.status);
    if (statusMessage) throw new Error(statusMessage);
    const payload = await getResponsePayload(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Request failed with status " + response.status));
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

export async function loginRequest(username, password) {
  const payload = await request(API_ENDPOINTS.AUTH.LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Deviceinfo: JSON.stringify(DEVICE_INFO),
      Authorization: getBasicAuthorization(),
    },
    body: JSON.stringify({ user_name: username, password }),
  });
  return parseSessionResponse(payload);
}

export async function refreshTokenRequest() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");
  const payload = await request(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Deviceinfo: JSON.stringify(DEVICE_INFO),
      Authorization: "Bearer " + refreshToken,
    },
    body: JSON.stringify({}),
  });
  return parseSessionResponse(payload);
}

export async function changePassword(oldPassword, newPassword) {
  return request(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Deviceinfo: JSON.stringify(DEVICE_INFO),
      Authorization: "Bearer " + (getAccessToken() || ""),
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}
