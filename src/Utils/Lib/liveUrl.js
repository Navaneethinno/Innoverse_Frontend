import { API_BASE_URL } from "@/Utils/Constant";

// Every backend list endpoint (/<group>/<entity>/list) has a matching
// live-push WebSocket channel at the same path with the trailing action
// swapped for "live" (see the "Live Updates (WebSocket) Integration Guide").
// Derived straight from API_BASE_URL — the socket must point directly at the
// API host, it is not proxied through the Vercel-hosted frontend.
export function buildLiveUrl(listPath) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  const livePath = listPath.replace(/\/list$/, "/live");
  return `${wsBase}${livePath}`;
}
