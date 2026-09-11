import { STORAGE_KEYS } from "@/Utils/Constant/storage";

// A JWT's payload (the middle base64url segment) carries `exp` as a Unix
// timestamp in seconds. Decoded locally, without a library, purely to check
// expiry client-side — the backend remains the real authority and still
// rejects an invalid token on any actual request; this only stops
// ProtectRoute from waving a visibly-expired leftover token straight into
// the app shell before that first request ever fires.
function isTokenExpired(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!decoded?.exp) return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getAccessToken() {
  const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token && isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}
export function getRefreshToken() {
  return window.localStorage.getItem(STORAGE_KEYS.refreshToken);
}
export function readAuthUser() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function persistAuthSession(user, token, refreshToken) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, token);
    if (refreshToken) window.localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } catch {
    // Storage failures should not prevent the in-memory session from updating.
  }
}
export function clearAuthSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
    window.localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    // Storage failures should not prevent logout.
  }
}
