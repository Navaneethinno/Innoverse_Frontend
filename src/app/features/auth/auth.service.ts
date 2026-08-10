const BASE_URL = "http://127.0.0.1:8000";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: {
    id?: string;
    name?: string;
    username?: string;
    role?: string;
    permissions?: string[];
  };
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
        : `Login failed (${response.status})`;
    throw new Error(detail);
  }

  // Support flat, nested data.access_token, and data.data.access_token shapes
  const token =
    (payload as { data?: { data?: { access_token?: string } } })?.data?.data?.access_token ??
    (payload as { data?: { access_token?: string } })?.data?.access_token ??
    (payload as { access_token?: string })?.access_token;

  if (!token) throw new Error("No access token in response");

  const user =
    (payload as { data?: { user?: LoginResponse["user"] } })?.data?.user ??
    (payload as { user?: LoginResponse["user"] })?.user;

  return { access_token: token, token_type: payload?.token_type ?? "bearer", user };
}
