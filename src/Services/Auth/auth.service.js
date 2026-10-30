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
// The Deviceinfo header every call sends (this browser), re-exported for
// the services that import it from here.
export { DEVICE_INFO } from "@/Services/api/deviceInfo";
import { DEVICE_INFO } from "@/Services/api/deviceInfo";

export function getBasicAuthorization() {
  if (!AUTH_BASIC_PASSWORD) {
    throw new Error("Basic authentication is not configured");
  }
  return `Basic ${window.btoa(`${AUTH_BASIC_USERNAME}:${AUTH_BASIC_PASSWORD}`)}`;
}

function parseSessionResponse(payload, { flat = false } = {}) {
  const rawData = payload?.data ?? unwrapApiResponse(payload, payload);
  // The login/refresh endpoints wrap the session object in a single-element
  // array (payload.data: [{ user_session_info, user_details, menu_array }]),
  // unlike other list endpoints that return the array directly as the payload.
  const data = Array.isArray(rawData) ? rawData[0] : rawData;
  // Login nests the tokens under user_session_info; the refresh sends them
  // flat on data[0].
  const sessionInfo = flat ? data : data?.user_session_info;
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
    // inactivity_timeout (minutes) sits beside user_details, not inside it.
    user: data?.user_details
      ? {
          ...data.user_details,
          ...(data?.scope ? { scope: data.scope } : {}),
          // The branch the user works at and their roles there (teller,
          // vault_custodian, loan_officer), or null; read at every sign-in.
          branch: data?.branch ?? null,
          // The institution's date and number formats (number_format: WESTERN,
          // INDIAN, EUROPEAN or SPACE; Utils/Lib/numberFormat.js).
          ...(data?.formats ? { formats: data.formats } : {}),
          ...(sessionInfo?.user_id ? { session_user_id: sessionInfo.user_id } : {}),
          ...(data?.inactivity_timeout != null ? { inactivity_timeout: data.inactivity_timeout } : {}),
        }
      : null,
    branding,
    // The institution's date and number formats (login and refresh).
    formats: data?.formats ?? null,
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
    // A refusal carries its HTTP status and, on a 429, the seconds to wait
    // (Retry-After): sign-in keeps its button off until then.
    const refused = (message) => Object.assign(apiError(message, payload), { status: response.status, retryAfter: Number(response.headers.get("Retry-After")) || null });
    const statusMessage = getStatusErrorMessage(response.status, payload);
    if (statusMessage) throw refused(statusMessage);
    if (!response.ok) throw refused(getApiErrorMessage(payload, "Request failed with status " + response.status));
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
// When the user's policy asks a sign-in code, the first reply has no session
// but { mfa_required, mfa_token, sent_to, expires_in, code_length }: that is
// returned as `{ mfa }`, and the same call is made again with
// `code` = { mfa_token, mfa_code }.
export async function loginRequest(institutionCode, username, password, code) {
  const payload = await withSealedRetry(async () =>
    request(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        Authorization: getBasicAuthorization(),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify({ ...trimPayload({ institution_code: institutionCode }), user_name: String(username ?? "").replace(/\s/g, ""), password: await seal(password), ...code }),
    }),
  );
  const first = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  if (first?.mfa_required) return { mfa: first, message: payload?.message };
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
  return parseSessionResponse(payload, { flat: true });
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

// Forgot password, before sign-in (Basic header, like the login). The reply
// is the same whether or not the user exists: { reset_token, expires_in,
// code_length }. Asking again sends a new code and ends the earlier one.
const basicHeaders = () => ({
  "Content-Type": "application/json",
  Deviceinfo: JSON.stringify(DEVICE_INFO),
  Authorization: getBasicAuthorization(),
  ...apiLanguageHeader(),
});
const userOf = (institutionCode, username) => ({ ...trimPayload({ institution_code: institutionCode }), user_name: String(username ?? "").replace(/\s/g, "") });

export async function forgotPasswordRequest(institutionCode, username) {
  const payload = await request(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { method: "POST", headers: basicHeaders(), body: JSON.stringify(userOf(institutionCode, username)) });
  return { ...(Array.isArray(payload?.data) ? payload.data[0] : payload?.data), message: payload?.message };
}

// Sets the new password (sealed) with the emailed code and the reset token.
export async function resetPasswordRequest(institutionCode, username, resetToken, code, newPassword) {
  return withSealedRetry(async () =>
    request(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: "POST",
      headers: basicHeaders(),
      body: JSON.stringify({ ...userOf(institutionCode, username), reset_token: resetToken, code, new_password: await seal(newPassword) }),
    }),
  );
}
