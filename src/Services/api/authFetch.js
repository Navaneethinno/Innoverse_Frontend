import store from "@/Redux/Store";
import { setSession } from "@/Redux/AuthToken";
import { refreshTokenRequest } from "@/Services/Auth/auth.service";
import { getAccessToken, getRefreshToken, persistAuthSession, readAuthUser } from "@/Services/api/authStorage";

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
    const user = response.user ? { ...stored, ...response.user, scope: response.user.scope ?? stored?.scope } : stored;
    persistAuthSession(user, response.access_token, response.refresh_token);
    store.dispatch(setSession({ token: response.access_token, refreshToken: response.refresh_token, user }));
    return true;
  } catch {
    return false;
  }
}

export function refreshSession() {
  refreshing ??= renew().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const bearer = (init) => String(init?.headers?.Authorization ?? "").startsWith("Bearer ");

export async function authFetch(url, init = {}) {
  const response = await fetch(url, init);
  if (response.status !== 401 || !bearer(init) || !getRefreshToken()) return response;
  if (!(await refreshSession())) return response;
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${getAccessToken()}` } });
}
