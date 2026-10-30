import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/Services/Epurse/onboarding.api";

// What the guide remembers for the user: topics finished (per page), pages
// seen, modules visited, whether a practice step was done, and where an
// unfinished topic stopped. Kept on the server (user preference
// "guide.progress", so it follows the user to any computer), with a copy in
// this browser for a fast start and for when the server can't be reached.

const EMPTY = { done: {}, seen: {}, modules: {}, practiced: false, resume: null };
const PREF_KEY = "guide.progress";
const SAVE_DELAY = 1000;
// The server keeps up to 16 KB: the oldest pages seen are dropped first.
const MAX_SEEN = 300;

const preferenceApi = {
  get: () => request("/config/user/preference/get", { key: PREF_KEY }),
  save: (value) => request("/config/user/preference/save", { key: PREF_KEY, value }),
};

function readLocal(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the server copy is enough.
  }
}

// Both copies together: anything done, seen or visited on either side counts.
const merge = (a, b) => ({
  done: { ...a.done, ...b.done },
  seen: { ...a.seen, ...b.seen },
  modules: { ...a.modules, ...b.modules },
  practiced: Boolean(a.practiced || b.practiced),
  resume: b.resume ?? a.resume ?? null,
});

const trim = (value) => {
  const seen = Object.keys(value.seen ?? {});
  return seen.length <= MAX_SEEN ? value : { ...value, seen: Object.fromEntries(seen.slice(-MAX_SEEN).map((k) => [k, true])) };
};

export function useGuideProgress(userKey) {
  const key = `guide:v1:${userKey ?? "anon"}`;
  const [state, setState] = useState(() => readLocal(key) ?? { ...EMPTY });
  const timer = useRef(null);
  const loaded = useRef(false);

  // The server's copy wins; with none yet, this browser's copy moves up once.
  useEffect(() => {
    if (!userKey) return undefined;
    let cancelled = false;
    preferenceApi
      .get()
      .then((r) => {
        if (cancelled) return;
        const value = (Array.isArray(r?.data) ? r.data[0] : r?.data)?.value;
        const server = value && typeof value === "object" ? { ...EMPTY, ...value } : null;
        loaded.current = true;
        // What changed here before the server answered is merged in, then saved once.
        setState((local) => {
          const next = trim(server ? merge(server, local) : local);
          writeLocal(key, next);
          if (JSON.stringify(next) !== JSON.stringify(server)) void preferenceApi.save(next).catch(() => {});
          return next;
        });
      })
      .catch(() => {
        // Server unreachable: this browser's copy only; saves go on as changes come.
        loaded.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [key, userKey]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = useCallback(
    (fn) =>
      setState((previous) => {
        const next = trim({ ...previous, ...fn(previous) });
        writeLocal(key, next);
        // Quick changes make one call; nothing is sent before the server's copy is in.
        window.clearTimeout(timer.current);
        if (loaded.current) timer.current = window.setTimeout(() => void preferenceApi.save(next).catch(() => {}), SAVE_DELAY);
        return next;
      }),
    [key],
  );
  return [state, update];
}
