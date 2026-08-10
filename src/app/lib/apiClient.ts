const BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT = 10000;

function handleUnauthorized() {
  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:unauthorized"));
}

export async function apiClient<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT);

  const token = window.localStorage.getItem("access_token");

  try {
    const response = await fetch(
      typeof input === "string" && !input.startsWith("http") ? `${BASE_URL}${input}` : input,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      },
    );

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Session expired. Please sign in again.");
    }

    if (response.status === 403) {
      throw new Error("Permission denied. You do not have access to this resource.");
    }

    if (response.status === 405) {
      throw new Error(`Method not allowed on this endpoint (405).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
      const detail =
        typeof payload === "object" && payload !== null && "detail" in payload
          ? String((payload as { detail?: unknown }).detail)
          : typeof payload === "object" && payload !== null && "message" in payload
            ? String((payload as { message?: unknown }).message)
            : typeof payload === "string" && payload.length > 0
              ? payload
              : null;
      throw new Error(detail ?? `Request failed with status ${response.status}`);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}
