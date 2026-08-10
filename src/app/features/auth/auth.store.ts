import { create } from "zustand";
import type { AuthState, AuthUser } from "./auth.types";
import { loginRequest } from "./auth.service";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

const readStorage = (): Pick<AuthState, "user" | "token" | "isAuthenticated"> => {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    return { token, user, isAuthenticated: Boolean(token) };
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
};

const persist = (user: AuthUser | null, token: string | null) => {
  try {
    if (token && user) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  } catch { /* ignore */ }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...readStorage(),

  login: async ({ username, password }) => {
    try {
      const { access_token, user } = await loginRequest(username, password);
      persist(user, access_token);
      set({ user, token: access_token, isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    persist(null, null);
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

// Auto-logout on 401 from apiClient
window.addEventListener("auth:unauthorized", () => {
  useAuthStore.getState().logout();
  window.location.href = "/login";
});
