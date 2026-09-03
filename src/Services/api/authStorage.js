import { STORAGE_KEYS } from "@/Utils/Constant/storage";
export function getAccessToken() {
  return window.localStorage.getItem(STORAGE_KEYS.accessToken);
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
