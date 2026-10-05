import { STORAGE_KEYS } from "@/Services/api/storageKeys";

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

// Builds before 2026-10 kept the session in localStorage: wipe what is left.
try {
  [STORAGE_KEYS.accessToken, STORAGE_KEYS.refreshToken, STORAGE_KEYS.user].forEach((k) => window.localStorage.removeItem(k));
} catch {
  // Storage may be unavailable (private mode): nothing to clean.
}

// Tokens live in sessionStorage (gone when the tab closes), never in
// localStorage. An expired access token is kept while a refresh token
// exists: the next call's 401 renews the session (authFetch).
export function getAccessToken() {
  const token = window.sessionStorage.getItem(STORAGE_KEYS.accessToken);
  if (token && isTokenExpired(token) && !getRefreshToken()) {
    clearAuthSession();
    return null;
  }
  return token;
}
export function getRefreshToken() {
  return window.sessionStorage.getItem(STORAGE_KEYS.refreshToken);
}
export function readAuthUser() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function persistAuthSession(user, token, refreshToken) {
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.accessToken, token);
    if (refreshToken) window.sessionStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    window.sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } catch {
    // Storage failures should not prevent the in-memory session from updating.
  }
}
export function clearAuthSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    // Storage failures should not prevent logout.
  }
}
