import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi } from "@/Services/Dashboard/dashboard.api";
import { notifications } from "@/Utils/Lib/notifications";
import { WIDGET_REGISTRY, clampSpan, defaultLayout } from "./widgetRegistry";

// Per-user widget layout, saved on the server (/config/user/dashboard_layout)
// as [{ id, span }]: order and width only, never pixel positions. A copy is
// kept in localStorage so the page draws the user's layout before the
// server answers. Changes are saved a moment after the last one.
const STORAGE_PREFIX = "innoverse:dashboard-layout:";
const SAVE_DELAY = 800;

// A saved layout is reconciled with the current registry: unknown widgets
// are dropped, spans clamped, and widgets added since are appended.
function reconcile(saved) {
  if (!Array.isArray(saved)) return defaultLayout();
  const seen = new Set();
  const kept = saved
    .filter((item) => item && WIDGET_REGISTRY[item.id] && !seen.has(item.id) && seen.add(item.id))
    .map((item) => ({ id: item.id, span: clampSpan(item.id, item.span) }));
  const added = defaultLayout().filter((item) => !seen.has(item.id));
  return [...kept, ...added];
}

const readCache = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? reconcile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};
const writeCache = (key, layout) => {
  try {
    if (layout) window.localStorage.setItem(key, JSON.stringify(layout));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the server copy still holds.
  }
};

// `serverLayout`: the layout the summary returned (undefined until it has
// answered, null when the user never customised).
export function useDashboardLayout(user, serverLayout) {
  const storageKey = STORAGE_PREFIX + (user?.id ?? user?.username ?? "anonymous");
  const [layout, setLayoutState] = useState(() => readCache(storageKey) ?? defaultLayout());
  const timer = useRef(null);

  // The server's copy wins once it arrives.
  useEffect(() => {
    if (serverLayout === undefined) return;
    const next = serverLayout?.layout ? reconcile(serverLayout.layout) : defaultLayout();
    setLayoutState(next);
    writeCache(storageKey, serverLayout?.layout ? next : null);
  }, [serverLayout, storageKey]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = useCallback(
    (value) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!user?.id) return;
        dashboardApi.saveLayout(user, value).catch((error) => notifications.error(error.message));
      }, SAVE_DELAY);
    },
    [user],
  );

  const setLayout = useCallback(
    (next) =>
      setLayoutState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        writeCache(storageKey, value);
        save(value);
        return value;
      }),
    [storageKey, save],
  );

  const resetLayout = useCallback(() => {
    writeCache(storageKey, null);
    setLayoutState(defaultLayout());
    save(null);
  }, [storageKey, save]);

  return { layout, setLayout, resetLayout };
}
