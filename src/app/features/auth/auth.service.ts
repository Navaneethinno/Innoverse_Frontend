import type { AuthUser } from "./auth.types";

const BASE_URL = "http://127.0.0.1:8000";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as { message?: unknown }).message)
          : `Login failed (${response.status})`;
    throw new Error(detail);
  }

  // Unwrap envelope: { success, message, data: { access_token, token_type, user } }
  const data = (payload as { data?: unknown })?.data ?? payload;

  const token =
    (data as { access_token?: string })?.access_token;

  if (!token) throw new Error("No access token in response");

  const rawUser = (data as { user?: unknown })?.user as Record<string, unknown> | undefined;

  const user: AuthUser = {
    id: (rawUser?.id as string | number) ?? username,
    username: (rawUser?.username as string) ?? username,
    institution: rawUser?.institution
      ? (rawUser.institution as AuthUser["institution"])
      : null,
    profile: rawUser?.profile
      ? (rawUser.profile as AuthUser["profile"])
      : null,
  };

  return {
    access_token: token,
    token_type: (data as { token_type?: string })?.token_type ?? "bearer",
    user,
  };
}
