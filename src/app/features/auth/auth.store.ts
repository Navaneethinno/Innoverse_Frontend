import { create } from "zustand";
import type { AuthState, AuthUser } from "./auth.types";

const STORAGE_KEY = "innoverse.auth";

const readInitialState = (): Pick<AuthState, "user" | "token" | "isAuthenticated"> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, isAuthenticated: false };
    const parsed = JSON.parse(raw) as { user?: AuthUser; token?: string };
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      isAuthenticated: Boolean(parsed.token),
    };
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
};

const persist = (state: Pick<AuthState, "user" | "token">) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors in restrictive environments.
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...readInitialState(),
  login: async ({ email }) => {
    const user: AuthUser = {
      id: "user-admin",
      name: "Admin",
      email,
      role: "Platform Admin",
    };
    const token = "mock-token";
    persist({ user, token });
    set({ user, token, isAuthenticated: true });
    return true;
  },
  logout: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors in restrictive environments.
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
