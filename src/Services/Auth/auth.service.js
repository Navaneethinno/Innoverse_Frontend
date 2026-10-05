import { authFetch } from "@/Services/api/authFetch";
import { seal, withSealedRetry } from "@/Services/api/credentialSeal";
import { normalizeBranding } from "@/Utils/Lib/branding";
import { trimPayload } from "@/Utils/Lib/trimPayload";
import { apiError, getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { unwrapApiResponse } from "@/Services/api/response";
import { getAccessToken, getRefreshToken } from "@/Services/api/authStorage";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";
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

export function getBasicAuthorization() {
  if (!AUTH_BASIC_PASSWORD) {
    throw new Error("Basic authentication is not configured");
  }
  return `Basic ${window.btoa(`${AUTH_BASIC_USERNAME}:${AUTH_BASIC_PASSWORD}`)}`;
}

function parseSessionResponse(payload) {
  const rawData = payload?.data ?? unwrapApiResponse(payload, payload);
  // The login/refresh endpoints wrap the session object in a single-element
  // array (payload.data: [{ user_session_info, user_details, menu_array }]),
  // unlike other list endpoints that return the array directly as the payload.
  const data = Array.isArray(rawData) ? rawData[0] : rawData;
  const sessionInfo = data?.user_session_info;
  const accessToken = sessionInfo?.jwt_token;
  if (!accessToken) throw new Error("No access token in response");
  // The institution's branding (colours, name, logo, favicon, login
  // background): see Utils/Lib/branding.js for the fields and fallbacks.
  // user_details is a fallback spot in case a response nests it there.
  const branding = normalizeBranding(data?.branding ?? data?.user_details);
  return {
    access_token: accessToken,
    refresh_token: sessionInfo?.refresh_token ?? null,
    // `scope` (institution scope handoff) rides on the stored user: tier,
    // type_code, institution_id, can_choose_institution.
    // session_user_id: the signed-in user's id (user_session_info.user_id),
    // to keep own-account actions off their own row.
    user: data?.user_details ? { ...data.user_details, ...(data?.scope ? { scope: data.scope } : {}), ...(sessionInfo?.user_id ? { session_user_id: sessionInfo.user_id } : {}) } : null,
    branding,
    // The authenticated user's permission/navigation dataset (menu_id,
    // parent_menu_id, module_id, menu_name, priority, status, actions[]).
    // Kept separate from Master reference data per Phase 24C spec.
    menu_array: Array.isArray(data?.menu_array) ? data.menu_array : [],
    // The backend's own description of the outcome (e.g. "Login
    // Successful") — carried through so the UI can show it in a toast
    // instead of a hardcoded string; parseSessionResponse otherwise
    // discards everything except the session/menu fields it needs.
    message: payload?.message,
  };
}

function getResponsePayload(response) {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json().catch(() => null)
    : response.text().catch(() => null);
}

async function request(endpoint, init, send = fetch) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT);
  try {
    const response = await send(API_BASE_URL + endpoint, {
      ...init,
      signal: controller.signal,
    });
    const payload = await getResponsePayload(response);
    const statusMessage = getStatusErrorMessage(response.status, payload);
    if (statusMessage) throw apiError(statusMessage, payload);
    if (!response.ok) {
      throw apiError(getApiErrorMessage(payload, "Request failed with status " + response.status), payload);
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

// Usernames are unique only within an institution, so the login names it
// by its code (case does not matter).
// The password is sealed (credentialSeal.js), afresh on every try.
export async function loginRequest(institutionCode, username, password) {
  const payload = await withSealedRetry(async () =>
    request(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        Authorization: getBasicAuthorization(),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify({ ...trimPayload({ institution_code: institutionCode }), user_name: String(username ?? "").replace(/\s/g, ""), password: await seal(password) }),
    }),
  );
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
      ...apiLanguageHeader(),
    },
    body: JSON.stringify({}),
  });
  return parseSessionResponse(payload);
}

// Ends every session of the user, on every browser and device: every token
// issued until now is refused from here on.
export async function logoutRequest() {
  const token = getAccessToken();
  if (!token) return null;
  return request(API_ENDPOINTS.AUTH.LOGOUT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Deviceinfo: JSON.stringify(DEVICE_INFO),
      Authorization: "Bearer " + token,
      ...apiLanguageHeader(),
    },
    body: JSON.stringify({}),
  });
}

export async function changePassword(oldPassword, newPassword) {
  return withSealedRetry(async () =>
    request(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Deviceinfo: JSON.stringify(DEVICE_INFO),
          Authorization: "Bearer " + (getAccessToken() || ""),
          ...apiLanguageHeader(),
        },
        body: JSON.stringify({ old_password: await seal(oldPassword), new_password: await seal(newPassword) }),
      },
      authFetch,
    ),
  );
}
