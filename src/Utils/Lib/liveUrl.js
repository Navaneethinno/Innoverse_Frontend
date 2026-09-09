import { API_BASE_URL } from "@/Utils/Constant";

// Every backend list endpoint has a matching live-push WebSocket channel at
// the same path with the trailing action swapped for "live" (see the "Live
// Updates (WebSocket) Integration Guide"). Most entities call their list
// endpoint with a trailing "/list" (e.g. /institution/profile/list), so the
// live channel is that path with "/live" in place of "/list". Master
// (Reference Data) endpoints are the one exception in this backend: the
// "/list" suffix was dropped from those paths (see Constant.jsx's
// MASTER block comment) so the REST call is just /master/module, /master/menu,
// etc. — confirmed live that those still get a channel at /master/module/live,
// /master/menu/live, i.e. "/live" appended rather than swapped in. Handling
// both shapes here means any list path — /list-suffixed or not — resolves to
// the right channel without every caller needing to know which convention
// its own endpoint follows.
// Derived straight from API_BASE_URL — the socket must point directly at the
// API host, it is not proxied through the Vercel-hosted frontend.
export function buildLiveUrl(listPath) {
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  const livePath = listPath.endsWith("/list")
    ? listPath.replace(/\/list$/, "/live")
    : `${listPath}/live`;
  return `${wsBase}${livePath}`;
}
