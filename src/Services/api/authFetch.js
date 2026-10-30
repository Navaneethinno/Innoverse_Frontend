import { notifications } from "@/Utils/Lib/notifications";
import store from "@/Redux/Store";
import { setSession } from "@/Redux/AuthToken";
import { refreshTokenRequest } from "@/Services/Auth/auth.service";
import { cachedFetch } from "@/Services/api/readCache";
import {
  getAccessToken,
  getRefreshToken,
  persistAuthSession,
  readAuthUser,
} from "@/Services/api/authStorage";
import { withInstitutionFilter } from "@/Utils/Lib/institutionFilter";

// Silent session renewal. Every request helper calls authFetch instead of
// fetch: when a signed-in call comes back 401 and a refresh token exists, it
// renews the session (/config/user/refresh_token) and repeats the call once
// with the new access token. Only when the refresh fails, or the repeat is
// 401 again, does the helper's own 401 handling sign the user out.
//
// Many calls can fail at once: they all wait on one refresh, because two
// refreshes with the same (single-use) refresh token would sign the user out.

let refreshing = null;

async function renew() {
  try {
    const response = await refreshTokenRequest();
    // Refresh may not re-send scope or the session user id: keep the login's.
    const stored = readAuthUser();
    const base = response.user
      ? { ...stored, ...response.user, scope: response.user.scope ?? stored?.scope, branch: response.user.branch ?? stored?.branch ?? null }
      : stored;
    // The refresh carries the institution's current formats: replace them.
    const user = base && response.formats ? { ...base, formats: response.formats } : base;
    persistAuthSession(user, response.access_token, response.refresh_token);
    store.dispatch(
      setSession({ token: response.access_token, refreshToken: response.refresh_token, user }),
    );
    return true;
  } catch (error) {
    // Replaced by a sign-in elsewhere (one session per user): say so, not
    // just "session expired".
    if (error?.code === "auth.signed_in_elsewhere") notifications.error(error.message);
    return false;
  }
}

function refreshSession() {
  refreshing ??= renew().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const bearer = (init) => String(init?.headers?.Authorization ?? "").startsWith("Bearer ");

// An expired password (the password policy's expiry): the server refuses
// every menu call until it is changed. Marked on the stored user like a
// forced change at sign-in, so the app opens Change password (ProtectRoute).
async function mustChangePassword(response) {
  if (response.status !== 403) return;
  const body = await response
    .clone()
    .json()
    .catch(() => null);
  if (body?.error_code !== "auth.password_change_required") return;
  const user = readAuthUser();
  if (!user || Number(user.is_force_pwd) === 1) return;
  const next = { ...user, is_force_pwd: 1 };
  persistAuthSession(next, getAccessToken(), getRefreshToken());
  store.dispatch(
    setSession({ token: getAccessToken(), refreshToken: getRefreshToken(), user: next }),
  );
}

// Refused from where the user is (the institution's Access by Location
// policy): the admin portal signs out and the sign-in page shows why. Only
// this error_code means it; other 403s are left to the caller.
export const SIGNIN_NOTICE_KEY = "innoverse-admin:signin-notice";
let signingOut = false;
async function locationBlocked(response, init) {
  if (response.status !== 403 || !bearer(init) || signingOut) return;
  const body = await response
    .clone()
    .json()
    .catch(() => null);
  if (body?.error_code !== "access.location_blocked") return;
  signingOut = true;
  try {
    window.sessionStorage.setItem(SIGNIN_NOTICE_KEY, body.message ?? "");
  } catch {
    // Storage blocked: the sign-in page shows its usual text.
  }
  window.dispatchEvent(new Event("auth:unauthorized"));
  window.setTimeout(() => {
    signingOut = false;
  }, 3000);
}

export async function authFetch(url, given = {}) {
  // A list request carries the top bar's Institution filter.
  const init = withInstitutionFilter(url, given);
  const response = await cachedFetch(url, init, () => fetch(url, init));
  await mustChangePassword(response);
  await locationBlocked(response, init);
  if (response.status !== 401 || !bearer(init) || !getRefreshToken()) return response;
  if (!(await refreshSession())) return response;
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${getAccessToken()}` },
  });
}
