// Read de-duplication and a short cache, under every request helper (authFetch).
//
// - Reads (list, get, get_active, pending, audit, options, ...): identical calls
//   started within JOIN_MS share one request, e.g. the same dropdown mounted
//   by several fields, or React's development double-mount. Each caller reads
//   its own copy of the reply.
// - Dropdown and reference data (get_active, /master/ lists, options): a
//   successful reply is reused for CACHE_MS.
// - Any other call (add, edit, auth, delete, upload, ...) empties the cache, so
//   this tab never shows its own change stale. A /list is never cached: a
//   live push refetches it and must get fresh rows.

const JOIN_MS = 300;
const CACHE_MS = 60000;
const READ = /\/(list|get|get_active|pending|audit|options|summary|lookup|status|view)$/;
const CACHED = /\/(get_active|options)$|^\/master\/[a-z_]+\/list$/;

const inflight = new Map();
const cache = new Map();

const pathOf = (url) => {
  try {
    return new URL(url, window.location.origin).pathname.replace(/\/+$/, "");
  } catch {
    return String(url);
  }
};
const endsAt = (path, re) => re.test(path) || re.test(path.replace(/^\/[^/]+(?=\/)/, ""));

export async function cachedFetch(url, init, send) {
  const path = pathOf(url);
  // An upload (FormData) or any non-read call changes data.
  if (!endsAt(path, READ) || (init?.body != null && typeof init.body !== "string")) {
    const response = await send();
    if (response.ok) cache.clear();
    return response;
  }
  const h = init?.headers ?? {};
  const key = [url, init?.body ?? "", h.Authorization ?? "", h["x-api-lang"] ?? ""].join("\u0000");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.response.clone();
  const joined = inflight.get(key);
  if (joined && now - joined.at < JOIN_MS) return (await joined.promise).clone();

  const entry = { at: now, promise: send() };
  inflight.set(key, entry);
  try {
    const response = await entry.promise;
    // A 200 that says "fail" is not kept.
    if (response.ok && endsAt(path, CACHED)) {
      const payload = await response.clone().json().catch(() => null);
      if (payload && String(payload.status).toLowerCase() !== "fail") cache.set(key, { at: Date.now(), response: response.clone() });
    }
    return response.clone();
  } finally {
    if (inflight.get(key) === entry) inflight.delete(key);
  }
}

// Sign-out / institution switch: nothing read for the old session survives.
export function clearReadCache() {
  cache.clear();
  inflight.clear();
}
